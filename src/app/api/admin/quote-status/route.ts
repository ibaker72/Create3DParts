import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

// Only forward transitions are allowed — no skipping, no going back.
const VALID_TRANSITIONS: Record<string, string> = {
  paid:     "printing",
  printing: "shipped",
  shipped:  "complete",
};

export async function PATCH(req: NextRequest) {
  // ── Auth + role ───────────────────────────────────────────────────────────
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return err("Unauthorized", 401);

  const admin = supabaseAdmin();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (callerProfile?.role !== "admin") return err("Forbidden", 403);

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); } catch { return err("Invalid JSON", 400); }

  const { quote_id, status: nextStatus } = body as Record<string, unknown>;
  if (!quote_id || typeof quote_id !== "string") return err("quote_id required", 400);
  if (!nextStatus || typeof nextStatus !== "string") return err("status required", 400);

  // ── Fetch current quote ───────────────────────────────────────────────────
  const { data: quote, error: fetchErr } = await admin
    .from("quote_requests")
    .select("id, status")
    .eq("id", quote_id)
    .single();

  if (fetchErr || !quote) return err("Quote not found", 404);

  // ── Validate transition ───────────────────────────────────────────────────
  const allowed = VALID_TRANSITIONS[quote.status];
  if (!allowed) return err(`Status '${quote.status}' has no forward transition`, 409);
  if (nextStatus !== allowed) {
    return err(`Cannot go from '${quote.status}' to '${nextStatus}'. Expected '${allowed}'.`, 409);
  }

  // ── Apply update ──────────────────────────────────────────────────────────
  const { error: updateErr } = await admin
    .from("quote_requests")
    .update({ status: nextStatus })
    .eq("id", quote_id);

  if (updateErr) {
    console.error("[quote-status] DB error:", updateErr);
    return err("Failed to update status", 500);
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
