-- Behavioural checks for the PRD rules enforced in the database.
-- Run against a scratch database after the migrations (see docs/build-plan.md).
\set ON_ERROR_STOP 1
begin;

grant usage on schema public to authenticated;
grant all on all tables in schema public to authenticated;

insert into auth.users values
  ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into profiles (id, display_name, username) values
  ('00000000-0000-0000-0000-00000000000a', 'Ari', 'ari'),
  ('00000000-0000-0000-0000-00000000000b', 'Bo', 'bo_k');
insert into privacy_settings (user_id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');

-- Privacy-first defaults (PRD §24).
do $$ begin
  assert (select score_visibility = 'only_me' and names_visibility = 'private' and not streak_visible and nudges_from = 'friends'
          from privacy_settings where user_id = '00000000-0000-0000-0000-00000000000a'), 'privacy defaults';
end $$;

-- Free users: at most two active groups (PRD §27).
insert into groups (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'One'), ('10000000-0000-0000-0000-000000000002', 'Two'), ('10000000-0000-0000-0000-000000000003', 'Three');
insert into group_members (group_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'owner'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-00000000000a', 'owner');
do $$ begin
  begin
    insert into group_members (group_id, user_id) values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a');
    raise exception 'third group should be refused';
  exception when raise_exception then
    if sqlerrm <> 'free_group_limit' then raise; end if;
  end;
end $$;
-- Pro lifts the limit.
insert into entitlements (user_id, pro) values ('00000000-0000-0000-0000-00000000000a', true);
insert into group_members (group_id, user_id) values ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-00000000000a');

-- Recovery: two per quarter (PRD §30).
insert into days (user_id, date, timezone, recovery) values
  ('00000000-0000-0000-0000-00000000000a', '2026-10-01', 'UTC', true),
  ('00000000-0000-0000-0000-00000000000a', '2026-10-02', 'UTC', true);
do $$ begin
  begin
    insert into days (user_id, date, timezone, recovery) values ('00000000-0000-0000-0000-00000000000a', '2026-10-03', 'UTC', true);
    raise exception 'third recovery should be refused';
  exception when raise_exception then
    if sqlerrm <> 'recovery_allowance_used' then raise; end if;
  end;
end $$;

-- Tracking type locks after the first record (PRD §12).
insert into commitments (id, user_id, name, category, track, created_on, first_record_on) values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-00000000000a', 'Make bed', 'Chores', 'simple', '2026-10-01', '2026-10-01');
do $$ begin
  begin
    update commitments set track = 'amount', target = 2 where id = '20000000-0000-0000-0000-000000000001';
    raise exception 'track change should be refused';
  exception when raise_exception then
    if sqlerrm <> 'track_locked' then raise; end if;
  end;
end $$;

-- Username cooldown (PRD §20).
update profiles set username = 'ari_two' where id = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  begin
    update profiles set username = 'ari_three' where id = '00000000-0000-0000-0000-00000000000a';
    raise exception 'second change should be refused';
  exception when raise_exception then
    if sqlerrm <> 'username_cooldown' then raise; end if;
  end;
end $$;

-- RLS: Bo cannot see Ari's commitments, days or mood.
set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from commitments) = 0, 'commitments leaked';
  assert (select count(*) from days) = 0, 'days leaked';
  assert (select count(*) from groups) = 0, 'groups leaked to non-member';
end $$;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from commitments) = 1, 'owner sees own commitment';
  assert (select count(*) from groups) = 3, 'member sees own groups';
end $$;

rollback;
\echo ALL_RULES_OK
