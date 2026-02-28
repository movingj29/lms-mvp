import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function POST(req: Request) {
  try {
    // ✅ teacher만 허용 (너 기존 teacher-progress 방식 그대로)
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const { data: requester, error: requesterErr } = await supabaseAdmin.auth.getUser(token);
    if (requesterErr || !requester?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.user.id)
      .maybeSingle();

    if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 400 });
    if (roleRow?.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const key = String(body.key || "");
    const contentType = String(body.contentType || "application/octet-stream");

    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

    const cmd = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 }); // 10분
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}