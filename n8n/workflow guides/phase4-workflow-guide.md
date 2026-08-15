# Phase 4 — n8n Workflow Build Guide

Two separate workflows this phase, deliberately split:

**Workflow A — "Build Review Package"**: identifies professors, drafts the email,
stops at `pending_review`. Fully automated up to this point.

**Workflow B — "Send Approved Email"**: triggered ONLY by an explicit human click
in the dashboard (via a webhook), sends via Gmail, logs the result. This is the
one workflow in the whole project that should never run unattended.

Splitting them into two workflows (not one with a "Wait for approval" node) means
Workflow A can run and be tested completely independently of anything email-related
- you can verify professor ID + drafting quality without any risk of accidentally
sending anything.

New credential needed: Gmail (n8n's Gmail node, OAuth2 - follow n8n's built-in
connection flow, needs a Google Cloud project with Gmail API enabled).

---

## Workflow A — Build Review Package

### Node 1 — Manual Trigger (testing) / Supabase Trigger on scholarships_matched (production)

### Node 2 — Supabase: Get Papers for Profile
- Get papers linked through this profile's domain_recommendations
- Sort by relevance_confidence (high first), take top 3 - no need to attempt
  professor ID on every paper found, just the strongest matches

### Node 3 — Loop Over Papers (Split In Batches, size 1)

### Node 4 — Wait (1 second, pacing)

### Node 5 — HTTP Request: Semantic Scholar Author Lookup (optional enrichment)
- If the paper's author data included an authorId, GET
  https://api.semanticscholar.org/graph/v1/author/{authorId}?fields=name,affiliations,homepage
- On Error: Continue - this frequently won't have useful data, that's expected
  and fine, not a failure

### Node 6 — LLM: Extract Professor Candidate
- Use Prompt 5 from prompts/phase4-prompts.md

### Node 7 — Code: Parse LLM JSON

### Node 8 — IF: Is likely_pi_name present and not null?
- False: skip this paper, loop back to Node 3 (no professor identified,
  don't force a low-quality guess into the database)
- True: continue

### Node 9 — Supabase: Insert Professor Row
- All fields from Node 7, identification_confidence set from affiliation_confidence
- contact_email: leave null unless Node 5 or paper metadata explicitly provided one
  - never populate this from an LLM guess

Loop back to Node 3 for remaining papers.

Checkpoint 1: run against 2-3 test profiles. Confirm the notes/confidence
fields genuinely reflect uncertainty (e.g., a paper with 8 authors and no
affiliation data should NOT come back "high confidence") rather than the LLM
defaulting to confident-sounding output regardless of actual data quality.

---

### Node 10 — Supabase: Get Best Professor Candidate
- Among the inserted professors for this profile, pick the one with highest
  identification_confidence (code node or simple sort)
- If none were identified across all papers: set profile status = 'failed',
  log to error_log ("no professor could be identified from available papers"),
  stop here - do not draft an email with no addressee

### Node 11 — LLM: Draft Outreach Email
- Use Prompt 6 from prompts/phase4-prompts.md

### Node 12 — Code: Parse LLM JSON

### Node 13 — Supabase: Insert Review Package
- status: 'pending_review', all fields from Node 12 plus the linked
  profile/professor/domain IDs

### Node 14 — Supabase: Update Profile Status
- status = 'awaiting_review'

Checkpoint 2 (Workflow A done-when): run end to end on 3-5 test profiles.
For each, manually read the drafted email against the 6 rules in Prompt 6 -
specifically check it never claims the professor is recruiting/has funding
unless you fed it verified data saying so. This is the check that matters most
in the whole project; don't skim it.

---

## Workflow B — Send Approved Email

### Node 1 — Webhook (triggered by the dashboard's Approve button - see
dashboard/app/api/approve-email/route.ts)
- Method: POST
- Body: { review_package_id }
- Same cloudflared tunnel pattern as Task 2 - this needs a stable public URL

### Node 2 — Supabase: Get Review Package
- Fetch by id, join professor (for contact_email) and profile

### Node 3 — IF: status is 'approved' AND contact_email is not null
- False: respond with an error, do not send. (The dashboard should only
  ever call this webhook after setting status to approved, but this node is
  the safety net if it's ever called out of order, or if no email address
  was ever found for this professor.)

### Node 4 — Gmail: Send Email
- To: contact_email
- Subject: edited_email_subject if present, else drafted_email_subject
  (always prefer the human-edited version if one exists)
- Body: same logic for body
- On Error: Continue - a send failure shouldn't crash the workflow silently

### Node 5 — IF: Send succeeded?
- True: Node 6a. False: Node 6b

### Node 6a — Supabase: Insert into sent_emails (send_status: 'success') +
Update review_packages.status = 'sent' + Update profiles.status = 'completed'

### Node 6b — Supabase: Insert into sent_emails (send_status: 'failed',
error_message from Node 4's error output) + Update review_packages.status = 'send_failed'

### Node 7 — Respond to Webhook
- Return { success: true/false } so the dashboard can show a confirmation
  or error to the human immediately

Checkpoint 3: test with a review package pointed at your OWN email
address first (temporarily override contact_email before testing) - confirm
you actually receive it, formatted correctly, before this ever touches a real
professor's inbox.
