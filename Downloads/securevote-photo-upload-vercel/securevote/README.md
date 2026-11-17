# SecureVote demo — Vercel + Supabase

Desktop-first React/Vite demonstration. This is not a certified or legally valid election system.

## Deploy to Vercel
1. Push this project folder to GitHub.
2. Import the repository in Vercel. Framework: Vite; build command: `npm run build`; output directory: `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel Environment Variables.
4. In Supabase SQL Editor, run the complete `supabase/schema.sql` file. This schema replaces the previous demo schema and adds election-specific candidate totals and public read policies.
5. Create an admin user in Supabase Authentication. Copy its user UUID and run:
   ```sql
   insert into public.admin_profiles(user_id, role)
   values ('YOUR_AUTH_USER_UUID', 'admin');
   ```
6. Redeploy Vercel after adding environment variables.

## Admin workflow
- Open Admin and sign in with the Supabase Auth admin account.
- Create an election with title, constituency, dates, status, and candidates.
- Enter one candidate per line in `Party name | Candidate name` format.
- Use Analyze on an election to see that election's candidate-wise vote totals.
- Set an election to Active during its configured date window to make it available to the demo ballot.

## Public dashboard
The Election results link in the site navigation shows Active and Completed elections, their names, constituency, total demo votes, and candidate/party vote totals.

## Demo ballot behavior
The demo ballot loads candidates for the first currently active election whose date window includes the current time. A submitted demo ballot increments that election's candidate and election totals. The schema stores the selected candidate in `demo_ballots`; it does not store voter name, phone, email, or identity documents.

## Important security limitation
This is a classroom/demo prototype only. Anonymous demo ballot inserts are intentionally enabled so the public demo flow can work; that is not appropriate for a real election. It has no verified voter eligibility, one-person-one-vote enforcement, independent audit, cryptographic ballot secrecy, or certification. Do not use real voter data, Aadhaar/Voter ID images, or real elections. For a real system, ballot submission must move behind a reviewed server-side eligibility and anti-duplicate-voting workflow.


### Fix for SQL error 42P16 (existing view column name mismatch)
If Supabase reports `cannot change name of view column "people_voted" to "constituency"`, run `supabase/fix_views.sql` in the SQL Editor. It drops and recreates only the two aggregate views; it does not delete election, candidate, or demo ballot rows. Then deploy the frontend again if needed. For a fresh setup, use the updated `supabase/schema.sql`.


## Voting flow repair (latest)

If you already deployed an earlier SecureVote version, run `supabase/fix_voting_and_results.sql` in the Supabase SQL Editor. It repairs the demo ballot insert policy and recreates aggregate-only result views; it does not delete elections, candidates, or ballots.

For voting to work, an election must have status `active`, the current date/time must be within its start/end window, and it must contain candidates. The voter ballot now loads candidates from the active election in Supabase; it no longer silently falls back to placeholder candidates when Supabase is configured. The confirmation screen displays any database error instead of hiding it.

This remains a demonstration. Do not use it for real or legally binding elections.


## Eye / thumb photo verification demo

The voter identity step now lets a participant choose either an eye photo or a thumb photo, preview it locally, and run a basic demo file check before continuing. Accepted formats are JPG, PNG, and WebP up to 5 MB. The image is not sent to Supabase and is not persisted by the application. The success state means only that a supported image file was selected; it does **not** perform biometric matching, liveness detection, or identity verification. Do not use real voter biometric data in this prototype.
