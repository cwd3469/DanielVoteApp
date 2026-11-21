// Design Ref: §2.3 — 루트 레이아웃: <html><body> + AuthProvider만 (헤더 제거)
import type { Metadata } from "next";
import AuthProvider from "@/components/AuthProvider";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  title: "투표하자",
  description: "링크 하나로 만드는 실시간 투표",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {isSupabaseConfigured ? (
          <AuthProvider>{children}</AuthProvider>
        ) : (
          <div className="banner error">
            .env.local 에 NEXT_PUBLIC_SUPABASE_URL 과
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 를 설정한 뒤 개발 서버를 다시
            시작하세요.
          </div>
        )}
      </body>
    </html>
  );
}
