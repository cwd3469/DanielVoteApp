// Design Ref: §3.4 — 결과 페이지 UI 개선 (접근 로직 완전 유지)
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerClient } from "@/lib/supabase/server";
import { formatDate, isClosed, type Poll, type PollOption } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .maybeSingle<Poll>();

  if (!poll) notFound();

  // Plan SC: 결과 페이지 방장 전용 접근 유지
  if (!user || user.id !== poll.created_by) {
    redirect(`/polls/${id}`);
  }

  const { data: options } = await supabase
    .from("poll_options")
    .select("*")
    .eq("poll_id", id)
    .order("position")
    .returns<PollOption[]>();

  const optionList = options ?? [];
  const totalVotes = optionList.reduce((sum, o) => sum + o.vote_count, 0);
  const maxVotes = Math.max(0, ...optionList.map((o) => o.vote_count));
  const closed = isClosed(poll, Date.now());

  // 순위 계산: vote_count 내림차순 정렬 후 순위 매핑
  const ranked = [...optionList]
    .sort((a, b) => b.vote_count - a.vote_count)
    .map((o, i) => ({ id: o.id, rank: i }));
  const rankMap = new Map(ranked.map((r) => [r.id, r.rank]));

  return (
    <main className="container">
      <section className="card">
        <div className="poll-card-top">
          <span className={`badge ${closed ? "badge-closed" : "badge-open"}`}>
            {closed ? "마감" : "진행 중"}
          </span>
          <span className="badge">결과 (방장 전용)</span>
        </div>

        <h1 className="poll-title">{poll.title}</h1>
        {poll.description && <p className="poll-desc">{poll.description}</p>}
        {poll.closes_at && (
          <p className="meta">
            {closed
              ? `${formatDate(poll.closes_at)} 마감됨`
              : `${formatDate(poll.closes_at)} 마감`}
          </p>
        )}

        {/* Plan SC: FR-06 — 총 참여자/득표 요약 카드 */}
        <div className="result-summary">
          <div>
            <strong>{poll.voter_count}명</strong>
            참여자
          </div>
          <div>
            <strong>{totalVotes}표</strong>총 득표
          </div>
          {optionList.length > 0 && totalVotes > 0 && (
            <div>
              <strong>
                {optionList.find((o) => o.vote_count === maxVotes)?.label ??
                  "-"}
              </strong>
              1위 선택지
            </div>
          )}
        </div>

        {totalVotes === 0 ? (
          <p
            className="meta"
            style={{ textAlign: "center", padding: "20px 0" }}
          >
            아직 투표가 없어요.
          </p>
        ) : (
          <ul className="options" style={{ marginTop: 8 }}>
            {optionList.map((o) => {
              const pct = totalVotes
                ? Math.round((o.vote_count / totalVotes) * 100)
                : 0;
              const isTop = o.vote_count > 0 && o.vote_count === maxVotes;
              const rank = rankMap.get(o.id) ?? 99;
              return (
                <li key={o.id}>
                  <div className={`option result-option ${isTop ? "top" : ""}`}>
                    <span className="bar" style={{ width: `${pct}%` }} />
                    <span className="option-label">
                      {/* Plan SC: FR-05 — 순위 메달 표시 */}
                      {o.vote_count > 0 && rank < 3 && (
                        <span className="rank-medal">{MEDALS[rank]}</span>
                      )}
                      {o.label}
                    </span>
                    <span className="option-count">
                      {pct}% <small>({o.vote_count})</small>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* <div className="actions" style={{ marginTop: 8 }}>
          <Link href={`/polls/${id}`} className="btn btn-ghost btn-sm">
            ← 투표로 돌아가기
          </Link>
        </div> */}
      </section>
    </main>
  );
}
