-- Tendo — initial schema (PRD v1.1). Supabase / Postgres 15+.
-- Personal data is owner-only. Group data is visible to active members. Privacy rules live in RLS.

create extension if not exists citext;

-- ── Enums ────────────────────────────────────────────────────────────────────
create type category        as enum ('Body', 'Mind', 'Focus', 'Craft', 'Chores', 'Other');
create type track_type      as enum ('simple', 'amount', 'duration', 'weekly');
create type time_of_day     as enum ('morning', 'afternoon', 'evening', 'any');
create type lifecycle       as enum ('active', 'paused', 'archived');
create type entry_state     as enum ('pending', 'done', 'skipped');
create type item_outcome    as enum ('completed', 'partial', 'missed');
create type day_status      as enum ('scored', 'empty', 'recovery');
create type mood            as enum ('Rough', 'Low', 'Okay', 'Good', 'Great');
create type tone            as enum ('Gentle', 'Balanced', 'Push me');
create type theme_name      as enum ('warm', 'black');
create type score_audience  as enum ('only_me', 'friends', 'groups');
create type names_audience  as enum ('private', 'friends', 'groups');
create type nudge_scope     as enum ('friends', 'groups', 'off');
create type group_role      as enum ('owner', 'admin', 'member');
create type membership      as enum ('active', 'inactive', 'left');
create type request_state   as enum ('pending', 'accepted', 'declined', 'cancelled');

-- ── Profiles & settings ──────────────────────────────────────────────────────
create table profiles (
  id                  uuid primary key references auth.users on delete cascade,
  display_name        text not null check (char_length(display_name) between 1 and 60),
  username            citext unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  username_changed_at timestamptz,
  age_confirmed       boolean not null default false,
  status              text check (char_length(status) <= 60),
  started_on          date not null default current_date,
  timezone            text not null default 'UTC',
  day_end             text not null default 'Midnight' check (day_end in ('11:00 PM','Midnight','1:00 AM','2:00 AM','3:00 AM','Custom')),
  day_end_custom      time,
  success_threshold   smallint not null default 80 check (success_threshold in (70, 80, 90, 100)),
  tone                tone not null default 'Balanced',
  theme               theme_name not null default 'warm',
  deactivated_at      timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Usernames change at most once every 30 days (PRD §20).
create function enforce_username_cooldown() returns trigger language plpgsql as $$
begin
  if new.username is distinct from old.username and old.username is not null then
    if old.username_changed_at is not null and old.username_changed_at > now() - interval '30 days' then
      raise exception 'username_cooldown' using hint = 'Usernames can change once every 30 days.';
    end if;
    new.username_changed_at := now();
  end if;
  return new;
end $$;
create trigger profiles_username_cooldown before update on profiles for each row execute function enforce_username_cooldown();

-- Privacy-first defaults (PRD §24).
create table privacy_settings (
  user_id          uuid primary key references profiles on delete cascade,
  score_visibility score_audience not null default 'only_me',
  names_visibility names_audience not null default 'private',
  streak_visible   boolean not null default false,
  nudges_from      nudge_scope not null default 'friends',
  updated_at       timestamptz not null default now()
);

create table notification_prefs (
  user_id          uuid primary key references profiles on delete cascade,
  morning_overview boolean not null default true,
  weekly_review    boolean not null default true,
  evening_checkin  boolean not null default false,
  last_call        boolean not null default false,
  friend_requests  boolean not null default false,
  group_invites    boolean not null default false,
  group_nudges     boolean not null default false,
  group_challenges boolean not null default false,
  group_recap      boolean not null default false,
  marketing_email  boolean not null default false,
  morning_time     time not null default '07:00',
  evening_time     time not null default '20:30'
);

-- ── Personal commitments ─────────────────────────────────────────────────────
create table commitments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles on delete cascade,
  name            text not null check (char_length(name) between 1 and 60),
  category        category not null,
  track           track_type not null,
  target          numeric check (target is null or target > 0),
  unit            text check (char_length(unit) <= 14),
  time_of_day     time_of_day not null default 'any',
  why             text check (char_length(why) <= 90),
  lifecycle       lifecycle not null default 'active',
  paused_until    date,
  created_on      date not null,
  sort_order      integer not null default 0,
  weight          numeric(2,1) not null default 1.0 check (weight between 1.0 and 2.0),
  first_record_on date,
  reminder_time   time,
  version         integer not null default 1,
  updated_at      timestamptz not null default now(),
  check ((track = 'simple') = (target is null))
);
create index commitments_user on commitments (user_id) where lifecycle <> 'archived';

-- Tracking type locks after the first record (PRD §12).
create function lock_track_type() returns trigger language plpgsql as $$
begin
  if old.first_record_on is not null and (new.track <> old.track) then
    raise exception 'track_locked';
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end $$;
create trigger commitments_lock before update on commitments for each row execute function lock_track_type();

-- Schedule versions: an edit adds a row effective from the edit date; past days keep theirs.
create table commitment_schedules (
  commitment_id  uuid not null references commitments on delete cascade,
  effective_from date not null,
  pattern        jsonb not null,   -- {"kind":"daily"} | {"kind":"days","days":[0,2,4]} | {"kind":"perWeek","times":3} | {"kind":"interval","every":2} …
  start_date     date not null,
  end_date       date check (end_date is null or end_date >= start_date),
  primary key (commitment_id, effective_from)
);

-- ── Days ─────────────────────────────────────────────────────────────────────
create table days (
  user_id            uuid not null references profiles on delete cascade,
  date               date not null,
  timezone           text not null,
  mood               mood,
  mood_edited        boolean not null default false,
  checkin_done       boolean not null default false,
  priority_id        uuid references commitments on delete set null,
  recovery           boolean not null default false,
  closed_at          timestamptz,
  status             day_status,
  score              smallint check (score between 0 and 100),
  earned             numeric,
  possible           integer,
  success            boolean,
  edited_after_close boolean not null default false,
  primary key (user_id, date),
  check (status is distinct from 'recovery' or score is null)
);

create table day_entries (
  user_id       uuid not null,
  date          date not null,
  commitment_id uuid not null references commitments on delete cascade,
  state         entry_state not null default 'pending',
  progress      numeric not null default 0 check (progress >= 0),
  optional      boolean not null default false,
  moved_to      date,
  updated_at    timestamptz not null default now(),
  primary key (user_id, date, commitment_id),
  foreign key (user_id, date) references days on delete cascade
);

-- Frozen snapshot written at close; never rewritten by schedule edits.
create table day_items (
  user_id       uuid not null,
  date          date not null,
  commitment_id uuid not null,
  name          text not null,
  points        smallint not null,
  credit        numeric not null check (credit between 0 and 1),
  outcome       item_outcome not null,
  primary key (user_id, date, commitment_id),
  foreign key (user_id, date) references days on delete cascade
);

create table day_corrections (
  id          bigint generated always as identity primary key,
  user_id     uuid not null,
  date        date not null,
  before      jsonb not null,
  after       jsonb not null,
  created_at  timestamptz not null default now(),
  foreign key (user_id, date) references days on delete cascade
);

create table reflections (
  user_id uuid not null,
  date    date not null,
  reason  text check (reason in ('Too much planned','Low energy','Distracted','Unexpected day','Timing was bad','Other')),
  note    text check (char_length(note) <= 140),
  primary key (user_id, date),
  foreign key (user_id, date) references days on delete cascade
);

-- Recovery: 2 per calendar quarter, today only, never retroactive (PRD §30).
create function enforce_recovery_allowance() returns trigger language plpgsql as $$
declare used int;
begin
  if new.recovery and not coalesce(old.recovery, false) then
    if new.closed_at is not null then raise exception 'recovery_after_close'; end if;
    select count(*) into used from days
      where user_id = new.user_id and recovery and date_trunc('quarter', date) = date_trunc('quarter', new.date);
    if used >= 2 then raise exception 'recovery_allowance_used'; end if;
  end if;
  return new;
end $$;
create trigger days_recovery before insert or update on days for each row execute function enforce_recovery_allowance();

create table travel_periods (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  from_date  date not null,
  until_date date not null check (until_date >= from_date),
  paused_ids uuid[] not null default '{}'
);

-- ── Social ───────────────────────────────────────────────────────────────────
create table blocks (
  blocker_id uuid not null references profiles on delete cascade,
  blocked_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create function is_blocked_between(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create table friend_requests (
  id         uuid primary key default gen_random_uuid(),
  from_id    uuid not null references profiles on delete cascade,
  to_id      uuid not null references profiles on delete cascade,
  state      request_state not null default 'pending',
  created_at timestamptz not null default now(),
  check (from_id <> to_id)
);
create unique index friend_requests_open on friend_requests (least(from_id, to_id), greatest(from_id, to_id)) where state = 'pending';

-- Friendships are mutual: stored once with user_a < user_b.
create table friendships (
  user_a     uuid not null references profiles on delete cascade,
  user_b     uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create function are_friends(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships where user_a = least(a, b) and user_b = greatest(a, b));
$$;

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles on delete cascade,
  user_id     uuid references profiles on delete set null,
  group_id    uuid,
  reason      text not null,
  created_at  timestamptz not null default now()
);

create table groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 40),
  goal       text check (char_length(goal) <= 80),
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

create table group_members (
  group_id  uuid not null references groups on delete cascade,
  user_id   uuid not null references profiles on delete cascade,
  role      group_role not null default 'member',
  status    membership not null default 'active',
  muted     boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create unique index one_owner_per_group on group_members (group_id) where role = 'owner' and status = 'active';

create function is_active_member(g uuid, u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and user_id = u and status = 'active');
$$;

create function shares_group(a uuid, b uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members x join group_members y using (group_id)
    where x.user_id = a and y.user_id = b and x.status = 'active' and y.status = 'active');
$$;

-- Entitlements are written only by the purchase webhook (service role).
create table entitlements (
  user_id    uuid primary key references profiles on delete cascade,
  pro        boolean not null default false,
  renews_at  timestamptz,
  grace_until timestamptz,
  store      text check (store in ('app_store', 'play_store')),
  updated_at timestamptz not null default now()
);

create function has_pro(u uuid) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select pro or (grace_until is not null and grace_until > now()) from entitlements where user_id = u), false);
$$;

-- A Free user can never hold more than 2 active groups; a group never exceeds 12 (PRD §21, §27).
create function enforce_group_limits() returns trigger language plpgsql as $$
declare mine int; members int;
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status <> 'active') then
    select count(*) into mine from group_members where user_id = new.user_id and status = 'active';
    if mine >= 2 and not has_pro(new.user_id) then raise exception 'free_group_limit'; end if;
    select count(*) into members from group_members where group_id = new.group_id and status = 'active';
    if members >= 12 then raise exception 'group_full'; end if;
  end if;
  return new;
end $$;
create trigger group_members_limits before insert or update on group_members for each row execute function enforce_group_limits();

create table group_invites (
  code       text primary key check (code ~ '^[A-Z0-9]{6}$'),
  group_id   uuid not null references groups on delete cascade,
  created_by uuid not null references profiles on delete cascade,
  expires_at timestamptz not null default now() + interval '48 hours'
);

create table shared_commitments (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups on delete cascade,
  name       text not null check (char_length(name) between 1 and 60),
  pattern    jsonb not null,
  start_date date not null,
  end_date   date,
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now()
);

create table shared_participants (
  shared_id   uuid not null references shared_commitments on delete cascade,
  user_id     uuid not null references profiles on delete cascade,
  accepted_at timestamptz,
  declined_at timestamptz,
  -- "Count for both" link to a matching personal commitment (never merged silently, PRD §22).
  linked_commitment_id uuid references commitments on delete set null,
  primary key (shared_id, user_id)
);

create table shared_entries (
  shared_id uuid not null references shared_commitments on delete cascade,
  user_id   uuid not null references profiles on delete cascade,
  date      date not null,
  state     entry_state not null default 'pending',
  primary key (shared_id, user_id, date)
);

create table nudges (
  id           bigint generated always as identity primary key,
  sender_id    uuid not null references profiles on delete cascade,
  recipient_id uuid not null references profiles on delete cascade,
  group_id     uuid references groups on delete cascade,
  preset       text not null check (preset in ('Checking in.', 'You''re two away.', 'Don''t break the chain.', 'Strong week. Keep going.')),
  sender_day   date not null,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now(),
  unique (sender_id, recipient_id, sender_day)
);

create table export_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles on delete cascade,
  requested_at timestamptz not null default now(),
  ready_at     timestamptz,
  url          text
);

-- ── Row-Level Security ───────────────────────────────────────────────────────
alter table profiles             enable row level security;
alter table privacy_settings     enable row level security;
alter table notification_prefs   enable row level security;
alter table commitments          enable row level security;
alter table commitment_schedules enable row level security;
alter table days                 enable row level security;
alter table day_entries          enable row level security;
alter table day_items            enable row level security;
alter table day_corrections      enable row level security;
alter table reflections          enable row level security;
alter table travel_periods       enable row level security;
alter table blocks               enable row level security;
alter table friend_requests      enable row level security;
alter table friendships          enable row level security;
alter table reports              enable row level security;
alter table groups               enable row level security;
alter table group_members        enable row level security;
alter table group_invites        enable row level security;
alter table entitlements         enable row level security;
alter table shared_commitments   enable row level security;
alter table shared_participants  enable row level security;
alter table shared_entries       enable row level security;
alter table nudges               enable row level security;
alter table export_requests      enable row level security;

-- Owner-only personal data. Mood and reflections have no other policy, so nobody else can ever read them.
create policy own on profiles           for all using (id = auth.uid()) with check (id = auth.uid());
create policy own on privacy_settings   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on notification_prefs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on commitments        for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on commitment_schedules for all
  using (exists (select 1 from commitments c where c.id = commitment_id and c.user_id = auth.uid()))
  with check (exists (select 1 from commitments c where c.id = commitment_id and c.user_id = auth.uid()));
create policy own on days            for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on day_entries     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on day_items       for select using (user_id = auth.uid());
create policy own on day_corrections for select using (user_id = auth.uid());
create policy own on reflections     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on travel_periods  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on blocks          for all using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
create policy own on entitlements    for select using (user_id = auth.uid());
create policy own on export_requests for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy own on reports         for insert with check (reporter_id = auth.uid());

-- Public profile surface: name and username only, via this view, hidden from anyone in a block.
create view profile_cards with (security_invoker = false) as
  select p.id, p.display_name, p.username, p.status
  from profiles p
  where p.deactivated_at is null and not is_blocked_between(p.id, auth.uid());

-- Friends.
create policy parties on friend_requests for select using (auth.uid() in (from_id, to_id));
create policy send on friend_requests for insert with check (from_id = auth.uid() and not is_blocked_between(from_id, to_id));
create policy answer on friend_requests for update using (to_id = auth.uid() or from_id = auth.uid());
create policy parties on friendships for select using (auth.uid() in (user_a, user_b));
create policy remove on friendships for delete using (auth.uid() in (user_a, user_b));

-- Groups: members see their groups; role-gated writes are done through Edge Functions.
create policy members on groups for select using (is_active_member(id, auth.uid()));
create policy members on group_members for select using (is_active_member(group_id, auth.uid()));
create policy self_mute on group_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy members on group_invites for select using (is_active_member(group_id, auth.uid()));
create policy members on shared_commitments for select using (is_active_member(group_id, auth.uid()));
create policy members on shared_participants for select
  using (exists (select 1 from shared_commitments s where s.id = shared_id and is_active_member(s.group_id, auth.uid())));
create policy respond on shared_participants for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Group-specific shared completion is always visible to that group (PRD §23); personal data never is.
create policy members on shared_entries for select
  using (exists (select 1 from shared_commitments s where s.id = shared_id and is_active_member(s.group_id, auth.uid())));
create policy own_write on shared_entries for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy parties on nudges for select using (auth.uid() in (sender_id, recipient_id));
create policy send on nudges for insert with check (
  sender_id = auth.uid()
  and not is_blocked_between(sender_id, recipient_id)
  and (group_id is null or (is_active_member(group_id, sender_id) and is_active_member(group_id, recipient_id)))
  and exists (
    select 1 from privacy_settings ps where ps.user_id = recipient_id and (
      (ps.nudges_from = 'friends' and are_friends(sender_id, recipient_id)) or
      (ps.nudges_from = 'groups' and shares_group(sender_id, recipient_id))))
);

-- Personal weekly score for friends/groups, honouring score visibility. Computed server-side only.
create function visible_weekly_score(target uuid) returns smallint language sql stable security definer set search_path = public as $$
  select case when (
    target = auth.uid() or (
      not is_blocked_between(target, auth.uid()) and coalesce((
        select case ps.score_visibility
                 when 'friends' then are_friends(target, auth.uid())
                 when 'groups'  then shares_group(target, auth.uid())
                 else false end
        from privacy_settings ps where ps.user_id = target), false)))
  then (select round(avg(score))::smallint from days
        where user_id = target and status = 'scored' and date > current_date - 7)
  end;
$$;
