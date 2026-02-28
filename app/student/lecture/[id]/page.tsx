"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";

export default function LecturePlayerPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // ✅ 앞으로 못 가게 막는 기준(= 내가 가장 많이 본 위치)
  const maxAllowedRef = useRef<number>(0);

  const [title, setTitle] = useState("");
  const [signedUrl, setSignedUrl] = useState("");
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState(false);

  // 앞으로 이동 허용 오차(약간의 버퍼)
  const FORWARD_BUFFER = 0.75;

  // 1) 로그인/강의/영상URL 로드 + 내 progress 불러오기
  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        router.replace("/login");
        return;
      }
      setToken(accessToken);

      // 강의 정보
      const { data: lec, error } = await supabase
        .from("lectures")
        .select("title, video_path")
        .eq("id", id)
        .single();

      if (error) {
        alert(error.message);
        return;
      }
      setTitle(lec.title);

      // 내 기존 진도(있으면) 가져오기: RLS 때문에 student는 자기 것만 조회됨
      const { data: prog } = await supabase
        .from("watch_progress")
        .select("max_watched_sec")
        .eq("lecture_id", id)
        .maybeSingle();

      maxAllowedRef.current = prog?.max_watched_sec ?? 0;

      // 비공개 버킷이면 signed URL로 재생
// ✅ R2 presigned GET URL로 재생 (lec.video_path = R2 key)
const res = await fetch(`/api/r2/presign-play?key=${encodeURIComponent(lec.video_path)}`);
if (!res.ok) {
  alert("재생 URL 생성 실패: " + (await res.text()));
  return;
}
const { url } = await res.json();
setSignedUrl(url);
setLoaded(true);
    })();
  }, [id, router]);

  // 2) 비디오가 메타데이터 로드되면 "최대 시청 위치"로 점프
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onLoadedMeta = () => {
      // ✅ 항상 "가장 많이 본 위치"로 시작
      v.currentTime = maxAllowedRef.current || 0;
    };

    v.addEventListener("loadedmetadata", onLoadedMeta);
    return () => v.removeEventListener("loadedmetadata", onLoadedMeta);
  }, [loaded]);

  // 3) 앞으로 점프(seek) 막기
// 3) 앞으로 점프(seek) 막기
useEffect(() => {
  const v = videoRef.current;
  if (!v) return;

  let forcing = false;

  const clampIfForward = () => {
    const maxAllowed = maxAllowedRef.current;
    if (v.currentTime > maxAllowed + FORWARD_BUFFER) {
      forcing = true;
      v.currentTime = maxAllowed;
      // 다음 tick에서 forcing 해제 (무한루프 방지)
      setTimeout(() => (forcing = false), 0);
      return true;
    }
    return false;
  };

  const onSeeking = () => {
    if (forcing) return;
    clampIfForward();
  };

  const onSeeked = () => {
    if (forcing) return;
    clampIfForward();
  };

  // ✅ 핵심: timeupdate에서도 앞으로 점프를 계속 감시해서 "순간 통과"를 막음
  const onTimeUpdate = () => {
    if (forcing) return;

    // 앞으로 점프 감지되면 바로 되돌림
    if (clampIfForward()) return;

    // 자연 재생으로만 maxAllowed 갱신
    if (v.currentTime > maxAllowedRef.current) {
      maxAllowedRef.current = v.currentTime;
    }
  };

  v.addEventListener("seeking", onSeeking);
  v.addEventListener("seeked", onSeeked);
  v.addEventListener("timeupdate", onTimeUpdate);

  return () => {
    v.removeEventListener("seeking", onSeeking);
    v.removeEventListener("seeked", onSeeked);
    v.removeEventListener("timeupdate", onTimeUpdate);
  };
}, [loaded]);

  // 4) 5초마다 진행률 서버 저장 (이미 max_watched 기반 저장 로직 있음)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!token) return;
      const v = videoRef.current;
      if (!v) return;
      if (!v.duration || Number.isNaN(v.duration)) return;

      await fetch("/api/progress", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          lectureId: id,
          currentTime: maxAllowedRef.current, // ✅ 핵심: 최대 시청 위치를 보내기
          duration: v.duration,
        }),
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [id, token]);

return (
  <div
    style={{
      minHeight: "100vh",
      padding: "40px 20px",
      background:
        "radial-gradient(1200px 600px at 10% 0%, rgba(99,102,241,0.22), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(16,185,129,0.18), transparent 60%), #0b0f17",
      color: "rgba(255,255,255,0.92)",
    }}
  >
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 6 }}>
            학생 · 강의 시청
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            {title || "로딩중..."}
          </h1>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                color: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(6px)",
              }}
            >
              되감기 가능 · 앞으로 점프 불가
            </div>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                color: "rgba(255,255,255,0.75)",
                backdropFilter: "blur(6px)",
              }}
            >
              기준: 최대 시청 위치
            </div>
          </div>
        </div>

        {/* Back button */}
        <a
          href="/student/lectures"
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.78)",
            borderRadius: 10,
            padding: "10px 12px",
            textDecoration: "none",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            transition: "background 120ms ease, transform 120ms ease",
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          ← 목록
        </a>
      </div>

      {/* Player card */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 18,
          padding: 16,
          backdropFilter: "blur(10px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        {signedUrl ? (
          <div>
            <div
              style={{
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.35)",
              }}
            >
              <video
                ref={videoRef}
                src={signedUrl}
                controls
                style={{ width: "100%", display: "block" }}
              />
            </div>

            {/* Info strip */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                color: "rgba(255,255,255,0.60)",
                fontSize: 12,
              }}
            >
              <span>• 5초마다 자동 저장됨</span>
              <span>• 앞으로 점프 시 자동으로 되돌림</span>
            </div>
          </div>
        ) : (
          <div style={{ padding: 16, color: "rgba(255,255,255,0.70)" }}>
            로딩중... (영상 URL 생성 중)
          </div>
        )}
      </div>

      {/* Small note */}
      <div style={{ marginTop: 14, color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
        ⚠️ 앞으로 점프 제한은 <b>최대 시청 위치</b> 기준으로 동작함
      </div>
    </div>
  </div>
);
}