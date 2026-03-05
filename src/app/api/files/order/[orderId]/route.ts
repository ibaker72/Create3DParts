import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: order, error } = await supabase
    .from("orders")
    .select("file_path, user_id")
    .eq("id", orderId)
    .eq("user_id", user.id)
    .single();

  if (error || !order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!order.file_path) return NextResponse.json({ error: "No file attached" }, { status: 404 });

  const admin = supabaseAdmin();

  const { data: signed, error: signErr } = await admin.storage
    // IMPORTANT: this bucket must match where you uploaded
    .from("orders")
    .createSignedUrl(order.file_path, 60);

  if (signErr || !signed?.signedUrl) {
    return NextResponse.json(
      { error: signErr?.message || "Could not sign URL" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(signed.signedUrl, { status: 302 });
}