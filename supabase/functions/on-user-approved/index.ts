// Supabase Edge Function — on-user-approved
//
// Triggered by a Database Webhook on UPDATE to public.profiles WHERE
// old.status = 'pending' AND new.status = 'approved'.
//
// Generates a Supabase magic link (single-use, 1-hour TTL) and sends it
// to the client so they can log in immediately without a password.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Env vars ──────────────────────────────────────────────────────────────────
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
const SUPABASE_URL             = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY           = Deno.env.get("RESEND_API_KEY")!;
const FROM_ADDRESS             = Deno.env.get("RESEND_FROM") ?? "onboarding@resend.dev";
const SITE_URL                 = Deno.env.get("SITE_URL") ?? "https://create3dparts.com";
const WEBHOOK_SECRET           = Deno.env.get("WEBHOOK_SECRET") ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  name?: string | null;
  company?: string | null;
  status?: string | null;
  role?: string | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Profile;
  old_record: Profile | null;
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  // Verify shared secret — only our Database Webhook should reach this function
  if (WEBHOOK_SECRET) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${WEBHOOK_SECRET}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  // Guard: must be an UPDATE where status moved from pending → approved.
  // The SQL trigger WHEN clause already filters this, but we double-check here
  // so manual test invocations can't accidentally send emails.
  const isApproval =
    payload.type === "UPDATE" &&
    payload.old_record?.status === "pending" &&
    payload.record?.status === "approved";

  if (!isApproval) {
    return json({ ok: true, skipped: true });
  }

  const profile = payload.record;

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Resolve email from auth.users — it is not stored on profiles
  const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(profile.id);

  if (userErr || !user?.email) {
    console.error("[on-user-approved] Could not resolve user email:", userErr);
    return new Response("User email not found", { status: 500 });
  }

  const clientEmail = user.email;
  const clientName  = profile.name?.trim() || user.user_metadata?.name || clientEmail;

  // Generate a single-use magic link so the client logs in immediately.
  // The link validates the token, creates a session, then redirects to /dashboard.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: clientEmail,
    options: {
      redirectTo: `${SITE_URL}/dashboard`,
    },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error("[on-user-approved] Magic link generation failed:", linkErr);
    return new Response("Could not generate magic link", { status: 500 });
  }

  const magicLink = linkData.properties.action_link;

  const result = await sendEmail({
    to:      clientEmail,
    subject: "Your Create3DParts account is approved — log in now",
    html:    approvalHtml({ name: clientName, magicLink }),
  });

  console.log("[on-user-approved] Approval email sent to", clientEmail, "— message id:", result.id);

  return json({ ok: true, messageId: result.id });
});

// ── Resend helper ─────────────────────────────────────────────────────────────
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }

  return res.json() as Promise<{ id: string }>;
}

// ── Email template ────────────────────────────────────────────────────────────
function approvalHtml({
  name,
  magicLink,
}: {
  name: string;
  magicLink: string;
}) {
  return `
    <div style="font-family:sans-serif;max-width:520px;color:#111">
      <h2 style="margin-bottom:4px">You're approved!</h2>
      <p>Hi ${name},</p>
      <p>
        Great news — your Create3DParts account has been approved.
        Click the button below to log in instantly. No password needed.
      </p>

      <!-- CTA button -->
      <div style="margin:32px 0">
        <a
          href="${magicLink}"
          style="
            display:inline-block;
            background:#f4621f;
            color:#000;
            font-family:'Courier New',monospace;
            font-weight:700;
            font-size:14px;
            letter-spacing:0.08em;
            text-transform:uppercase;
            text-decoration:none;
            padding:14px 28px;
          "
        >
          Log in to your account →
        </a>
      </div>

      <!-- What's next -->
      <div style="background:#0d0d0d;color:#e8e8e8;padding:20px;border-left:3px solid #f4621f;margin:24px 0">
        <b style="font-size:13px;letter-spacing:0.08em">WHAT YOU CAN DO NOW</b>
        <ul style="margin:12px 0 0 16px;padding:0;font-size:14px;line-height:1.8;color:#aaa">
          <li>Submit a quote request with your STL file</li>
          <li>Track the status of your quotes and orders</li>
          <li>Pay securely when your quote is ready</li>
        </ul>
      </div>

      <!-- Link expiry notice -->
      <div style="background:#1a1a1a;border:1px solid #2a2a2a;padding:12px 16px;margin:24px 0">
        <p style="font-size:12px;color:#888;margin:0;font-family:'Courier New',monospace">
          ⏱ This login link expires in <strong style="color:#aaa">1 hour</strong> and can only be used once.
          If it expires, go to <a href="${SITE_URL}/login" style="color:#f4621f">${SITE_URL}/login</a>
          and request a new one.
        </p>
      </div>

      <p style="font-size:13px;color:#888">
        Questions? Just reply to this email.<br/>
        — The Create3DParts team
      </p>
    </div>
  `;
}

// ── Util ──────────────────────────────────────────────────────────────────────
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
