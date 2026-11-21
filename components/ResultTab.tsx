"use client";

import type { Poll, PollOption } from "@/lib/types";

type Props = {
  poll: Poll;
  options: PollOption[];
  myVotes: string[] | null;
  isOwner: boolean;
  closed: boolean;
  totalVotes: number;
  maxVotes: number;
};

export default function ResultTab({ poll, options, myVotes, isOwner, closed, totalVotes, maxVotes }: Props) {
  // Plan SC: 마감 전 비방장은 잠금 화면
  if (!closed && !isOwner) {
    return (
      <div className="result-locked">
        <p className="lock-icon">🔒</p>
        <p>투표가 마감된 후 공개됩니다.</p>
        <p className="meta">{poll.closes_at ? "마감 시간이 되면 자동으로 공개돼요." : "방장이 마감하면 공개돼요."}</p>
      </div>
    );
  }

  return (
    <>
      <p className="meta">총 {poll.voter_count}명 참여 · {totalVotes}표</p>
      <ul className="options">
        {options.map((o) => {
          const pct = totalVotes ? Math.round((o.vote_count / totalVotes) * 100) : 0;
          const isTop = o.vote_count > 0 && o.vote_count === maxVotes;
          const isMine = myVotes?.includes(o.id);
          return (
            <li key={o.id}>
              <div className={`option result-option ${isTop ? "top" : ""}`}>
                <span className="bar" style={{ width: `${pct}%` }} />
                <span className="option-label">
                  {o.label}
                  {isMine && <span className="mine">내 선택</span>}
                </span>
                <span className="option-count">
                  {pct}% <small>({o.vote_count})</small>
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
