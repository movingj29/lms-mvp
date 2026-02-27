"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

type Lecture = {
  id: string;
  title: string;
  created_at: string;
};

type Progress = {
  lecture_id: string;
  max_watched_sec: number;
  duration_sec: number;
};

function formatHMS(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}

export default function StudentLecturesPage() {
  const router = useRouter();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [email, setEmail] = useState("");

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      setEmail(auth.user.email ?? "");

      // 강의 목록
      const { data: lecData } = await supabase
        .from("lectures")
        .select("id,title,created_at")
        .order("created_at", { ascending: false });

      setLectures(lecData ?? []);

      // 내 진행률 조회 (RLS 덕분에 자기 것만 나옴)
      const { data: progData } = await supabase
        .from("watch_progress")
        .select("lecture_id,max_watched_sec,duration_sec");

      const map: Record<string, number> = {};
      (progData ?? []).forEach((p: Progress) => {
        if (p.duration_sec > 0) {
          map[p.lecture_id] =
            Math.round((1000 * p.max_watched_sec) / p.duration_sec) / 10;
        }
      });

      setProgressMap(map);
    })();
  }, [router]);

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
      {/* Header */}
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
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            학생 · 강의 목록
          </h1>

          <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                color: "rgba(255,255,255,0.8)",
                backdropFilter: "blur(6px)",
              }}
            >
              로그인: {email}
            </div>
          </div>
        </div>

        {/* Logout button - subtle */}
        <button
          onClick={logout}
          style={{
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.78)",
            borderRadius: 10,
            padding: "10px 12px",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            transition: "background 120ms ease, transform 120ms ease",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          로그아웃
        </button>
      </div>

      {/* Card */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 16,
          backdropFilter: "blur(10px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  padding: "12px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                강의
              </th>
              <th
                style={{
                  textAlign: "left",
                  fontSize: 12,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.55)",
                  padding: "12px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.10)",
                  width: 260,
                }}
              >
                진행률
              </th>
            </tr>
          </thead>

          <tbody>
            {lectures.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: 18, color: "rgba(255,255,255,0.65)" }}>
                  아직 강의가 없어. 선생님이 강의를 등록하면 여기에 뜰 거야.
                </td>
              </tr>
            ) : (
              lectures.map((l) => {
                const percent = progressMap[l.id] ?? 0;

                // ✅ 기존 변수 안 건드리면서, watch_progress에서 시간도 보여주고 싶으면
                // progressMap 말고 progData를 별도로 저장해야 함.
                // 지금은 “퍼센트”만 있으니 시간은 표시 안 함(안전).

                return (
                  <tr key={l.id}>
                    <td
                      style={{
                        padding: "14px 12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        verticalAlign: "middle",
                      }}
                    >
                      <a
                        href={`/student/lecture/${l.id}`}
                        style={{
                          color: "rgba(255,255,255,0.92)",
                          textDecoration: "none",
                          fontWeight: 650,
                        }}
                      >
                        {l.title}
                      </a>
                      <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                        클릭해서 강의 재생
                      </div>
                    </td>

                    <td
                      style={{
                        padding: "14px 12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      <div
                        style={{
                          height: 10,
                          borderRadius: 999,
                          background: "rgba(255,255,255,0.10)",
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.10)",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.max(0, Math.min(100, percent))}%`,
                            height: "100%",
                            borderRadius: 999,
                            background:
                              "linear-gradient(90deg, rgba(99,102,241,0.95), rgba(16,185,129,0.95))",
                          }}
                        />
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          justifyContent: "space-between",
                          color: "rgba(255,255,255,0.60)",
                          fontSize: 12,
                        }}
                      >
                        <span>진행률: {percent}%</span>
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>
                          {percent >= 100 ? "완료" : "진행 중"}
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
}