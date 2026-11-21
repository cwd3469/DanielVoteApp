// Design Ref: §2.5 — 투표 전용 Server Component
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerClient } from "@/lib/supabase/server";
import VoteView from "@/components/VoteView";
import type { Poll, PollOption } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await getServerClient();
  const { data: poll } = await supabase
    .from("polls")
    .select("title, description")
    .eq("id", id)
    .maybeSingle();

  if (!poll) return { title: "투표하자" };

  const description = poll.description ?? `${poll.title}에 투표해 주세요`;
  return {
    title: `${poll.title} | 투표하자`,
    description,
    openGraph: {
      title: poll.title,
      description,
    },
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function VotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();

  const supabase = await getServerClient();

  const { data: poll } = await supabase
    .from("polls")
    .select("*")
    .eq("id", id)
    .maybeSingle<Poll>();

  if (!poll) notFound();

  const { data: options } = await supabase
    .from("poll_options")
    .select("*")
    .eq("poll_id", id)
    .order("position")
    .returns<PollOption[]>();

  return <VoteView initialPoll={poll} initialOptions={options ?? []} />;
}
