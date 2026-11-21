"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";

type AuthState = {
  userId: string | null;
  ready: boolean;
  error: string | null;
};

const AuthContext = createContext<AuthState>({ userId: null, ready: false, error: null });

export const useAuth = () => useContext(AuthContext);

/**
 * 방문자에게 회원가입 없이 익명 계정을 발급합니다.
 * 같은 브라우저(쿠키)면 같은 사용자로 인식 → 1인 1표.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ userId: null, ready: false, error: null });

  useEffect(() => {
    const supabase = getBrowserClient();
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) setState({ userId: data.session.user.id, ready: true, error: null });
        return;
      }
      const { data: signIn, error } = await supabase.auth.signInAnonymously();
      if (cancelled) return;
      setState({
        userId: signIn.user?.id ?? null,
        ready: true,
        error: error
          ? `익명 로그인 실패: ${error.message} (Supabase에서 Anonymous Sign-ins를 켰는지 확인하세요)`
          : null,
      });
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setState((s) => ({ ...s, userId: session.user.id, ready: true }));
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={state}>
      {state.error && <div className="banner error">{state.error}</div>}
      {children}
    </AuthContext.Provider>
  );
}
