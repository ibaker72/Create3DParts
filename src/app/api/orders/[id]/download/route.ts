import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderId = id;

    const admin = supabaseAdmin();

    // 1) Load order (service role)
    const { data: order, error } = await admin
      .from("orders")
      .select("id, file_path")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!order.file_path) {
      return NextResponse.json({ error: "No file_path on order" }, { status: 400 });
    }

    // 2) Create signed URL (private bucket)
    const { data, error: signErr } = await admin.storage
      .from("orders")
      .createSignedUrl(order.file_path, 60); // 60 seconds

    if (signErr || !data?.signedUrl) {
      return NextResponse.json(
        { error: signErr?.message || "Could not sign URL" },
        { status: 500 }
      );
    }

    // 3) Redirect browser to the signed URL (this triggers the download/open)
    return NextResponse.redirect(data.signedUrl, { status: 302 });
  } catch (e: any) {
    console.error("DOWNLOAD ERROR:", e);
    return NextResponse.json(
      { error: e?.message || "Download route crashed" },
      { status: 500 }
    );
  }
}