import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getResend, FROM_ADDRESS, ADMIN_EMAIL } from "@/lib/resend";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  const { full_name, email, password } = body as Record<string, unknown>;

  if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
    return err("full_name is required", 400);
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return err("A valid email is required", 400);
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return err("Password must be at least 8 characters", 400);
  }

  const admin = supabaseAdmin();

  // Create auth user via Admin API so we can set email_confirm = true
  // (skips the confirmation email — we use magic links for first login)
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name.trim() },
  });

  if (createErr) {
    console.error("[auth/signup] createUser error:", createErr);
    const msg = createErr.message?.toLowerCase() ?? "";
    if (msg.includes("already registered") || msg.includes("already been registered")) {
      return err("An account with that email already exists", 409);
    }
    return err(createErr.message ?? "Failed to create account", 400);
  }

  const userId = created.user.id;

  // Insert profile row
  const { error: profileErr } = await admin.from("profiles").insert({
    id: userId,
    full_name: full_name.trim(),
    role: "client",
    status: "pending",
  });

  if (profileErr) {
    // User exists but profile failed — log for manual fix, don't block
    console.error("[auth/signup] profile insert error:", profileErr);
  }

  const resend = getResend();

  // Notify admin
  const adminSend = resend.emails.send({
    from: FROM_ADDRESS,
    to: ADMIN_EMAIL,
    subject: `New signup: ${full_name.trim()} <${email}>`,
    text: [
      "A new user has signed up and is awaiting approval.",
      "",
      `Name:  ${full_name.trim()}`,
      `Email: ${email}`,
      `ID:    ${userId}`,
      "",
      `Approve: ${process.env.NEXT_PUBLIC_SITE_URL ?? "https://create3dparts.com"}/admin`,
    ].join("\n"),
  });

  // Confirm to client
  const clientSend = resend.emails.send({
    from: FROM_ADDRESS,
    to: email,
    subject: "We received your request - Create3DParts",
    html: `
      <div style="font-family:sans-serif;max-width:520px;color:#111">
        <h2>Request received!</h2>
        <p>Hi ${full_name.trim()},</p>
        <p>Thanks for signing up for <strong>Create3DParts.com</strong>. We've received your request and will review your account shortly.</p>
        <p>You'll receive an email with a login link once your account is approved — usually within 24 hours.</p>
        <p style="font-size:13px;color:#888">Questions? Reply to this email.</p>
      </div>
    `,
  });

  // Fire both sends; log individual failures but don't block the response
  const [adminResult, clientResult] = await Promise.allSettled([adminSend, clientSend]);
  if (adminResult.status === "rejected") {
    console.error("[auth/signup] admin email failed:", adminResult.reason);
  }
  if (clientResult.status === "rejected") {
    console.error("[auth/signup] client email failed:", clientResult.reason);
  }

  return NextResponse.json({ ok: true });
}
