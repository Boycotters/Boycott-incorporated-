import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.85.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  phone_number: string;
  user_id?: string;
}

interface VerifyOTPRequest {
  phone_number: string;
  otp_code: string;
  user_id?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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
      console.error("Twilio credentials not configured");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Determine action from body or URL param
    const url = new URL(req.url);
    const action = body.otp_code ? "verify" : (url.searchParams.get("action") || "send");

    if (action === "send") {
      const { phone_number, user_id } = body as SendOTPRequest;

      if (!phone_number) {
        return new Response(
          JSON.stringify({ error: "Phone number is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate phone number format (basic validation)
      const cleanPhone = phone_number.replace(/\D/g, "");
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        return new Response(
          JSON.stringify({ error: "Invalid phone number format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Rate limiting: check if there's a recent OTP for this phone
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

      // Generate 6-digit OTP
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Delete any existing OTPs for this phone
      await supabase
        .from("phone_verification_otps")
        .delete()
        .eq("phone_number", phone_number);

      // Store the OTP
      const { error: insertError } = await supabase
        .from("phone_verification_otps")
        .insert({
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

      // Send SMS via Twilio
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
        
        // Clean up the stored OTP since SMS failed
        await supabase
          .from("phone_verification_otps")
          .delete()
          .eq("phone_number", phone_number);

        return new Response(
          JSON.stringify({ error: "Failed to send SMS. Please check your phone number." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "Verification code sent" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      const { phone_number, otp_code, user_id } = body as VerifyOTPRequest;

      if (!phone_number || !otp_code) {
        return new Response(
          JSON.stringify({ error: "Phone number and OTP code are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find the OTP
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

      // Check attempts (max 5)
      if (otpRecord.attempts >= 5) {
        await supabase
          .from("phone_verification_otps")
          .delete()
          .eq("id", otpRecord.id);

        return new Response(
          JSON.stringify({ error: "Too many attempts. Please request a new code." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the code
      if (otpRecord.otp_code !== otp_code) {
        await supabase
          .from("phone_verification_otps")
          .update({ attempts: otpRecord.attempts + 1 })
          .eq("id", otpRecord.id);

        return new Response(
          JSON.stringify({ error: "Invalid verification code" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Mark as verified
      await supabase
        .from("phone_verification_otps")
        .update({ verified: true })
        .eq("id", otpRecord.id);

      // If user_id provided, update user's phone_verified status
      if (user_id) {
        await supabase
          .from("users")
          .update({ phone_verified: true, phone: phone_number })
          .eq("id", user_id);
      }

      // Clean up the OTP
      await supabase
        .from("phone_verification_otps")
        .delete()
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({ success: true, message: "Phone verified successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action. Use ?action=send or ?action=verify" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
