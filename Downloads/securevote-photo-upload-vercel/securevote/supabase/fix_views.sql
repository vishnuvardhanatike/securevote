-- SecureVote view migration. Run this in Supabase SQL Editor if schema.sql previously failed with 42P16.
-- This replaces only the aggregate views; elections, candidates, and demo ballots are not deleted.
drop view if exists public.candidate_vote_totals;
drop view if exists public.election_vote_totals;

create view public.election_vote_totals with (security_invoker=true) as
 select e.id as election_id,e.title,e.constituency,e.status,count(b.id)::bigint as votes
 from public.elections e left join public.demo_ballots b on b.election_id=e.id
 where e.status in ('active','completed') group by e.id,e.title,e.constituency,e.status;

create view public.candidate_vote_totals with (security_invoker=true) as
 select e.id as election_id,e.title,c.id as candidate_id,c.display_name,c.party_name,count(b.id)::bigint as votes
 from public.elections e join public.candidates c on c.election_id=e.id
 left join public.demo_ballots b on b.candidate_id=c.id and b.election_id=e.id
 where e.status in ('active','completed') group by e.id,e.title,c.id,c.display_name,c.party_name;

grant select on public.election_vote_totals,public.candidate_vote_totals to anon,authenticated;
