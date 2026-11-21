// Design Ref: §3.1 — Server Component, 전체 polls SSR fetch → PollListTabs에 props 전달
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import PollListTabs from "@/components/PollListTabs";
import type { Poll } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PollsPage() {
  const supabase = await getServerClient();

  const { data: polls, error } = await supabase
    .from("polls")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Poll[]>();

  if (error)
    return (
      <div className="banner error">
        목록을 불러오지 못했습니다: {error.message}
      </div>
    );

  return (
    <section>
      {/* Plan SC: FR-01 — /polls 라우트 투표목록 */}
      <div className="page-header">
        <h1 className="page-title">투표 목록</h1>
        <Link href="/polls/new" className="btn btn-primary btn-sm">
          새 투표
        </Link>
      </div>
      <PollListTabs polls={polls ?? []} />
    </section>
  );
}
