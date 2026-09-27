-- Run after supabase-bob.sql. Keeps existing jobs and team tables intact.
begin;
alter table public.bob_jobs
  add column if not exists artifact jsonb,
  add column if not exists review_status text,
  add column if not exists review_error text,
  add column if not exists published_commit_url text;
-- READY_FOR_REVIEW is the agent status; review_status tracks human decisions.
notify pgrst, 'reload schema';
commit;
