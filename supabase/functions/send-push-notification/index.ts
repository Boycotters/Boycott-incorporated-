import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  user_id?: string;
  user_ids?: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    if (!fcmServerKey) {
      throw new Error("FCM_SERVER_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const payload: PushPayload = await req.json();

    const { user_id, user_ids, title, body, data } = payload;

    // Get target user IDs
    const targetUserIds = user_ids || (user_id ? [user_id] : []);
    
    if (targetUserIds.length === 0) {
      throw new Error("No user_id or user_ids provided");
    }

    // Fetch push tokens for target users
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("token, platform, user_id")
      .in("user_id", targetUserIds);

    if (tokensError) {
      throw tokensError;
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No push tokens found for users", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notifications via FCM
    const results = await Promise.allSettled(
      tokens.map(async (tokenRecord) => {
        const fcmPayload = {
          to: tokenRecord.token,
          notification: {
            title,
            body,
            sound: "default",
          },
          data: {
            ...data,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
        };

        const response = await fetch("https://fcm.googleapis.com/fcm/send", {
          method: "POST",
          headers: {
            "Authorization": `key=${fcmServerKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fcmPayload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`FCM error: ${errorText}`);
        }

        return await response.json();
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    // Log notification in queue
    await supabase.from("notification_queue").insert(
      targetUserIds.map((uid) => ({
        user_id: uid,
        title,
        body,
        data,
        status: "sent",
        sent_at: new Date().toISOString(),
      }))
    );

    return new Response(
      JSON.stringify({
        success: true,
        sent: successful,
        failed,
        total: tokens.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
