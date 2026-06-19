import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.85.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      return new Response(
        JSON.stringify({ error: "SMS service not configured. Please contact admin." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle both string and pre-parsed body
    let body: any;
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const rawText = await req.text();
      try {
        body = JSON.parse(rawText);
      } catch {
        body = {};
      }
    } else {
      body = {};
    }

    const { phone_number, otp_code, user_id } = body;
    const action = otp_code ? "verify" : "send";

    if (action === "send") {
      if (!phone_number) {
        return new Response(
          JSON.stringify({ error: "Phone number is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cleanPhone = phone_number.replace(/\D/g, "");
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limiting
      const { data: recentOtp } = await supabase
        .from("phone_verification_otps")
        .select("created_at")
        .eq("phone_number", phone_number)
        .gt("created_at", new Date(Date.now() - 60000).toISOString())
        .single();

      if (recentOtp) {
        return new Response(
          JSON.stringify({ error: "Please wait 1 minute before requesting another code" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await supabase.from("phone_verification_otps").delete().eq("phone_number", phone_number);

      const { error: insertError } = await supabase.from("phone_verification_otps").insert({
        phone_number,
        otp_code: otpCode,
        expires_at: expiresAt.toISOString(),
        user_id: user_id || null,
      });

      if (insertError) {
        console.error("Failed to store OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate verification code" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const formattedPhone = phone_number.startsWith("+") ? phone_number : `+${cleanPhone}`;
      
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            "Authorization": "Basic " + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: formattedPhone,
            Body: `Your verification code is: ${otpCode}. It expires in 10 minutes.`,
          }),
        }
      );

      if (!twilioResponse.ok) {
        const twilioError = await twilioResponse.text();
        console.error("Twilio error:", twilioError);
        await supabase.from("phone_verification_otps").delete().eq("phone_number", phone_number);
        return new Response(
          JSON.stringify({ error: "Failed to send SMS. Please check your phone number." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      if (!phone_number || !otp_code) {
        return new Response(
          JSON.stringify({ error: "Phone number and OTP code are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: otpRecord, error: findError } = await supabase
        .from("phone_verification_otps")
        .select("*")
        .eq("phone_number", phone_number)
        .eq("verified", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (findError || !otpRecord) {
        return new Response(
          JSON.stringify({ error: "No valid verification code found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (otpRecord.attempts >= 5) {
        await supabase.from("phone_verification_otps").delete().eq("id", otpRecord.id);
        return new Response(
          JSON.stringify({ error: "Too many attempts. Please request a new code." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (otpRecord.otp_code !== otp_code) {
        await supabase.from("phone_verification_otps").update({ attempts: otpRecord.attempts + 1 }).eq("id", otpRecord.id);
        return new Response(
          JSON.stringify({ error: "Invalid verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("phone_verification_otps").update({ verified: true }).eq("id", otpRecord.id);

      // Derive trusted user id from JWT — never trust body's user_id
      const authHeader = req.headers.get("Authorization");
      let trustedUserId: string | null = null;
      if (authHeader?.startsWith("Bearer ")) {
        const jwt = authHeader.replace("Bearer ", "");
        const { data: authData } = await supabase.auth.getUser(jwt);
        trustedUserId = authData?.user?.id ?? null;
      }

      if (trustedUserId) {
        await supabase.from("users").update({ phone_verified: true, phone: phone_number }).eq("id", trustedUserId);
      }

      await supabase.from("phone_verification_otps").delete().eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ success: true, message: "Phone verified successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error: unknown) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
