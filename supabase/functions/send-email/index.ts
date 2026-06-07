// Universal email sender using Resend (via Lovable connector gateway)
// Templates: welcome | withdrawal_status | transfer_created | transfer_reviewed | admin_alert
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";
const FROM = "Boycott Incorporated";

type Payload = {
  template:
    | "welcome"
    | "withdrawal_status"
    | "transfer_created"
    | "transfer_reviewed"
    | "admin_alert";
  to?: string; // optional override; otherwise resolved from data
  data: Record<string, any>;
};

function html(title: string, body: string) {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f8fafc;padding:24px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #e2e8f0">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:8px;background:#14b8a6;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">⚡</div>
      <strong style="font-size:16px">Boycott Incorporated</strong>
    </div>
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#334155">${body}</div>
    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
    <p style="font-size:12px;color:#64748b;margin:0">You received this because you have an account on Boycott Incorporated.</p>
  </div></body></html>`;
}

function buildTemplate(p: Payload): { subject: string; html: string } {
  const d = p.data || {};
  switch (p.template) {
    case "welcome":
      return {
        subject: "Welcome to Boycott Incorporated 🎉",
        html: html(
          `Welcome${d.name ? `, ${d.name}` : ""}!`,
          `You're in! Start earning points today by completing tasks, watching videos, and crushing challenges.<br/><br/>
           <strong>Quick tips:</strong><ul><li>Verify your phone in Settings to unlock withdrawals</li><li>Refer 2 friends to enable your first cash-out</li><li>K10 = 150 points</li></ul>`
        ),
      };
    case "withdrawal_status": {
      const status = String(d.status || "").toLowerCase();
      const titleMap: Record<string, string> = {
        approved: "Your withdrawal was approved ✅",
        completed: "Your withdrawal has been paid 💸",
        rejected: "Your withdrawal was rejected",
        pending: "Withdrawal received",
      };
      return {
        subject: titleMap[status] || "Withdrawal update",
        html: html(
          titleMap[status] || "Withdrawal update",
          `Amount: <strong>${d.amount} pts</strong> (~K${d.kwacha ?? "—"})<br/>
           Provider: ${d.provider || "—"}<br/>
           Phone: ${d.phone || "—"}<br/>
           Status: <strong>${status}</strong>${d.notes ? `<br/>Notes: ${d.notes}` : ""}`
        ),
      };
    }
    case "transfer_created":
      return {
        subject: d.role === "sender"
          ? "Transfer submitted for review"
          : "You have an incoming points transfer",
        html: html(
          d.role === "sender" ? "Transfer submitted" : "Incoming transfer",
          `Amount: <strong>${d.amount} pts</strong><br/>
           ${d.role === "sender" ? `To: ${d.counterparty}` : `From: ${d.counterparty}`}<br/>
           Status: pending admin review.`
        ),
      };
    case "transfer_reviewed":
      return {
        subject: `Your transfer was ${d.status}`,
        html: html(
          `Transfer ${d.status}`,
          `Amount: <strong>${d.amount} pts</strong><br/>
           ${d.role === "sender" ? `To: ${d.counterparty}` : `From: ${d.counterparty}`}<br/>
           Status: <strong>${d.status}</strong>`
        ),
      };
    case "admin_alert":
      return {
        subject: `[Admin] ${d.title || "Alert"}`,
        html: html(d.title || "Admin alert", d.message || ""),
      };
  }
}

async function sendOne(to: string, subject: string, htmlBody: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
  const r = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html: htmlBody }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Resend ${r.status}: ${text}`);
  return JSON.parse(text);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = (await req.json()) as Payload;
    if (!payload?.template || !payload?.data) {
      return new Response(JSON.stringify({ error: "Missing template/data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tpl = buildTemplate(payload);

    // Resolve recipients
    let recipients: string[] = [];
    if (payload.to) recipients = [payload.to];
    else if (payload.template === "admin_alert") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length) {
        const { data: users } = await supabase
          .from("users")
          .select("email")
          .in("id", ids);
        recipients = (users || []).map((u: any) => u.email).filter(Boolean);
      }
    }

    if (!recipients.length) {
      return new Response(JSON.stringify({ skipped: true, reason: "no recipient" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    for (const to of recipients) {
      try {
        results.push({ to, ok: true, ...(await sendOne(to, tpl.subject, tpl.html)) });
      } catch (e) {
        console.error("send fail", to, e);
        results.push({ to, ok: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-email error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
