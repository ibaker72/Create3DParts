import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResend, FROM_ADDRESS } from "@/lib/resend";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://create3dparts.com";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function PATCH(req: NextRequest) {
  // ── Auth + admin role ──────────────────────────────────────────────────────
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return err("Unauthorized", 401);

  const admin = supabaseAdmin();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (callerProfile?.role !== "admin") return err("Forbidden", 403);

  // ── Resolve target user id ────────────────────────────────────────────────
  // Accept from query string (?id=xxx) or JSON body ({ user_id, id })
  const { searchParams } = new URL(req.url);
  let targetId = searchParams.get("id");

  if (!targetId) {
    try {
      const body = await req.json();
      targetId = body.user_id ?? body.id ?? null;
    } catch {
      // no body
    }
  }

  if (!targetId || typeof targetId !== "string") {
    return err("user id is required (query param ?id= or body { user_id })", 400);
  }

  // ── Mark profile approved ─────────────────────────────────────────────────
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ status: "approved" })
    .eq("id", targetId)
    .eq("status", "pending"); // idempotency guard

  if (updateErr) {
    console.error("[approve-user] DB error:", updateErr);
    return err("Failed to approve user", 500);
  }

  // ── Fetch the user's email from auth.users ────────────────────────────────
  const {
    data: { user: targetUser },
    error: userErr,
  } = await admin.auth.admin.getUserById(targetId);

  if (userErr || !targetUser?.email) {
    console.error("[approve-user] getUserById error:", userErr);
    // Profile is already approved — log but still return ok
    return NextResponse.json({ ok: true, warning: "User approved but email not found" });
  }

  const targetEmail = targetUser.email;
  const targetName =
    (targetUser.user_metadata?.full_name as string | undefined) ?? targetEmail;

  // ── Generate magic login link ─────────────────────────────────────────────
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: targetEmail,
    options: { redirectTo: `${SITE_URL}/dashboard` },
  });

  if (linkErr || !linkData?.properties?.action_link) {
    console.error("[approve-user] generateLink error:", linkErr);
    return NextResponse.json({
      ok: true,
      warning: "User approved but magic link generation failed",
    });
  }

  const magicLink = linkData.properties.action_link;

  // ── Email the client ──────────────────────────────────────────────────────
  const { error: emailErr } = await getResend().emails.send({
    from: FROM_ADDRESS,
    to: targetEmail,
    subject: "Your Create3DParts account is approved",
    html: `
      <div style="font-family:sans-serif;max-width:520px;color:#111">
        <h2>You're approved!</h2>
        <p>Hi ${targetName},</p>
        <p>Your Create3DParts account has been approved. Click the button below to log in and start placing orders.</p>
        <div style="margin:32px 0">
          <a
            href="${magicLink}"
            style="display:inline-block;background:#f4621f;color:#000;font-family:'Courier New',monospace;font-weight:700;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;text-decoration:none;padding:14px 28px;"
          >
            Log in to your account &rarr;
          </a>
        </div>
        <p style="font-size:12px;color:#888">
          This link expires in 24 hours. After that, request a new one from the login page.
        </p>
        <p style="font-size:12px;color:#888">Questions? Reply to this email.</p>
      </div>
    `,
  });

  if (emailErr) {
    console.error("[approve-user] email error:", emailErr);
    return NextResponse.json({
      ok: true,
      warning: "User approved but approval email failed to send",
    });
  }

  return NextResponse.json({ ok: true });
}

// Keep POST as an alias so any older callers don't hard-break
export { PATCH as POST };
