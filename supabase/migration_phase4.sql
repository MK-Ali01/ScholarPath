-- ScholarPath — Phase 4 Migration (run after migration_phase1-3.sql)

-- ============================================================
-- 1. Professors — best-effort identification, always flagged unverified
--    until a human confirms
-- ============================================================
create table if not exists professors (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid references papers(id) on delete set null, -- source paper this came from
  name text not null,
  affiliation text,                      -- best-effort, from paper metadata or search
  affiliation_source text,               -- 'semantic_scholar_author' | 'web_search' | 'paper_metadata'
  research_focus_summary text,           -- LLM-derived, from paper abstracts
  contact_email text,                    -- only if found via official university faculty page, never guessed
  contact_email_source_url text,         -- required if contact_email is set — no email without a citable source
  identification_confidence text not null check (identification_confidence in ('high', 'medium', 'low')),
  identification_notes text,             -- explicit caveats: "affiliation unconfirmed", "email not found", etc.
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. Review packages — the full bundle shown to the human before send
-- ============================================================
create table if not exists review_packages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  professor_id uuid not null references professors(id),
  domain_recommendation_id uuid references domain_recommendations(id),
  drafted_email_subject text not null,
  drafted_email_body text not null,
  edited_email_subject text,             -- human edits, if any, kept separate from the original draft
  edited_email_body text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected', 'sent', 'send_failed')),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. Sent email log — audit trail, never overwritten
-- ============================================================
create table if not exists sent_emails (
  id uuid primary key default gen_random_uuid(),
  review_package_id uuid not null references review_packages(id),
  sent_to text not null,
  subject text not null,
  body text not null,
  gmail_message_id text,
  sent_at timestamptz not null default now(),
  send_status text not null check (send_status in ('success', 'failed')),
  error_message text
);

create index if not exists idx_professors_paper on professors(paper_id);
create index if not exists idx_review_packages_profile on review_packages(profile_id);
create index if not exists idx_review_packages_status on review_packages(status);

alter table professors enable row level security;
alter table review_packages enable row level security;
alter table sent_emails enable row level security;

drop policy if exists "service role full access - professors" on professors;
create policy "service role full access - professors"
  on professors for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access - review_packages" on review_packages;
create policy "service role full access - review_packages"
  on review_packages for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access - sent_emails" on sent_emails;
create policy "service role full access - sent_emails"
  on sent_emails for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- 4. Extend profile status
-- ============================================================
alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('pending', 'intake_complete', 'profile_extracted', 'domain_recommended', 'papers_found', 'scholarships_matched', 'awaiting_review', 'completed', 'failed'));
