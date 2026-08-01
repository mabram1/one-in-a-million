-- One in a Million — authoritative multiplayer rooms (v2)
-- Apply in the Supabase SQL editor or `supabase db push`. NOT applied automatically.
--
-- Gives a SERVER-authoritative 10-player cap + start-lock that the client cannot
-- fake. Realtime Presence stays advisory for live positions; membership + capacity
-- + "has started" are decided here via SECURITY DEFINER RPCs under a row lock.

-- ---------- tables ----------
create table if not exists public.rooms (
  code         text primary key,
  kind         text not null check (kind in ('private','public')),
  host_id      text,                              -- client id of the private host (null for public)
  distance_m   int  not null default 600 check (distance_m in (400,600,800)),
  seed         bigint not null,
  status       text not null default 'open' check (status in ('open','started','closed')),
  start_at     timestamptz,
  max_players  int  not null default 10,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.room_members (
  room_code    text not null references public.rooms(code) on delete cascade,
  player_id    text not null,
  display_name text,
  joined_at    timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  primary key (room_code, player_id)
);
create index if not exists room_members_room_idx on public.room_members(room_code);

-- ---------- RLS: reads allowed (for Realtime), writes only via the RPCs ----------
alter table public.rooms        enable row level security;
alter table public.room_members enable row level security;

drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms for select using (true);
drop policy if exists members_read on public.room_members;
create policy members_read on public.room_members for select using (true);
-- (no insert/update/delete policies -> direct table writes are denied; use join_room/start_room)

-- ---------- atomic join ----------
-- Creates the room on first join, purges stale members, enforces the cap + start
-- lock under a row lock, and upserts this player. Returns { ok, reason?, room, members }.
create or replace function public.join_room(
  p_code text, p_player_id text, p_kind text,
  p_display_name text default null, p_distance_m int default 600,
  p_seed bigint default 0, p_host_id text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_room public.rooms; v_count int;
begin
  if coalesce(p_code,'') = '' or coalesce(p_player_id,'') = '' then
    return jsonb_build_object('ok', false, 'reason', 'bad_request');
  end if;

  insert into public.rooms(code, kind, seed, distance_m, host_id)
  values (p_code, p_kind, p_seed, coalesce(p_distance_m,600), p_host_id)
  on conflict (code) do nothing;

  select * into v_room from public.rooms where code = p_code for update;   -- serialize concurrent joins
  if v_room is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_room.status = 'started' then return jsonb_build_object('ok', false, 'reason', 'started'); end if;

  delete from public.room_members
   where room_code = p_code and player_id <> p_player_id and last_seen < now() - interval '30 seconds';

  select count(*) into v_count from public.room_members where room_code = p_code;
  if v_count >= v_room.max_players
     and not exists (select 1 from public.room_members where room_code = p_code and player_id = p_player_id) then
    return jsonb_build_object('ok', false, 'reason', 'full');
  end if;

  insert into public.room_members(room_code, player_id, display_name, last_seen)
  values (p_code, p_player_id, p_display_name, now())
  on conflict (room_code, player_id) do update set last_seen = now(), display_name = excluded.display_name;

  select count(*) into v_count from public.room_members where room_code = p_code;
  return jsonb_build_object('ok', true, 'room', to_jsonb(v_room), 'members', v_count);
end $$;

-- ---------- heartbeat (keep a member alive; lightweight) ----------
create or replace function public.touch_room_member(p_code text, p_player_id text)
returns void language sql security definer set search_path = public as $$
  update public.room_members set last_seen = now() where room_code = p_code and player_id = p_player_id;
$$;

-- ---------- start (private = host only; public = any joined member once the window opens) ----------
create or replace function public.start_room(p_code text, p_player_id text, p_start_at timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_room public.rooms;
begin
  select * into v_room from public.rooms where code = p_code for update;
  if v_room is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if v_room.status = 'started' then
    return jsonb_build_object('ok', true, 'already', true, 'start_at', v_room.start_at, 'seed', v_room.seed);
  end if;
  if v_room.kind = 'private' and v_room.host_id is distinct from p_player_id then
    return jsonb_build_object('ok', false, 'reason', 'not_host');
  end if;
  if not exists (select 1 from public.room_members where room_code = p_code) then
    return jsonb_build_object('ok', false, 'reason', 'empty');
  end if;
  update public.rooms set status = 'started', start_at = p_start_at, updated_at = now() where code = p_code;
  return jsonb_build_object('ok', true, 'start_at', p_start_at, 'seed', v_room.seed);
end $$;

-- ---------- leave + housekeeping ----------
create or replace function public.leave_room(p_code text, p_player_id text)
returns void language sql security definer set search_path = public as $$
  delete from public.room_members where room_code = p_code and player_id = p_player_id;
$$;

-- Sweep abandoned rooms (call from a scheduled Edge Function / pg_cron every minute).
create or replace function public.sweep_rooms()
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.room_members where last_seen < now() - interval '2 minutes';
  delete from public.rooms r
   where r.updated_at < now() - interval '10 minutes'
     and not exists (select 1 from public.room_members m where m.room_code = r.code);
end $$;

grant execute on function public.join_room(text,text,text,text,int,bigint,text) to anon, authenticated;
grant execute on function public.touch_room_member(text,text)                 to anon, authenticated;
grant execute on function public.start_room(text,text,timestamptz)            to anon, authenticated;
grant execute on function public.leave_room(text,text)                        to anon, authenticated;
-- sweep_rooms is intended for a trusted scheduler (pg_cron / Edge Function), not clients.
