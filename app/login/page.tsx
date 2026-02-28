"use client";

import { getMyRole } from "../../lib/getRole";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  async function signUp() {
    const { error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return alert(error.message);
    alert("인증 메일 발송 완료!");
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });
    if (error) return alert(error.message);

    const role = await getMyRole();
    if (role === "teacher") router.push("/teacher/dashboard");
    else router.push("/student/lectures");
  }

  useEffect(() => {
    (async () => {
      const role = await getMyRole();
      if (!role) {
        setChecking(false);
        return;
      }
      if (role === "teacher") router.replace("/teacher/dashboard");
      else router.replace("/student/lectures");
    })();
  }, [router]);

  if (checking) return null;

  return (
    <div
      style={{
        // ✅ 스크롤바 생기면 중앙이 미세하게 어긋나 보이니까 아예 고정
        height: "100svh",
        overflow: "hidden",
        padding: "32px 20px",
        background:
          "radial-gradient(1200px 600px at 10% 0%, rgba(99,102,241,0.22), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(16,185,129,0.18), transparent 60%), #0b0f17",
        color: "rgba(255,255,255,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* ✅ 카드 + footer를 같이 감싸는 래퍼 */}
      <div style={{ width: "100%", maxWidth: 560 }}>
        {/* Title */}
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
            LMS 로그인
          </h1>
          <p style={{ marginTop: 8, marginBottom: 0, color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
            이메일로 로그인하거나, 처음이면 가입 후 로그인.
          </p>
        </div>

        {/* Card */}
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
          {/* Email */}
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
              EMAIL
            </label>
            <input
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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

          {/* Password */}
          <div style={{ marginTop: 14 }}>
            <label style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 8 }}>
              PASSWORD
            </label>
            <input
              placeholder="password"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
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

          {/* Buttons */}
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <button
              onClick={signIn}
              style={{
                flex: 1,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "linear-gradient(90deg, rgba(99,102,241,0.92), rgba(16,185,129,0.75))",
                color: "rgba(255,255,255,0.92)",
                borderRadius: 12,
                padding: "12px 12px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              로그인
            </button>

            <button
              onClick={signUp}
              style={{
                flex: 1,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.78)",
                borderRadius: 12,
                padding: "12px 12px",
                cursor: "pointer",
                fontWeight: 650,
              }}
            >
              가입
            </button>
          </div>

          {/* Hint */}
          <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            <div>• 가입 후 바로 로그인.</div>
            <div>• 로그인하면 역할에 따라 학생/선생 대시보드로 자동 이동.</div>
          </div>
        </div>

        {/* ✅ footer: 왼쪽 붙이기 */}
        <div style={{ marginTop: 14, color: "rgba(255,255,255,0.45)", fontSize: 12, textAlign: "left" }}>
          © awesomeeric · lms
        </div>
      </div>
    </div>
  );
}