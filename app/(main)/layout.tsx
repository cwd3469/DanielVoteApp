// Design Ref: §2.3 — 헤더 있는 (main) route group 레이아웃
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="logo">
            다니엘 투표
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="container">{children}</main>
    </>
  );
}
