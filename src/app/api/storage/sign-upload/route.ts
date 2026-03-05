import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isValidPath(p: string): boolean {
  if (!p || typeof p !== "string") return false;
  if (p.length > 300) return false;
  return /^orders\/[a-zA-Z0-9._\-/]+\.(stl|step|obj|3mf)$/i.test(p);
}

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return NextResponse.json(
        { error: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const filePath = body.filePath ?? body.filepath; // ✅ accept both
    if (!isValidPath(filePath)) {
      return NextResponse.json(
        { error: "Invalid file path.", got: filePath },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { persistSession: false },
    });

    // Use the full validated path as-is within the "orders" bucket.
    // This means the DB file_path and the storage path are always identical.
    const { data, error } = await supabaseAdmin.storage
      .from("orders")
      .createSignedUploadUrl(filePath);

    if (error || !data?.signedUrl) {
      console.error("[sign-upload] Supabase error:", error);
      return NextResponse.json(
        { error: error?.message ?? "Could not create upload URL." },
        { status: 500 }
      );
    }

    // Return pathUsed so the client can store it verbatim in file_path
    return NextResponse.json({ signedUrl: data.signedUrl, pathUsed: filePath });
  } catch (e: any) {
    console.error("[sign-upload] Unexpected error:", e);
    return NextResponse.json({ error: e?.message ?? "Internal server error." }, { status: 500 });
  }
}