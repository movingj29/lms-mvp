import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lectureId = searchParams.get("lectureId");
    if (!lectureId) {
      return NextResponse.json({ error: "lectureId required" }, { status: 400 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ error: "No token" }, { status: 401 });

    // 1) 요청자 토큰 검증
    const { data: requester, error: requesterErr } = await supabaseAdmin.auth.getUser(token);
    if (requesterErr || !requester?.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 2) teacher인지 확인
    const { data: roleRow, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.user.id)
      .maybeSingle();

    if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 400 });
    if (roleRow?.role !== "teacher") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 3) 강의 정보(영상 경로) 가져오기
    const { data: lecture, error: lecErr } = await supabaseAdmin
      .from("lectures")
      .select("id, video_path")
      .eq("id", lectureId)
      .maybeSingle();

    if (lecErr) return NextResponse.json({ error: lecErr.message }, { status: 400 });
    if (!lecture) return NextResponse.json({ error: "Lecture not found" }, { status: 404 });

    const videoKey = lecture.video_path || "";

    // ✅ (추천) 먼저 R2 파일 삭제 시도
    // - R2 삭제가 실패하면 DB는 남겨두는게 관리상 더 깔끔함(유령 파일 방지)
    // - 단, "DB 삭제 우선"을 원하면 순서 바꿔도 됨
    if (videoKey) {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET!,
            Key: videoKey,
          })
        );
      } catch (e: any) {
        return NextResponse.json(
          { error: `R2 delete failed: ${e?.message ?? String(e)}` },
          { status: 500 }
        );
      }
    }

    // 4) 진도 데이터 삭제 (watch_progress)
    const { error: wpErr } = await supabaseAdmin
      .from("watch_progress")
      .delete()
      .eq("lecture_id", lectureId);

    if (wpErr) return NextResponse.json({ error: wpErr.message }, { status: 400 });

    // 5) lectures 삭제
    const { error: delErr } = await supabaseAdmin.from("lectures").delete().eq("id", lectureId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}