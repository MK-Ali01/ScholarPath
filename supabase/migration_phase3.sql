-- ScholarPath — Phase 3 Migration (run after migration_phase1.sql and migration_phase2.sql)

-- ============================================================
-- 1. Capture candidate country at intake (needed for eligibility checks
--    this phase surfaces but can't fully verify without it)
-- ============================================================
alter table profiles add column if not exists candidate_country text;
-- NOTE: add a "Country of citizenship" field to the Phase 1 intake form
-- and wire it into the profiles insert. Until that's done, this column
-- stays null and Phase 3 will flag country-eligibility as unverified.

-- ============================================================
-- 2. Curated scholarships table — has an owner (you) and a refresh
--    cadence (re-run the "last_verified_on" check each admissions cycle,
--    since every one of these dates shifts year to year)
-- ============================================================
create table if not exists scholarships (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  funding_body text not null,
  country_or_region text not null,          -- 'Germany', 'UK', 'USA', 'EU (multi-country)'
  domain_tags text[] not null default '{}', -- e.g. {'all'} or {'computer science','engineering'}
  eligibility_summary text not null,
  deadline_text text not null,              -- human-readable, since many are "varies by programme"
  deadline_type text not null check (deadline_type in ('fixed_date', 'varies_by_programme', 'varies_by_country')),
  source_url text not null,
  last_verified_on date not null,
  notes text,                               -- anything unusual worth a human's attention
  created_at timestamptz not null default now()
);

create table if not exists scholarship_matches (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  scholarship_id uuid not null references scholarships(id) on delete cascade,
  domain_recommendation_id uuid references domain_recommendations(id),
  match_confidence text not null check (match_confidence in ('high', 'medium', 'low')),
  match_reasoning text not null,
  country_eligibility_status text not null default 'not_verified'
    check (country_eligibility_status in ('verified_eligible', 'verified_ineligible', 'not_verified')),
  matched_at timestamptz not null default now()
);

create index if not exists idx_scholarship_matches_profile on scholarship_matches(profile_id);
create index if not exists idx_scholarships_domain_tags on scholarships using gin(domain_tags);

alter table scholarships enable row level security;
alter table scholarship_matches enable row level security;

drop policy if exists "service role full access - scholarships" on scholarships;
create policy "service role full access - scholarships"
  on scholarships for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role full access - scholarship_matches" on scholarship_matches;
create policy "service role full access - scholarship_matches"
  on scholarship_matches for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ============================================================
-- 3. Seed data — sourced and dated. RE-VERIFY BEFORE EACH ADMISSIONS
--    CYCLE. Deadlines below are for the 2026-2027 / 2027-2028 intake
--    windows as of the verification date — they WILL change next cycle.
-- ============================================================

insert into scholarships (name, funding_body, country_or_region, domain_tags, eligibility_summary, deadline_text, deadline_type, source_url, last_verified_on, notes)
values
(
  'DAAD Study Scholarships (Master''s/PhD)',
  'German Academic Exchange Service (DAAD)',
  'Germany',
  array['all'],
  'Open to international students pursuing a master''s or PhD at a German university. Specific programmes may require prior work experience or a German-recognized bachelor''s degree.',
  '15 October is the main annual deadline for many programmes, but exact dates vary significantly by individual course/institution — some as early as August, others into January.',
  'varies_by_programme',
  'https://www.daad.de',
  '2026-08-14',
  'DAAD is an umbrella body funding hundreds of individually-run programmes, each with its own deadline — always confirm on the specific programme page, not just DAAD''s general site.'
),
(
  'Chevening Scholarship',
  'UK Foreign, Commonwealth & Development Office (FCDO)',
  'UK',
  array['all'],
  'For citizens of Chevening-eligible countries (160+) with a completed undergraduate degree and at least 2,800 hours (~2 years) of post-degree work experience. Leadership potential is weighted heavily — this is NOT a purely academic-merit scholarship.',
  '2027–2028 cycle: applications open 4 August 2026, close 6 October 2026, 11:00 UTC.',
  'fixed_date',
  'https://www.chevening.org/scholarships/application-timeline/',
  '2026-08-14',
  'Confirm the applicant''s country is on Chevening''s current eligible-country list before recommending — eligibility is nationality-gated, not just academic.'
),
(
  'Fulbright Foreign Student Program',
  'U.S. Department of State / Fulbright Foreign Scholarship Board',
  'USA',
  array['all'],
  'For non-U.S. citizens pursuing a master''s or PhD in the U.S. Administered via binational commissions/U.S. embassies per country — eligibility criteria can vary slightly by country program.',
  'No single global deadline — most countries fall between September and October, but some open as early as May. Applicant must check their specific country''s Fulbright Commission or U.S. Embassy page.',
  'varies_by_country',
  'https://foreign.fulbrightonline.org',
  '2026-08-14',
  'This is the single most country-dependent entry in this table — never state a specific date without confirming the applicant''s country page directly.'
),
(
  'Erasmus Mundus Joint Master''s (EMJM)',
  'European Union / Erasmus+ Programme',
  'EU (multi-country)',
  array['all'],
  'Fully-funded joint master''s degrees delivered by a consortium of universities across 2+ European countries. Open to students worldwide. Each individual joint-master programme (not a single central body) runs its own application and eligibility.',
  'No single deadline — there is no central application. Each of the 100+ individual EMJM programmes runs its own cycle, most opening applications between October and January for the following academic year.',
  'varies_by_programme',
  'https://erasmus-plus.ec.europa.eu/opportunities/opportunities-for-individuals/students/erasmus-mundus-joint-masters',
  '2026-08-14',
  'Point the applicant to the EACEA catalogue to find the specific joint-master programme matching their domain — this entry is a category, not a single applicable scholarship.'
)
on conflict do nothing;

-- ============================================================
-- 4. Extend profile status for this phase's pipeline stage
-- ============================================================
alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('pending', 'intake_complete', 'profile_extracted', 'domain_recommended', 'papers_found', 'scholarships_matched', 'failed'));
