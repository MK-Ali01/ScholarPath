# Phase 3 — n8n Workflow Build Guide

Scholarship matching runs against the curated `scholarships` table (not a live
API — there isn't one, per the spec). Trigger point: after `status = papers_found`
(or, for isolated testing, a Manual Trigger with a hardcoded `profile_id`).

No new external API credentials needed — this phase queries your own Supabase
table and calls the same Groq/Gemini credential as before.

---

## Node 1 — Manual Trigger (isolated testing)
- Hardcode a `profile_id` from one of your real Phase 1-2 test runs

## Node 2 — Supabase: Get Profile + Domain Recommendations
- Resource: Row, Operation: Get, Table: `profiles`, filter `id`
- Follow with a second Supabase Get on `domain_recommendations` filtered by
  `profile_id`, to get the recommended domain string(s)

## Node 3 — Supabase: Get All Scholarships
- Resource: Row, Operation: **Get Many**, Table: `scholarships`, no filter
  (the table is small — filtering happens in the next node, not via query,
  since domain_tags matching against 'all' is easier in code than SQL)

## Node 4 — Code: Filter by Domain Tags
- Deterministic filter, no LLM call needed here:
```javascript
const domain = $('Node 2 - Domain Rec').item.json.domain.toLowerCase();
const scholarships = $input.all().map(i => i.json);

const matched = scholarships.filter(s => {
  if (s.domain_tags.includes('all')) return true;
  return s.domain_tags.some(tag => domain.includes(tag.toLowerCase()) || tag.toLowerCase().includes(domain));
});

return matched.map(s => ({ json: { ...s, profile_id: $('Node 2 - Profile').item.json.id, candidate_country: $('Node 2 - Profile').item.json.candidate_country, structured_profile: $('Node 2 - Profile').item.json.structured_profile } }));
```
- This is intentionally simple keyword matching, not semantic — with only
  4 seed scholarships (all tagged 'all' right now), everything passes
  through at this stage. As you grow the curated table with more
  specific/university-level entries, this filter starts doing real work.

## Node 5 — Loop Over Items (Split In Batches, size 1)

## Node 6 — Wait (1 second — pacing, consistent with prior phases)

## Node 7 — LLM: Evaluate Scholarship Match
- Use **Prompt 4** from `prompts/phase3-prompts.md`
- Retry on fail: 2 attempts

## Node 8 — Code: Parse LLM JSON
- Same defensive pattern as prior phases

## Node 9 — Supabase: Insert Scholarship Match
- Table: `scholarship_matches`
- `profile_id`, `scholarship_id` (from Node 4's passthrough), `domain_recommendation_id`
- `match_confidence`, `match_reasoning` from Node 8
- `country_eligibility_status`: set to `'not_verified'` unless
  `candidate_country` was present AND the LLM's `unmet_or_unclear_criteria`
  didn't flag nationality as an issue — even then, keep this conservative;
  this status should only ever flip to `verified_eligible` via an actual
  human check in the Phase 4/5 review UI, never automatically from an LLM call

**Loop back to Node 5** until all filtered scholarships are processed.

## Node 10 — Supabase: Update Profile Status
- `status = 'scholarships_matched'` (add this value to the `profiles`
  status check constraint, same pattern as Phase 2's migration did)

---

## Phase 3 done-when

Run against your same test profiles. Confirm:
1. Each profile gets scholarship matches with real, sourced reasoning — not
   generic "this could be a good fit" text
2. A profile with a clearly mismatched domain (test this deliberately) gets
   `match_confidence: low` with a reasoning that actually explains the gap
3. Every match's `country_eligibility_status` shows `not_verified` unless
   you've actually added country capture to intake and tested with it set
4. No hardcoded scholarship data anywhere outside the `scholarships` table —
   confirm the workflow reads from Supabase, not from values pasted into
   the workflow itself (keeps future updates to a single SQL UPDATE, not
   a workflow edit)
