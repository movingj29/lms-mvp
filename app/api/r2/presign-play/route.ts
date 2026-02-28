import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(req: Request) {
  try {
    // 1) 인증 토큰 필수
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    const { data: requester, error: requesterErr } = await supabaseAdmin.auth.getUser(token);
    if (requesterErr || !requester?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 2) lectureId 받기
    const { searchParams } = new URL(req.url);
    const lectureId = searchParams.get("lectureId");
    if (!lectureId) {
      return NextResponse.json({ error: "lectureId required" }, { status: 400 });
    }

    // 3) lectures에서 video_path 가져오기
    const { data: lec, error: lecErr } = await supabaseAdmin
      .from("lectures")
      .select("video_path")
      .eq("id", lectureId)
      .single();

    if (lecErr || !lec?.video_path) {
      return NextResponse.json({ error: lecErr?.message ?? "Lecture not found" }, { status: 404 });
    }

    // 4) (선택) 접근권 체크
    // 지금 너 시스템이 "로그인만 하면 모두 시청 가능"이면 여기 생략 가능.
    // 만약 반/수강생 제한이 있으면 여기서 검사하면 됨.

    // 5) presigned GET 발급
    const cmd = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET!,
      Key: lec.video_path,
    });

    const url = await getSignedUrl(s3, cmd, { expiresIn: 60 * 10 }); // 10분 추천
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}