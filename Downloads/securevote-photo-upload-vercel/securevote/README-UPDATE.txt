SecureVote update: multiple active elections on voter ballot

What changed:
- The voter flow now loads all elections that are Active and within their configured start/end dates.
- The newest eligible active election is selected by default.
- If more than one eligible election is active, voters see a "Choose election" dropdown and can switch between them; candidate lists are reloaded for the selected election.
- Candidate loading remains scoped by election_id, so candidates from different elections are not mixed.

Deployment:
1. Replace the project files in your GitHub repository with this ZIP's contents.
2. Keep Vercel environment variables VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
3. Deploy/redeploy on Vercel.
4. Ensure each election intended for voting has status = active and its start/end timestamps include the current time.
5. Ensure public SELECT policies exist for elections and candidates (as configured in the prior SQL steps).

No database migration is required for this frontend change.
This is a demonstration voting application, not a legally valid election system.
