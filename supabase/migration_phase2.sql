-- ScholarPath — Phase 2 Migration (run after migration_phase1.sql)

create table if not exists papers (
  id uuid primary key default gen_random_uuid(),
  domain_recommendation_id uuid not null references domain_recommendations(id) on delete cascade,
  source text not null check (source in ('semantic_scholar', 'arxiv')),
  external_id text,                      -- paperId (Semantic Scholar) or arXiv id
  title text not null,
  abstract text,
  authors jsonb,                         -- [{ name, affiliation }]
  venue text,
  publication_year int,
  citation_count int,
  url text,
  plain_summary text,                    -- LLM-generated plain-language summary
  relevance_confidence text check (relevance_confidence in ('high', 'medium', 'low')),
  relevance_reasoning text,
  fetched_at timestamptz not null default now()
);

create index if not exists idx_papers_domain_rec on papers(domain_recommendation_id);

alter table papers enable row level security;

drop policy if exists "service role full access - papers" on papers;
create policy "service role full access - papers"
  on papers for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Add a stage to the profiles status check for tracking pipeline progress
alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('pending', 'intake_complete', 'profile_extracted', 'domain_recommended', 'papers_found', 'failed'));
