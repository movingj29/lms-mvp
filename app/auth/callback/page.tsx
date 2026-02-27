"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState<string>("이메일 인증 처리 중...");

  useEffect(() => {
    (async () => {
      try {
        // Supabase가 링크에 붙여주는 code를 세션으로 교환
        const code = new URLSearchParams(window.location.search).get("code");
        if (!code) {
          setStatus("error");
          setMsg("인증 코드가 없어요. 이메일 링크를 다시 눌러줘.");
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("error");
          setMsg(error.message);
          return;
        }

        setStatus("ok");
        setMsg("인증 완료! 로그인화면으로 돌아가세요.");
      } catch (e: any) {
        setStatus("error");
        setMsg(e?.message ?? "알 수 없는 오류가 발생했어요.");
      }
    })();
  }, []);

  const cardTitle =
    status === "loading" ? "인증 처리 중" : status === "ok" ? "인증 완료!" : "인증 실패";

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        background:
          "radial-gradient(1200px 600px at 10% 0%, rgba(99,102,241,0.22), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(16,185,129,0.18), transparent 60%), #0b0f17",
        color: "rgba(255,255,255,0.92)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460 }}>
        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
          {cardTitle}
        </h1>
        <p style={{ marginTop: 8, marginBottom: 16, color: "rgba(255,255,255,0.65)", fontSize: 14 }}>
          {msg}
        </p>

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
          {status === "ok" ? (
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => router.replace("/login")}
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
                로그인으로 이동
              </button>
              <button
                onClick={() => router.replace("/student/lectures")}
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
                바로 들어가기
              </button>
            </div>
          ) : (
            <button
              onClick={() => router.replace("/login")}
              style={{
                width: "100%",
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.78)",
                borderRadius: 12,
                padding: "12px 12px",
                cursor: "pointer",
                fontWeight: 650,
              }}
            >
              로그인 페이지로
            </button>
          )}

          <div style={{ marginTop: 14, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            <div>• 이메일 링크가 만료시 재가입/재발송 요망.</div>
            <div>• 계속 다른 페이지로 튀면 Supabase Redirect URL 설정을 확인.</div>
          </div>
        </div>
      </div>
    </div>
  );
}