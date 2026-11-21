"use client";

import { useState, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setBusy(false);

    if (res.ok) {
      const from = searchParams.get("from") ?? "/polls";
      router.replace(from);
    } else {
      const data = await res.json();
      setError(data.error ?? "오류가 발생했습니다");
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <span>비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 입력하세요"
          autoFocus
          required
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      <button
        type="submit"
        className="btn btn-primary btn-block"
        disabled={busy || !password}
      >
        {busy ? "확인 중…" : "로그인"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1 className="login-title">다니엘 투표</h1>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
