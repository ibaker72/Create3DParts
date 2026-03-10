// Supabase Edge Function — on-new-user
// Triggered by a Database Webhook on INSERT to public.profiles.
// Sends an admin notification and a client welcome email via Resend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ── Env vars ──────────────────────────────────────────────────────────────────
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
const SUPABASE_URL            = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY          = Deno.env.get("RESEND_API_KEY")!;
const FROM_ADDRESS            = Deno.env.get("RESEND_FROM") ?? "onboarding@resend.dev";
const ADMIN_EMAIL             = Deno.env.get("ADMIN_EMAIL") ?? "hello@create3dparts.com";
// Set this secret in Supabase and mirror it in the Database Webhook header
const WEBHOOK_SECRET          = Deno.env.get("WEBHOOK_SECRET") ?? "";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Profile {
  id: string;
  name?: string | null;
  company?: string | null;
  phone?: string | null;
  role?: string | null;
  status?: string | null;
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
  // Verify the shared secret so only our Database Webhook can call this function
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

  // Only act on row inserts
  if (payload.type !== "INSERT") {
    return json({ ok: true, skipped: true });
  }

  const profile = payload.record;

  // Resolve the client's email — it lives in auth.users, not profiles
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: { user }, error: userErr } = await admin.auth.admin.getUserById(profile.id);

  if (userErr || !user?.email) {
    console.error("[on-new-user] Could not resolve user email:", userErr);
    return new Response("User email not found", { status: 500 });
  }

  const clientEmail = user.email;
  const clientName  = profile.name?.trim() || user.user_metadata?.name || clientEmail;

  // Send both emails concurrently; surface any error
  const [adminResult, clientResult] = await Promise.allSettled([
    sendEmail({
      to:      ADMIN_EMAIL,
      subject: `New client signup — ${clientName}`,
      html:    adminHtml({ name: clientName, email: clientEmail, profile }),
    }),
    sendEmail({
      to:      clientEmail,
      subject: "We received your application",
      html:    clientHtml({ name: clientName }),
    }),
  ]);

  if (adminResult.status  === "rejected") console.error("[on-new-user] Admin email failed:",  adminResult.reason);
  if (clientResult.status === "rejected") console.error("[on-new-user] Client email failed:", clientResult.reason);

  const ok = adminResult.status === "fulfilled" && clientResult.status === "fulfilled";
  return json({ ok }, ok ? 200 : 207);
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

// ── Email templates ───────────────────────────────────────────────────────────
function adminHtml({
  name,
  email,
  profile,
}: {
  name: string;
  email: string;
  profile: Profile;
}) {
  return `
    <div style="font-family:sans-serif;max-width:540px;color:#111">
      <h2 style="margin-bottom:4px">New client signed up</h2>
      <p style="color:#555;margin-top:0">Review and approve the account when ready.</p>

      <table cellpadding="8" style="width:100%;border-collapse:collapse;font-size:14px;margin:20px 0">
        <tr style="background:#f5f5f5"><td><b>Name</b></td><td>${name}</td></tr>
        <tr>                           <td><b>Email</b></td><td>${email}</td></tr>
        ${profile.company ? `<tr style="background:#f5f5f5"><td><b>Company</b></td><td>${profile.company}</td></tr>` : ""}
        ${profile.phone   ? `<tr>                           <td><b>Phone</b></td>  <td>${profile.phone}</td></tr>` : ""}
        <tr style="background:#f5f5f5"><td><b>Status</b></td><td>${profile.status ?? "pending"}</td></tr>
        <tr>                           <td><b>Role</b></td>  <td>${profile.role ?? "client"}</td></tr>
      </table>

      <p style="font-size:13px;color:#888">
        To approve: update <code>profiles.status = 'active'</code> for this user in your Supabase dashboard.
      </p>
    </div>
  `;
}

function clientHtml({ name }: { name: string }) {
  return `
    <div style="font-family:sans-serif;max-width:520px;color:#111">
      <h2 style="margin-bottom:4px">Application received!</h2>
      <p>Hi ${name},</p>
      <p>Thanks for signing up with Create3DParts. We've received your application and will review it shortly.</p>

      <div style="background:#0d0d0d;color:#e8e8e8;padding:20px;border-left:3px solid #f4621f;margin:24px 0">
        <b style="font-size:13px;letter-spacing:0.08em">WHAT HAPPENS NEXT</b>
        <ol style="margin:12px 0 0 16px;padding:0;font-size:14px;line-height:1.8;color:#aaa">
          <li>We review your account — usually within a few hours during business hours.</li>
          <li>You'll receive an email the moment your account is approved.</li>
          <li>Once approved you can log in, submit quote requests, and track your orders.</li>
        </ol>
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
