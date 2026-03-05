import { redirect } from "next/navigation";
import { createServerSupabase } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import AdminDashboard, { type QuoteRequest } from "./AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  // ── Session + role gate ───────────────────────────────────────────────────
  // Middleware already redirects non-admins, but we double-check here so
  // a misconfigured middleware can't leak the page.
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = supabaseAdmin();
  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (callerProfile?.role !== "admin") redirect("/");

  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [
    { data: pendingProfiles },
    { data: quotes },
    { data: { users: authUsers } },
  ] = await Promise.all([
    // All profiles still awaiting approval
    admin
      .from("profiles")
      .select("id, full_name, created_at, status")
      .eq("status", "pending")
      .order("created_at", { ascending: true }), // oldest first — approve in order

    // All quote requests, newest first
    admin
      .from("quote_requests")
      .select("id, created_at, customer_name, customer_email, customer_phone, material, color, quality, quantity, deadline, notes, status, file_name, price_cents, stripe_payment_status, stripe_payment_link")
      .order("created_at", { ascending: false })
      .limit(300),
      
    // Auth users so we can resolve emails for profiles
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Attach email to each pending profile (email lives in auth.users, not profiles)
  const emailById = Object.fromEntries(authUsers.map((u) => [u.id, u.email ?? ""]));
  const pendingUsers = (pendingProfiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name ?? null,
    created_at: p.created_at,
    email: emailById[p.id] ?? "(no email)",
  }));

  return (
    <AdminDashboard
      pendingUsers={pendingUsers}
      quotes={((quotes as any[]) ?? []) as QuoteRequest[]}
      adminEmail={user.email ?? ""}
    />
  );
}
