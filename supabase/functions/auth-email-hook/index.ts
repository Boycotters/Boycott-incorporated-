// Supabase Auth Email Hook -> sends auth emails (signup confirmation,
// password recovery, magic link, email change, invite) via Gmail connector.
//
// To activate: in Supabase Dashboard -> Authentication -> Hooks -> "Send Email Hook",
// set this function's URL and the SEND_EMAIL_HOOK_SECRET secret (or leave webhook
// signature off in dev). Supabase will POST every auth email here instead of
// using its own SMTP, and this hook relays through the connected Gmail inbox.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-webhook-signature",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM = "Boycott Incorporated";

function b64url(input: string) {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e2e8f0">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:8px;background:#14b8a6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">⚡</div>
      <strong style="font-size:16px">Boycott Incorporated</strong>
    </div>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#334155">${body}</div>
  </div></body></html>`;
}

function template(action: string, data: Record<string, any>) {
  const link =
    data.confirmation_url ||
    data.action_link ||
    (data.site_url && data.token_hash
      ? `${data.site_url}/auth/v1/verify?token=${data.token_hash}&type=${action}&redirect_to=${encodeURIComponent(data.redirect_to || data.site_url)}`
      : "");
  const btn = (label: string) =>
    `<a href="${link}" style="display:inline-block;background:#14b8a6;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600;margin-top:12px">${label}</a>`;

  switch (action) {
    case "signup":
      return {
        subject: "Confirm your Boycott Incorporated email",
        html: shell("Welcome — confirm your email", `Tap the button below to confirm your account and start earning points.${btn("Confirm email")}`),
      };
    case "recovery":
      return {
        subject: "Reset your Boycott Incorporated password",
        html: shell("Reset your password", `Forgot your password? No worries — tap below to set a new one. This link expires soon.${btn("Reset password")}`),
      };
    case "magiclink":
      return {
        subject: "Your Boycott Incorporated magic sign-in link",
        html: shell("Sign in with one tap", `Use this magic link to sign in to your account.${btn("Sign in")}`),
      };
    case "invite":
      return {
        subject: "You've been invited to Boycott Incorporated",
        html: shell("You're invited", `You've been invited to join Boycott Incorporated. Tap below to accept.${btn("Accept invite")}`),
      };
    case "email_change":
    case "email_change_current":
    case "email_change_new":
      return {
        subject: "Confirm your new email address",
        html: shell("Confirm email change", `Tap below to confirm your new email address.${btn("Confirm change")}`),
      };
    case "reauthentication":
      return {
        subject: `Your verification code: ${data.token || ""}`,
        html: shell("Verification code", `Your code is <strong style="font-size:18px">${data.token || ""}</strong>. It expires shortly.`),
      };
    default:
      return {
        subject: "Boycott Incorporated notification",
        html: shell("Notification", link ? `Action link:<br/>${btn("Open")}` : "You have a new auth notification."),
      };
  }
}

async function sendGmail(to: string, subject: string, htmlBody: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const GMAIL_KEY = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  if (!GMAIL_KEY) throw new Error("GOOGLE_MAIL_API_KEY missing");

  const raw = b64url(
    [
      `From: ${FROM}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      'Content-Type: text/html; charset="UTF-8"',
      "",
      htmlBody,
    ].join("\r\n")
  );

  const r = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": GMAIL_KEY,
    },
    body: JSON.stringify({ raw }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Gmail ${r.status}: ${text}`);
  return JSON.parse(text);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payload = await req.json();
    // Supabase Auth hook shape: { user: {...}, email_data: { token, token_hash, redirect_to, email_action_type, site_url } }
    const user = payload.user || payload.User || {};
    const ed = payload.email_data || payload.EmailData || {};
    const to = user.email || payload.email;
    const action = ed.email_action_type || payload.email_action_type || "signup";
    const tpl = template(action, {
      ...ed,
      token: ed.token,
      token_hash: ed.token_hash,
      redirect_to: ed.redirect_to,
      site_url: ed.site_url,
    });

    if (!to) {
      return new Response(JSON.stringify({ error: "no recipient" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendGmail(to, tpl.subject, tpl.html);
    return new Response(JSON.stringify({ success: true, action, to, gmail: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auth-email-hook error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
