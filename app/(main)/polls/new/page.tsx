"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getBrowserClient } from "@/lib/supabase/client";
import { toMessage } from "@/lib/types";

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 10;

export default function NewPollPage() {
  const router = useRouter();
  const { ready, userId } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [closesAt, setClosesAt] = useState(""); // datetime-local 값 (브라우저 로컬 시간)
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const hasDuplicate = new Set(filled).size !== filled.length;
  const canSubmit =
    ready && !!userId && title.trim().length > 0 && filled.length >= MIN_OPTIONS && !hasDuplicate;

  const updateOption = (i: number, value: string) =>
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const { data, error } = await getBrowserClient().rpc("create_poll", {
      p_title: title,
      p_options: filled,
      p_description: description || null,
      p_allow_multiple: allowMultiple,
      p_closes_at: closesAt ? new Date(closesAt).toISOString() : null,
    });

    if (error) {
      setError(toMessage(error));
      setSubmitting(false);
      return;
    }
    router.push(`/polls/${data as string}`);
    router.refresh();
  }

  return (
    <section>
      <h1 className="page-title">새 투표 만들기</h1>
      <form className="card form" onSubmit={handleSubmit}>
        <label className="field">
          <span>질문</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예) 이번 주 회식 메뉴는?"
            maxLength={200}
            required
          />
        </label>

        <label className="field">
          <span>설명 (선택)</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            maxLength={1000}
          />
        </label>

        <fieldset className="field">
          <span>선택지</span>
          {options.map((opt, i) => (
            <div key={i} className="option-row">
              <input
                value={opt}
                onChange={(e) => updateOption(i, e.target.value)}
                placeholder={`선택지 ${i + 1}`}
                maxLength={100}
              />
              {options.length > MIN_OPTIONS && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-label={`선택지 ${i + 1} 삭제`}
                  onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {options.length < MAX_OPTIONS && (
            <button
              type="button"
              className="btn btn-ghost add-option"
              onClick={() => setOptions((prev) => [...prev, ""])}
            >
              + 선택지 추가
            </button>
          )}
          {hasDuplicate && <p className="hint error-text">중복된 선택지가 있어요.</p>}
        </fieldset>

        <label className="checkbox">
          <input
            type="checkbox"
            checked={allowMultiple}
            onChange={(e) => setAllowMultiple(e.target.checked)}
          />
          복수 선택 허용
        </label>

        <label className="field">
          <span>마감 시간 (선택)</span>
          <input
            type="datetime-local"
            value={closesAt}
            onChange={(e) => setClosesAt(e.target.value)}
          />
        </label>

        {error && <div className="banner error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-block" disabled={!canSubmit || submitting}>
          {submitting ? "만드는 중…" : "투표 만들기"}
        </button>
      </form>
    </section>
  );
}
