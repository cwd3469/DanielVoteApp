import { notFound } from "next/navigation";
import PollView from "@/components/PollView";
import { getServerClient } from "@/lib/supabase/server";
import type { Poll, PollOption } from "@/lib/types";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function PollPage({
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

  const { data: options } = await supabase
    .from("poll_options")
    .select("*")
    .eq("poll_id", id)
    .order("position")
    .returns<PollOption[]>();

  if (!poll) notFound();

  return <PollView initialPoll={poll} initialOptions={options ?? []} />;
}
