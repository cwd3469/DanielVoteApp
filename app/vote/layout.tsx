// Design Ref: §2.3 — /vote/* 전용 레이아웃: 헤더/푸터 없음
export default function VoteLayout({ children }: { children: React.ReactNode }) {
  return <main className="vote-container">{children}</main>;
}
