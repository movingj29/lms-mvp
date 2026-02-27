import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return NextResponse.json({ ok: false, error: "No token" }, { status: 401 });

    // 토큰으로 유저 검증
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 401 });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const lectureId = String(body.lectureId);
    const currentTime = Math.max(0, Math.floor(Number(body.currentTime ?? 0)));
    const duration = Math.max(0, Math.floor(Number(body.duration ?? 0)));

    // max_watched_sec는 "최대 도달 지점"으로 저장
    const { data: existing } = await supabaseAdmin
      .from("watch_progress")
      .select("max_watched_sec")
      .eq("user_id", userId)
      .eq("lecture_id", lectureId)
      .maybeSingle();

    const prevMax = existing?.max_watched_sec ?? 0;
    const nextMax = Math.max(prevMax, currentTime);

    const { error } = await supabaseAdmin.from("watch_progress").upsert({
      user_id: userId,
      lecture_id: lectureId,
      duration_sec: duration,
      last_position_sec: currentTime,
      max_watched_sec: nextMax,
      updated_at: new Date().toISOString(),
    });

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}