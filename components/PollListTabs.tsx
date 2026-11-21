"use client";

// Design Ref: §3.2 — SSR props 전달 + useState 클라이언트 필터링 (Option C)
import { useState } from "react";
import Link from "next/link";
import { formatDate, isClosed, type Poll } from "@/lib/types";

type Tab = "open" | "closed";

interface Props {
  polls: Poll[];
}

export default function PollListTabs({ polls }: Props) {
  const [tab, setTab] = useState<Tab>("open");

  // Plan SC: FR-02 — isClosed 유틸로 진행중/마감 구분
  const openPolls = polls.filter((p) => !isClosed(p));
  const closedPolls = polls.filter((p) => isClosed(p));
  const filtered = tab === "open" ? openPolls : closedPolls;

  return (
    <div>
      {/* Plan SC: FR-02, FR-03, FR-07 — 탭 헤더 + 카운트 뱃지 */}
      <div className="tab-bar" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "open"}
          className={`tab ${tab === "open" ? "tab-active" : ""}`}
          onClick={() => setTab("open")}
        >
          진행중 <span className="tab-count">{openPolls.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "closed"}
          className={`tab ${tab === "closed" ? "tab-active" : ""}`}
          onClick={() => setTab("closed")}
        >
          마감 <span className="tab-count">{closedPolls.length}</span>
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          <p>
            {tab === "open"
              ? "진행 중인 투표가 없어요."
              : "마감된 투표가 없어요."}
          </p>
        </div>
      ) : (
        <ul className="poll-list">
          {filtered.map((poll, index) => {
            const closed = isClosed(poll);
            const link =
              tab === "open"
                ? `/polls/${poll.id}`
                : `/polls/${poll.id}/results`;

            return (
              <li key={poll.id}>
                <Link href={link} className="card poll-card">
                  <div className="poll-card-top">
                    <span
                      className={`badge ${closed ? "badge-closed" : "badge-open"}`}
                    >
                      {closed ? "마감" : "진행 중"}
                    </span>
                    {poll.allow_multiple && (
                      <span className="badge">복수 선택</span>
                    )}
                  </div>
                  <h2>{poll.title}</h2>
                  <p className="meta">
                    {poll.voter_count}명 참여 · {formatDate(poll.created_at)}
                    {poll.closes_at &&
                      !closed &&
                      ` · ${formatDate(poll.closes_at)} 마감`}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
