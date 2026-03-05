// /api/admin/delete-quote
// Admin-only: permanently deletes a quote_request row by id.

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function err(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function DELETE(req: NextRequest) {
  // ── 1. Auth + role ────────────────────────────────────────────────────────
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

  // ── 2. Validate body ──────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body", 400);
  }

  const { quote_id } = body as Record<string, unknown>;
  if (!quote_id || typeof quote_id !== "string") {
    return err("quote_id is required", 400);
  }

  // ── 3. Delete ─────────────────────────────────────────────────────────────
  const { error: deleteError } = await admin
    .from("quote_requests")
    .delete()
    .eq("id", quote_id);

  if (deleteError) {
    console.error("[delete-quote] DB delete error:", JSON.stringify(deleteError));
    return err("Failed to delete quote", 500);
  }

  return NextResponse.json({ success: true });
}
