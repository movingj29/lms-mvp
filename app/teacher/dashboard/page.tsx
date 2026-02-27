"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { getMyRole } from "../../../lib/getRole";

type Lecture = { id: string; title: string };
type Row = {
  user_id: string;
  email: string;
  max_watched_sec: number;
  duration_sec: number;
  updated_at: string;
};

export default function TeacherDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [lectureId, setLectureId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function deleteLecture() {
  if (!lectureId) return;
  const target = lectures.find((l) => l.id === lectureId);
  const ok = confirm(`정말 삭제할까?\n- ${target?.title ?? lectureId}\n(영상+진도 데이터도 같이 삭제됨)`);
  if (!ok) return;

  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  if (!token) {
    router.replace("/login");
    return;
  }

  const res = await fetch(`/api/teacher-delete-lecture?lectureId=${lectureId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    alert(`삭제 실패: ${await res.text()}`);
    return;
  }

  // 화면 갱신: 강의 목록 다시 불러오진 않고, 현재 state에서 제거(최소 변경)
  const nextLectures = lectures.filter((l) => l.id !== lectureId);
  setLectures(nextLectures);
  setLectureId(nextLectures[0]?.id ?? "");
  setRows([]);
}

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        router.replace("/login");
        return;
      }
      setEmail(auth.user.email ?? "");

      const role = await getMyRole();
      if (role !== "teacher") {
        router.replace("/student/lectures");
        return;
      }

      const { data, error } = await supabase
        .from("lectures")
        .select("id,title")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setLectures(data as any);
        if (data[0]) setLectureId((data[0] as any).id);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!lectureId) return;

    const fetchRows = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        router.replace("/login");
        return;
      }

      const res = await fetch(`/api/teacher-progress?lectureId=${lectureId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.error("teacher-progress failed", await res.text());
        return;
      }

      const data = (await res.json()) as Row[];
      setRows(data ?? []);
    };

    fetchRows();
    const t = setInterval(fetchRows, 5000);
    return () => clearInterval(t);
  }, [lectureId, router]);

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
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
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
          <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 6 }}>
            선생 · 대시보드
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            실시간 시청률 대시보드
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

            <a
              href="/teacher/upload"
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.78)",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                textDecoration: "none",
                backdropFilter: "blur(6px)",
                transition: "background 120ms ease",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            >
              + 강의 업로드
            </a>
          </div>
        </div>

        {/* Logout */}
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

      {/* Controls card */}
      <button
  onClick={deleteLecture}
  style={{
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.78)",
    borderRadius: 12,
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
  삭제
</button>
      <div
        style={{
          border: "1px solid rgba(81, 68, 68, 0.1)",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 16,
          backdropFilter: "blur(10px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em" }}>
            LECTURE
          </div>

          <select
            value={lectureId}
            onChange={(e) => setLectureId(e.target.value)}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              outline: "none",
              minWidth: 260,
            }}
          >
            {lectures.map((l) => (
              <option key={l.id} value={l.id} style={{ color: "#111" }}>
                {l.title}
              </option>
            ))}
          </select>

          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
            5초마다 자동 갱신
          </div>
        </div>
      </div>

      {/* Table card */}
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
              {["학생 이메일", "진도율(%)", "최대 시청(초)", "영상 길이(초)", "업데이트"].map((h) => (
                <th
                  key={h}
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
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 18, color: "rgba(255,255,255,0.65)" }}>
                  아직 데이터가 없어. 학생이 영상을 시청하면 여기에 표시돼.
                </td>
              </tr>
            ) : (
              rows
                .map((r) => ({
                  ...r,
                  percent:
                    r.duration_sec > 0
                      ? Math.round((1000 * r.max_watched_sec) / r.duration_sec) / 10
                      : 0,
                }))
                .sort((a: any, b: any) => b.percent - a.percent)
                .map((r: any, idx: number) => (
                  <tr key={r.user_id}>
                    <td
                      style={{
                        padding: "14px 12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.90)",
                        fontWeight: 650,
                      }}
                    >
                      {r.email}
                      <div style={{ marginTop: 6, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
                        #{idx + 1}
                      </div>
                    </td>

                    <td style={{ padding: "14px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {/* Progress bar */}
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
                            width: `${Math.max(0, Math.min(100, r.percent))}%`,
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
                        <span>{r.percent}%</span>
                        <span style={{ color: "rgba(255,255,255,0.45)" }}>
                          {r.percent >= 100 ? "완료" : "진행 중"}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: "14px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {r.max_watched_sec}
                    </td>
                    <td style={{ padding: "14px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                      {r.duration_sec}
                    </td>
                    <td
                      style={{
                        padding: "14px 12px",
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        color: "rgba(255,255,255,0.75)",
                        fontSize: 13,
                      }}
                    >
                      {new Date(r.updated_at).toLocaleString()}
                    </td>
                  </tr>
                ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);
}