"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabase/client";
import {
  formatDate,
  isClosed,
  toMessage,
  type Poll,
  type PollOption,
} from "@/lib/types";

type Props = { initialPoll: Poll; initialOptions: PollOption[] };

export default function PollView({ initialPoll, initialOptions }: Props) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const { userId } = useAuth();

  const [poll, setPoll] = useState(initialPoll);
  const [options, setOptions] = useState(initialOptions);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const closed = isClosed(poll, now);
  const isOwner = userId === poll.created_by;

  // 마감 시간이 지나면 자동으로 '마감' 상태로
  useEffect(() => {
    if (!poll.closes_at || closed) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [poll.closes_at, closed]);

  const refetch = useCallback(async () => {
    const [{ data: p }, { data: opts }] = await Promise.all([
      supabase.from("polls").select("*").eq("id", poll.id).maybeSingle<Poll>(),
      supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", poll.id)
        .order("position"),
    ]);
    if (p) setPoll(p);
    if (opts) setOptions(opts as PollOption[]);
  }, [supabase, poll.id]);

  useEffect(() => {
    const channel = supabase
      .channel(`poll:${poll.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "poll_options",
          filter: `poll_id=eq.${poll.id}`,
        },
        (payload) => {
          const updated = payload.new as PollOption;
          setOptions((prev) =>
            prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "polls",
          filter: `id=eq.${poll.id}`,
        },
        (payload) => setPoll((prev) => ({ ...prev, ...(payload.new as Poll) })),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void refetch();
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, poll.id, refetch]);

  async function closeNow() {
    if (!confirm("지금 투표를 마감할까요? 마감 후에는 투표할 수 없어요."))
      return;
    const { error } = await supabase
      .from("polls")
      .update({ closes_at: new Date().toISOString() })
      .eq("id", poll.id);
    if (error) setError(toMessage(error));
    else {
      setNow(Date.now());
      void refetch();
    }
  }

  async function deletePoll() {
    if (
      !confirm("투표를 삭제할까요? 모든 표가 함께 삭제되며 되돌릴 수 없어요.")
    )
      return;
    const { error } = await supabase.from("polls").delete().eq("id", poll.id);
    if (error) {
      setError(toMessage(error));
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function copyLink() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/vote/${poll.id}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function copyLinkKiosk() {
    await navigator.clipboard.writeText(
      `${window.location.origin}/kiosk/${poll.id}`,
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <section className="card poll">
        <div className="poll-card-top">
          <span className={`badge ${closed ? "badge-closed" : "badge-open"}`}>
            {closed ? "마감" : "진행 중"}
          </span>
          <span className="badge">
            {poll.allow_multiple ? "복수 선택" : "단일 선택"}
          </span>
          <span className="live-dot" title="실시간 반영 중">
            LIVE
          </span>
        </div>

        <h1 className="poll-title">{poll.title}</h1>
        {poll.description && <p className="poll-desc">{poll.description}</p>}
        <p className="meta" suppressHydrationWarning>
          {poll.voter_count}명 참여
          {poll.closes_at &&
            ` · ${formatDate(poll.closes_at)} ${closed ? "마감됨" : "마감"}`}
        </p>

        {error && <div className="banner error">{error}</div>}

        <ul className="options">
          {options.map((o) => (
            <li key={o.id}>
              <button type="button" className="option result-option" disabled>
                <span className="option-label">{o.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn btn-ghost" onClick={copyLink}>
            {copied ? "복사됨!" : "링크 복사"}
          </button>
        </div>

        {isOwner && (
          <div className="owner-actions">
            <span className="meta">내가 만든 투표</span>
            <button className="btn btn-ghost" onClick={copyLinkKiosk}>
              KIOSK
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowQR(true)}
            >
              QR 코드
            </button>
            {closed && (
              <Link
                href={`/polls/${poll.id}/results`}
                className="btn btn-ghost btn-sm"
              >
                결과 보기
              </Link>
            )}
            {!closed && (
              <button className="btn btn-ghost btn-sm" onClick={closeNow}>
                지금 마감
              </button>
            )}
            <button className="btn btn-danger btn-sm" onClick={deletePoll}>
              삭제
            </button>
          </div>
        )}
      </section>

      {showQR && (
        <div className="qr-modal-backdrop" onClick={() => setShowQR(false)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <p className="qr-modal-title">참여자용 투표 링크</p>
            <div className="qr-modal-code">
              <QRCodeSVG
                value={`${window.location.origin}/vote/${poll.id}`}
                size={240}
              />
            </div>
            {/* <p className="qr-modal-url">{`${window.location.origin}/vote/${poll.id}`}</p> */}
            <button
              className="btn btn-ghost qr-modal-close"
              onClick={() => setShowQR(false)}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}
