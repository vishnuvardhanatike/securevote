-- SecureVote demo voting + aggregate dashboard repair.
-- Run in Supabase SQL Editor. This does not delete elections, candidates or ballots.

-- Ensure the public demo-vote insert policy exists and only accepts a candidate
-- belonging to an election that is currently active and within its date window.
alter table public.demo_ballots enable row level security;
drop policy if exists "Public can submit demo ballots for active elections" on public.demo_ballots;
create policy "Public can submit demo ballots for active elections"
  on public.demo_ballots for insert to anon, authenticated
  with check (
    exists (
      select 1 from public.elections e
      join public.candidates c on c.election_id = e.id
      where e.id = demo_ballots.election_id
        and c.id = demo_ballots.candidate_id
        and e.status = 'active'
        and now() between e.starts_at and e.ends_at
    )
  );
grant insert on public.demo_ballots to anon, authenticated;

-- Recreate aggregate views without security_invoker so public visitors can see
-- candidate/election totals without receiving direct access to individual ballots.
drop view if exists public.candidate_vote_totals;
drop view if exists public.election_vote_totals;
create view public.election_vote_totals with (security_barrier=true) as
  select e.id as election_id, e.title, e.constituency, e.status,
         count(b.id)::bigint as votes
  from public.elections e
  left join public.demo_ballots b on b.election_id = e.id
  where e.status in ('active','completed')
  group by e.id, e.title, e.constituency, e.status;
create view public.candidate_vote_totals with (security_barrier=true) as
  select e.id as election_id, e.title, c.id as candidate_id,
         c.display_name, c.party_name, count(b.id)::bigint as votes
  from public.elections e
  join public.candidates c on c.election_id = e.id
  left join public.demo_ballots b
    on b.candidate_id = c.id and b.election_id = e.id
  where e.status in ('active','completed')
  group by e.id, e.title, c.id, c.display_name, c.party_name;
grant select on public.election_vote_totals, public.candidate_vote_totals to anon, authenticated;
