-- SecureVote demonstration schema. NOT suitable for real/public elections.
create extension if not exists pgcrypto;
create table if not exists public.elections (
 id uuid primary key default gen_random_uuid(), title text not null, constituency text not null,
 starts_at timestamptz not null, ends_at timestamptz not null,
 status text not null default 'draft' check(status in ('draft','scheduled','active','completed')),
 created_at timestamptz not null default now(), constraint valid_election_window check(ends_at>=starts_at)
);
create table if not exists public.candidates (
 id uuid primary key default gen_random_uuid(), election_id uuid not null references public.elections(id) on delete cascade,
 display_name text not null, party_name text not null, photo_url text, created_at timestamptz not null default now()
);
create table if not exists public.demo_ballots (
 id uuid primary key default gen_random_uuid(), election_id uuid not null references public.elections(id) on delete cascade,
 candidate_id uuid not null references public.candidates(id) on delete restrict, cast_at timestamptz not null default now()
);
create index if not exists candidates_election_id_idx on public.candidates(election_id);
create index if not exists demo_ballots_election_id_idx on public.demo_ballots(election_id);
create table if not exists public.admin_profiles(user_id uuid primary key references auth.users(id) on delete cascade, role text not null default 'admin' check(role='admin'), created_at timestamptz not null default now());
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.admin_profiles where user_id=auth.uid() and role='admin'); $$;

alter table public.elections enable row level security;
alter table public.candidates enable row level security;
alter table public.demo_ballots enable row level security;
alter table public.admin_profiles enable row level security;
-- Drop previous policies so this script can safely be re-run.
drop policy if exists "Admins can read their own profile" on public.admin_profiles;
drop policy if exists "Admins can read elections" on public.elections;
drop policy if exists "Admins can create elections" on public.elections;
drop policy if exists "Admins can update elections" on public.elections;
drop policy if exists "Admins can delete elections" on public.elections;
drop policy if exists "Admins can read candidates" on public.candidates;
drop policy if exists "Admins can manage candidates" on public.candidates;
drop policy if exists "Public can read published elections" on public.elections;
drop policy if exists "Public can read candidates for published elections" on public.candidates;
drop policy if exists "Public can submit demo ballots for active elections" on public.demo_ballots;
drop policy if exists "Admins can read demo ballots" on public.demo_ballots;
drop policy if exists "Admins can insert demo ballots" on public.demo_ballots;
create policy "Admins can read their own profile" on public.admin_profiles for select to authenticated using(user_id=auth.uid());
create policy "Admins can read elections" on public.elections for select to authenticated using(public.is_admin());
create policy "Admins can create elections" on public.elections for insert to authenticated with check(public.is_admin());
create policy "Admins can update elections" on public.elections for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Admins can delete elections" on public.elections for delete to authenticated using(public.is_admin());
create policy "Admins can read candidates" on public.candidates for select to authenticated using(public.is_admin());
create policy "Admins can manage candidates" on public.candidates for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy "Public can read published elections" on public.elections for select to anon,authenticated using(status in ('active','completed'));
create policy "Public can read candidates for published elections" on public.candidates for select to anon,authenticated using(exists(select 1 from public.elections e where e.id=candidates.election_id and e.status in ('active','completed')));
create policy "Admins can read demo ballots" on public.demo_ballots for select to authenticated using(public.is_admin());
create policy "Public can submit demo ballots for active elections" on public.demo_ballots for insert to anon,authenticated with check(exists(select 1 from public.elections e join public.candidates c on c.election_id=e.id where e.id=demo_ballots.election_id and c.id=demo_ballots.candidate_id and e.status='active' and now() between e.starts_at and e.ends_at));

-- Existing versions may have a different column order/names (for example people_voted).
-- PostgreSQL cannot rename/reorder view columns through CREATE OR REPLACE VIEW.
drop view if exists public.election_vote_totals;
create view public.election_vote_totals with (security_barrier=true) as
 select e.id as election_id,e.title,e.constituency,e.status,count(b.id)::bigint as votes
 from public.elections e left join public.demo_ballots b on b.election_id=e.id
 where e.status in ('active','completed') group by e.id,e.title,e.constituency,e.status;
drop view if exists public.candidate_vote_totals;
create view public.candidate_vote_totals with (security_barrier=true) as
 select e.id as election_id,e.title,c.id as candidate_id,c.display_name,c.party_name,count(b.id)::bigint as votes
 from public.elections e join public.candidates c on c.election_id=e.id
 left join public.demo_ballots b on b.candidate_id=c.id and b.election_id=e.id
 where e.status in ('active','completed') group by e.id,e.title,c.id,c.display_name,c.party_name;

grant select,insert,update,delete on public.elections to authenticated;
grant select,insert,update,delete on public.candidates to authenticated;
grant select on public.elections,public.candidates to anon,authenticated;
grant select,insert on public.demo_ballots to anon,authenticated;
grant select on public.election_vote_totals,public.candidate_vote_totals to anon,authenticated;
grant select on public.admin_profiles to authenticated;
grant execute on function public.is_admin() to authenticated;
