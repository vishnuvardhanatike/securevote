import { createClient, type SupabaseClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const isSupabaseConfigured = Boolean(url && anonKey);
export const supabase: SupabaseClient | null = isSupabaseConfigured ? createClient(url!, anonKey!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
export type DbElection = { id:string; title:string; constituency:string; starts_at:string; ends_at:string; status:'draft'|'scheduled'|'active'|'completed'; created_at:string };
export type DbCandidate = { id:string; election_id:string; display_name:string; party_name:string; photo_url:string|null };
export async function getAdminSession(){ if(!supabase)return null; const {data}=await supabase.auth.getSession(); return data.session; }
export async function getElections():Promise<DbElection[]>{ if(!supabase)return []; const {data,error}=await supabase.from('elections').select('*').order('created_at',{ascending:false}); if(error)throw error; return (data??[]) as DbElection[]; }
export async function getPublicElections():Promise<DbElection[]>{ if(!supabase)return []; const {data,error}=await supabase.from('elections').select('*').in('status',['active','completed']).order('created_at',{ascending:false}); if(error)throw error; return (data??[]) as DbElection[]; }
export async function getCandidates(electionId:string):Promise<DbCandidate[]>{ if(!supabase)return []; const {data,error}=await supabase.from('candidates').select('*').eq('election_id',electionId).order('created_at'); if(error)throw error; return (data??[]) as DbCandidate[]; }
export async function getElectionAnalysis(electionId:string){ if(!supabase)return []; const {data,error}=await supabase.from('candidate_vote_totals').select('*').eq('election_id',electionId); if(error)throw error; return data??[]; }
export async function getPublicAnalysis(){ if(!supabase)return []; const {data,error}=await supabase.from('election_vote_totals').select('*'); if(error)throw error; return data??[]; }
export async function createElection(input:Omit<DbElection,'id'|'created_at'>){ if(!supabase)throw new Error('Supabase is not configured.'); const {data,error}=await supabase.from('elections').insert(input).select('*').single(); if(error)throw error; return data as DbElection; }
export async function addCandidates(electionId:string, rows:{display_name:string;party_name:string}[]){ if(!supabase)throw new Error('Supabase is not configured.'); const {error}=await supabase.from('candidates').insert(rows.map(x=>({...x,election_id:electionId}))); if(error)throw error; }
export async function updateElection(id:string,changes:Partial<Pick<DbElection,'status'>>){ if(!supabase)throw new Error('Supabase is not configured.'); const {error}=await supabase.from('elections').update(changes).eq('id',id); if(error)throw error; }
export async function deleteElection(id:string){ if(!supabase)throw new Error('Supabase is not configured.'); const {error}=await supabase.from('elections').delete().eq('id',id); if(error)throw error; }
export async function getTotalDemoVotes(){ if(!supabase)return 0; const {count,error}=await supabase.from('demo_vote_events').select('id',{count:'exact',head:true}); if(error)throw error; return count??0; }
export async function recordDemoVote(electionId:string,candidateId:string){ if(!supabase)throw new Error('Supabase is not configured.'); const {error}=await supabase.from('demo_ballots').insert({election_id:electionId,candidate_id:candidateId}); if(error)throw error; }
