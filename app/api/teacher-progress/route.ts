import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(req: Request) {
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

    // 3) 진행률 가져오기
    const { data: progress, error: pErr } = await supabaseAdmin
      .from("watch_progress")
      .select("user_id, lecture_id, max_watched_sec, duration_sec, updated_at")
      .eq("lecture_id", lectureId);

    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 400 });

    const rows = progress ?? [];
    const userIds = [...new Set(rows.map((r) => r.user_id))];

    // 4) user_id -> email (Auth Admin API)
    const pairs = await Promise.all(
      userIds.map(async (uid) => {
        const { data, error } = await supabaseAdmin.auth.admin.getUserById(uid);
        if (error || !data?.user) return [uid, "unknown"] as const;
        return [uid, data.user.email ?? "unknown"] as const;
      })
    );

    const emailMap = new Map(pairs);

    // 5) 합치기
    const result = rows.map((r) => ({
      ...r,
      email: emailMap.get(r.user_id) ?? "unknown",
    }));

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}