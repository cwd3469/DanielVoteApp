"use client";

// Design Ref: §2.4 — VoteView 독립 컴포넌트 (PollView와 무관)
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabase/client";
import { isClosed, toMessage, type Poll, type PollOption } from "@/lib/types";

interface Props {
  initialPoll: Poll;
  initialOptions: PollOption[];
}

export default function VoteView({ initialPoll, initialOptions }: Props) {
  const { userId, ready } = useAuth();
  const supabase = getBrowserClient();

  const [poll] = useState(initialPoll);
  const [options, setOptions] = useState(initialOptions);
  const [myVotes, setMyVotes] = useState<string[] | null>(null); // null = 로딩중
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const closed = isClosed(poll, now);

  // Plan SC: FR-04 — 내 투표 조회
  useEffect(() => {
    if (!ready || !userId) return;
    supabase
      .from("votes")
      .select("option_id")
      .eq("poll_id", poll.id)
      .eq("user_id", userId)
      .then(({ data }) => {
        setMyVotes((data ?? []).map((v) => v.option_id as string));
      });
  }, [ready, userId, supabase, poll.id]);

  const refetchOptions = useCallback(async () => {
    const { data } = await supabase
      .from("poll_options")
      .select("*")
      .eq("poll_id", poll.id)
      .order("position");
    if (data) setOptions(data as PollOption[]);
  }, [supabase, poll.id]);

  // Plan SC: FR-03 — 투표 제출
  async function submit() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc("cast_vote", {
      p_poll_id: poll.id,
      p_option_ids: [selected],
    });
    setBusy(false);
    if (error) {
      setError(toMessage(error));
    } else {
      setMyVotes([selected]);
      void refetchOptions();
    }
  }

  const hasVoted = (myVotes?.length ?? 0) > 0;

  return (
    <div className="vote-page">
      <h1 className="vote-title">{poll.title}</h1>
      {poll.description && <p className="vote-desc">{poll.description}</p>}

      {/* Plan SC: FR-05 — 마감 메시지 */}
      {closed ? (
        <p className="vote-closed">마감된 투표입니다.</p>
      ) : myVotes === null ? (
        // Design Ref: §2.4 — myVotes === null 로딩 중
        <p className="vote-loading">잠시만요…</p>
      ) : hasVoted ? (
        /* Plan SC: FR-04 — 이미 투표 → 감사 메시지 + 내 선택만 표시 */
        <div className="vote-done-wrap">
          <p className="vote-done">수고하셨습니다.</p>
          {options.filter((o) => myVotes?.includes(o.id)).map((o) => (
            <div key={o.id} className="vote-my-pick">
              <span className="mine">내 선택</span>
              {o.label}
            </div>
          ))}
        </div>
      ) : (
        /* Plan SC: FR-01, FR-03 — 투표 UI */
        <>
          <ul className="vote-options">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={`vote-option ${selected === o.id ? "selected" : ""}`}
                  onClick={() => setSelected(o.id)}
                  disabled={!ready || busy}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn btn-primary btn-block vote-submit"
            disabled={!selected || busy || !ready}
            onClick={submit}
          >
            {busy ? "제출 중…" : "투표하기"}
          </button>
          {error && <p className="vote-error">{error}</p>}
        </>
      )}
    </div>
  );
}
