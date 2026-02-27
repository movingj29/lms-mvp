"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { getMyRole } from "../lib/getRole";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [status, setStatus] = useState("확인 중...");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        setStatus("로그인 필요 → /login으로 이동");
        router.replace("/login");
        return;
      }

      const role = await getMyRole();
      if (role === "teacher") {
        setStatus("선생 계정 → 대시보드로 이동");
        router.replace("/teacher/dashboard");
      } else {
        setStatus("학생 계정 → 강의 목록으로 이동");
        router.replace("/student/lectures");
      }
    })();
  }, [router]);

  return <div style={{ padding: 40 }}>{status}</div>;
}