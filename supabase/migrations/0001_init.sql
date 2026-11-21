-- =========================================================
-- 투표 웹앱 스키마
-- Supabase 대시보드 > SQL Editor 에 통째로 붙여넣고 Run 하세요.
-- =========================================================

-- 1) 테이블 ------------------------------------------------

create table public.polls (
  id             uuid primary key default gen_random_uuid(),
  title          text not null check (char_length(trim(title)) between 1 and 200),
  description    text check (description is null or char_length(description) <= 1000),
  allow_multiple boolean not null default false,
  closes_at      timestamptz,
  voter_count    integer not null default 0,
  created_by     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at     timestamptz not null default now()
);

create table public.poll_options (
  id         uuid primary key default gen_random_uuid(),
  poll_id    uuid not null references public.polls (id) on delete cascade,
  label      text not null check (char_length(trim(label)) between 1 and 100),
  position   smallint not null,
  vote_count integer not null default 0,
  unique (poll_id, position)
);

create table public.votes (
  id         bigint generated always as identity primary key,
  poll_id    uuid not null references public.polls (id) on delete cascade,
  option_id  uuid not null references public.poll_options (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (option_id, user_id)
);

create index polls_created_at_idx on public.polls (created_at desc);
create index poll_options_poll_id_idx on public.poll_options (poll_id);
create index votes_poll_user_idx on public.votes (poll_id, user_id);

-- 2) 득표수 자동 집계 트리거 --------------------------------
-- 매번 COUNT(*) 하지 않고 poll_options.vote_count 를 증감시킵니다.
-- (Realtime 으로 이 컬럼 변경만 구독하면 결과가 실시간 반영됨)

create or replace function public.tg_votes_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update public.poll_options set vote_count = vote_count + 1 where id = new.option_id;
    return null;
  end if;

  -- 투표/선택지 삭제에 따른 CASCADE 삭제일 땐 집계할 필요 없음
  if pg_trigger_depth() > 1 then
    return null;
  end if;

  update public.poll_options set vote_count = greatest(vote_count - 1, 0) where id = old.option_id;
  return null;
end;
$$;

create trigger votes_count
after insert or delete on public.votes
for each row execute function public.tg_votes_count();

-- 3) RPC: 투표 생성 (투표 + 선택지를 한 트랜잭션으로) -------

create or replace function public.create_poll(
  p_title          text,
  p_options        text[],
  p_description    text default null,
  p_allow_multiple boolean default false,
  p_closes_at      timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_poll_id uuid;
  v_labels  text[];
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  -- 공백 제거 + 빈 값 제거 + 중복 제거(입력 순서 유지)
  select array_agg(label order by first_pos)
    into v_labels
    from (
      select trim(o) as label, min(ord) as first_pos
        from unnest(p_options) with ordinality as t(o, ord)
       where trim(o) <> ''
       group by trim(o)
    ) s;

  if coalesce(cardinality(v_labels), 0) < 2 then
    raise exception '선택지는 서로 다른 값으로 2개 이상 필요합니다.' using errcode = '22023';
  end if;
  if cardinality(v_labels) > 10 then
    raise exception '선택지는 최대 10개까지 가능합니다.' using errcode = '22023';
  end if;
  if p_closes_at is not null and p_closes_at <= now() then
    raise exception '마감 시간은 현재보다 이후여야 합니다.' using errcode = '22023';
  end if;

  insert into public.polls (title, description, allow_multiple, closes_at, created_by)
  values (trim(p_title), nullif(trim(p_description), ''), p_allow_multiple, p_closes_at, v_uid)
  returning id into v_poll_id;

  insert into public.poll_options (poll_id, label, position)
  select v_poll_id, l, (ord - 1)::smallint
    from unnest(v_labels) with ordinality as t(l, ord);

  return v_poll_id;
end;
$$;

-- 4) RPC: 투표하기 / 표 바꾸기 / 취소하기 -----------------
-- p_option_ids 가 빈 배열이면 내 표를 취소합니다.

create or replace function public.cast_vote(p_poll_id uuid, p_option_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid      uuid := auth.uid();
  v_poll     public.polls%rowtype;
  v_ids      uuid[];
  v_valid    integer;
  v_had_vote boolean;
begin
  if v_uid is null then
    raise exception '로그인이 필요합니다.' using errcode = '28000';
  end if;

  -- 같은 투표에 대한 동시 요청을 직렬화 (voter_count 정합성)
  select * into v_poll from public.polls where id = p_poll_id for update;
  if not found then
    raise exception '존재하지 않는 투표입니다.' using errcode = 'P0002';
  end if;
  if v_poll.closes_at is not null and v_poll.closes_at <= now() then
    raise exception '마감된 투표입니다.' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(p_option_ids) as x;

  if not v_poll.allow_multiple and cardinality(v_ids) > 1 then
    raise exception '이 투표는 하나만 선택할 수 있습니다.' using errcode = '22023';
  end if;

  select count(*) into v_valid
    from public.poll_options
   where poll_id = p_poll_id and id = any (v_ids);
  if v_valid <> cardinality(v_ids) then
    raise exception '잘못된 선택지입니다.' using errcode = '22023';
  end if;

  select exists (select 1 from public.votes where poll_id = p_poll_id and user_id = v_uid)
    into v_had_vote;

  delete from public.votes where poll_id = p_poll_id and user_id = v_uid;

  insert into public.votes (poll_id, option_id, user_id)
  select p_poll_id, x, v_uid from unnest(v_ids) as x;

  if v_had_vote and cardinality(v_ids) = 0 then
    update public.polls set voter_count = greatest(voter_count - 1, 0) where id = p_poll_id;
  elsif not v_had_vote and cardinality(v_ids) > 0 then
    update public.polls set voter_count = voter_count + 1 where id = p_poll_id;
  end if;
end;
$$;

-- 5) 권한 & RLS ---------------------------------------------
-- 쓰기는 전부 RPC 로만. 테이블 직접 쓰기는 막습니다.

alter table public.polls        enable row level security;
alter table public.poll_options enable row level security;
alter table public.votes        enable row level security;

revoke all on public.polls, public.poll_options, public.votes from anon, authenticated;

grant select on public.polls, public.poll_options to anon, authenticated;
grant select on public.votes to authenticated;
grant update (closes_at) on public.polls to authenticated; -- 작성자가 '지금 마감' 할 때만
grant delete on public.polls to authenticated;

create policy "polls: 누구나 조회" on public.polls
  for select using (true);
create policy "polls: 작성자만 수정" on public.polls
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
create policy "polls: 작성자만 삭제" on public.polls
  for delete to authenticated
  using (created_by = (select auth.uid()));

create policy "options: 누구나 조회" on public.poll_options
  for select using (true);

-- 누가 무엇에 투표했는지는 본인 것만 보입니다(비밀투표).
create policy "votes: 내 표만 조회" on public.votes
  for select to authenticated
  using (user_id = (select auth.uid()));

revoke execute on function public.create_poll(text, text[], text, boolean, timestamptz) from public, anon;
revoke execute on function public.cast_vote(uuid, uuid[]) from public, anon;
revoke execute on function public.tg_votes_count() from public, anon, authenticated;
grant execute on function public.create_poll(text, text[], text, boolean, timestamptz) to authenticated;
grant execute on function public.cast_vote(uuid, uuid[]) to authenticated;

-- 6) Realtime -----------------------------------------------
-- 득표수(poll_options)와 참여자 수/마감(polls) 변경을 브라우저로 푸시

alter publication supabase_realtime add table public.polls, public.poll_options;
