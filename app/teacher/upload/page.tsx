"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";

export default function UploadLecturePage() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) {
        alert("로그인부터 해야 함");
        return;
      }
      if (!title.trim()) {
        alert("강의 제목 입력");
        return;
      }
      if (!file) {
        alert("영상 파일 선택");
        return;
      }

const path = `${user.id}/${Date.now()}-${file.name}`;

// 1️⃣ 로그인 토큰 가져오기
const { data: sess } = await supabase.auth.getSession();
const token = sess.session?.access_token;
if (!token) {
  alert("로그인부터 해야 함");
  return;
}

// 2️⃣ presigned PUT URL 요청
const presignRes = await fetch("/api/r2/presign-upload", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    key: path,
    contentType: file.type,
  }),
});

if (!presignRes.ok) {
  throw new Error(await presignRes.text());
}

const { url } = await presignRes.json();

// 3️⃣ 브라우저 → R2 직접 업로드
const putRes = await fetch(url, {
  method: "PUT",
  headers: {
    "Content-Type": file.type,
  },
  body: file,
});

if (!putRes.ok) {
  throw new Error("R2 업로드 실패");
}

// 4️⃣ DB에는 key만 저장
const { error: dbErr } = await supabase.from("lectures").insert({
  title,
  video_path: path,   // 🔥 URL 아님, key 저장
  created_by: user.id,
});

if (dbErr) throw dbErr;

      alert("업로드 완료!");
      setTitle("");
      setFile(null);
    } catch (e: any) {
      alert(e.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

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
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
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
            선생 · 강의 관리
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            강의 업로드
          </h1>
          <div style={{ marginTop: 10, color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
            영상 파일을 업로드하고, 강의 목록에 등록.
          </div>
        </div>

        <a
          href="/teacher/dashboard"
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
          ← 대시보드
        </a>
      </div>

      {/* Form card */}
      <div
        style={{
          border: "1px solid rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.06)",
          borderRadius: 16,
          padding: 18,
          backdropFilter: "blur(10px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
        }}
      >
        {/* Title */}
        <div style={{ marginTop: 6 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
            LECTURE TITLE
          </label>
          <input
            placeholder="강의 제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 12,
              outline: "none",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.92)",
              fontSize: 14,
            }}
          />
        </div>

        {/* File */}
        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
            VIDEO FILE
          </label>

          <div
            style={{
              border: "1px dashed rgba(255,255,255,0.20)",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 14,
              padding: 14,
            }}
          >
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              style={{ color: "rgba(255,255,255,0.75)" }}
            />

            <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              {file ? `선택됨: ${file.name}` : "영상 파일 선택. (mp4 권장)"}
            </div>
          </div>
        </div>

        {/* Action */}
        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button
            onClick={upload}
            disabled={busy}
            style={{
              flex: 1,
              border: "1px solid rgba(255,255,255,0.14)",
              background: busy
                ? "rgba(255,255,255,0.08)"
                : "linear-gradient(90deg, rgba(99,102,241,0.92), rgba(16,185,129,0.75))",
              color: busy ? "rgba(255,255,255,0.60)" : "rgba(255,255,255,0.92)",
              borderRadius: 12,
              padding: "12px 12px",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 700,
              transition: "transform 120ms ease, filter 120ms ease",
            }}
            onMouseDown={(e) => {
              if (!busy) e.currentTarget.style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => {
              if (!busy) e.currentTarget.style.transform = "scale(1)";
            }}
            onMouseEnter={(e) => {
              if (!busy) e.currentTarget.style.filter = "brightness(1.05)";
            }}
            onMouseLeave={(e) => {
              if (!busy) e.currentTarget.style.filter = "brightness(1)";
            }}
          >
            {busy ? "업로드 중..." : "업로드"}
          </button>

          <a
            href="/teacher/dashboard"
            style={{
              flex: 1,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.78)",
              borderRadius: 12,
              padding: "12px 12px",
              textDecoration: "none",
              textAlign: "center",
              fontWeight: 650,
              backdropFilter: "blur(6px)",
              transition: "background 120ms ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.10)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          >
            취소
          </a>
        </div>

        {/* Hint */}
        <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
          <div>• 업로드 후 학생 강의 목록에 자동으로 표시됨.</div>
          <div>• 대시보드에서 실시간 시청률 확인 가능.</div>
        </div>
      </div>
    </div>
  </div>
);
}