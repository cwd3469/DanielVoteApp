export type Poll = {
  id: string;
  title: string;
  description: string | null;
  allow_multiple: boolean;
  closes_at: string | null;
  voter_count: number;
  created_by: string;
  created_at: string;
};

export type PollOption = {
  id: string;
  poll_id: string;
  label: string;
  position: number;
  vote_count: number;
};

export function isClosed(poll: Pick<Poll, "closes_at">, now = Date.now()) {
  return poll.closes_at !== null && new Date(poll.closes_at).getTime() <= now;
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

/** Supabase/Postgres 에러를 사용자에게 보여줄 메시지로 변환 */
export function toMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return "알 수 없는 오류가 발생했습니다.";
}
