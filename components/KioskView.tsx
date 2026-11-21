"use client";

// Design Ref: §3 — KioskView 독립 컴포넌트 (VoteView와 무관)
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabase/client";
import { isClosed, toMessage, type Poll, type PollOption } from "@/lib/types";

interface Props {
  initialPoll: Poll;
  initialOptions: PollOption[];
}

export default function KioskView({ initialPoll, initialOptions }: Props) {
  const { ready } = useAuth();
  const supabase = getBrowserClient();

  const [poll] = useState(initialPoll);
  const [options] = useState(initialOptions);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const closed = isClosed(poll, now);

  // Plan SC: SC-03 — 완료 후 카운트다운 → 세션 교체 → 리셋
  // Design Ref: §3 — resetSession: signOut → signInAnonymously → 상태 초기화
  const resetSession = useCallback(async () => {
    await supabase.auth.signOut();
    await supabase.auth.signInAnonymously();
    setSelected("");
    setBusy(false);
    setError(null);
    setDone(false);
  }, [supabase]);

  useEffect(() => {
    if (!done) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval);
          void resetSession();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [done, resetSession]);

  // Plan SC: SC-02 — 선택 → 제출 → 완료 화면
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
      setDone(true);
    }
  }

  const myOption = options.find((o) => o.id === selected);

  return (
    <div className="kiosk-page">
      <h1 className="kiosk-title">{poll.title}</h1>
      {poll.description && <p className="kiosk-desc">{poll.description}</p>}

      {/* Plan SC: SC-04 — 마감 메시지 */}
      {closed ? (
        <p className="kiosk-closed">마감된 투표입니다.</p>
      ) : done ? (
        /* Plan SC: SC-02, SC-03 — 완료 화면 + 카운트다운 */
        <div className="kiosk-done-wrap">
          <p className="kiosk-done">수고하셨습니다.</p>
          {myOption && (
            <div className="kiosk-my-pick">
              <span className="mine">내 선택</span>
              {myOption.label}
            </div>
          )}
          <p className="kiosk-countdown">{countdown}</p>
          <p className="kiosk-countdown-label">초 후 초기화됩니다</p>
        </div>
      ) : (
        /* Plan SC: SC-01 — 투표 UI */
        <>
          <ul className="kiosk-options">
            {options.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  className={`kiosk-option ${selected === o.id ? "selected" : ""}`}
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
            className="btn btn-primary kiosk-submit"
            disabled={!selected || busy || !ready}
            onClick={submit}
          >
            {busy ? "제출 중…" : "투표하기"}
          </button>
          {error && <p className="kiosk-error">{error}</p>}
        </>
      )}
    </div>
  );
}
