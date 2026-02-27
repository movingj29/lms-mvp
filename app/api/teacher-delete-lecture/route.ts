import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

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

    // 4) 진도 데이터 삭제 (watch_progress)
    const { error: wpErr } = await supabaseAdmin
      .from("watch_progress")
      .delete()
      .eq("lecture_id", lectureId);

    if (wpErr) return NextResponse.json({ error: wpErr.message }, { status: 400 });

    // 5) lectures 삭제
    const { error: delErr } = await supabaseAdmin.from("lectures").delete().eq("id", lectureId);
    if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

    // 6) 스토리지 영상 삭제
    if (lecture.video_path) {
      const { error: stErr } = await supabaseAdmin.storage.from("videos").remove([lecture.video_path]);
      if (stErr) {
        // DB는 이미 삭제됐으니, 스토리지만 실패해도 오류로 막진 않고 경고만 반환 가능
        return NextResponse.json({ ok: true, warning: stErr.message });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}