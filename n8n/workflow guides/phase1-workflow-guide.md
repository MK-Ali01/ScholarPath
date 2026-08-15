# Phase 1 — n8n Workflow Build Guide

One workflow, ~10 nodes. Build and test in the order below — each checkpoint is
independently testable before you add the next node.

Credentials needed first (n8n → Credentials → New):
- **Supabase** — Project URL + **service role key** (not anon key — n8n needs write access)
- **GitHub** — a Personal Access Token (classic, no special scopes needed for public
  repo/user data) — raises your rate limit from 60/hr to 5,000/hr
- **Groq or Gemini** — API key from console.groq.com or aistudio.google.com

---

## Node 1 — Form Trigger
- Node type: `n8n-nodes-base.formTrigger`
- Form title: "ScholarPath Intake"
- Fields:
  - `CV File` — type: File, required
  - `GitHub Username` — type: Text, required
- This gives you a public form URL immediately (via your cloudflared tunnel) — no
  separate frontend needed for Phase 1 intake.

## Node 2 — Supabase: Upload CV
- Node type: `n8n-nodes-base.supabase`, Resource: **Storage**, Operation: **Upload**
- Bucket: `cvs`
- File Name: `{{ $json['CV File'].filename }}-{{ Date.now() }}` (timestamp avoids collisions)
- Binary Property: the file field from the form

## Node 3 — Supabase: Insert Profile Row
- Resource: **Row**, Operation: **Create**, Table: `profiles`
- Fields:
  - `github_username`: `{{ $('Form Trigger').item.json['GitHub Username'] }}`
  - `cv_file_path`: `{{ $json.path }}` (from Node 2's output)
  - `status`: `intake_complete`

**✅ Checkpoint 1 (Phase 1b):** submit the form once. Confirm the file lands in the
`cvs` bucket and a row appears in `profiles` with `status = intake_complete`.

---

## Node 4 — Extract from File
- Node type: `n8n-nodes-base.extractFromFile`
- Operation: auto-detect (handles PDF and DOCX)
- Input: binary data from Node 2 (or re-download via Supabase if the binary didn't
  carry through — use **Supabase → Storage → Download** with the path from Node 3's output)
- Output field: `text`

## Node 5 — HTTP Request: GitHub User Info
- Method: GET
- URL: `https://api.github.com/users/{{ $('Form Trigger').item.json['GitHub Username'] }}`
- Authentication: GitHub credential (Node 1 credential list)
- **Settings → On Error: Continue (using error output)** — this is the retry/fallback
  requirement from the spec. A bad username shouldn't kill the run.
- **Settings → Retry on Fail:** enabled, 2 retries, 1000ms wait

## Node 6 — HTTP Request: GitHub Repos
- Method: GET
- URL: `https://api.github.com/users/{{ $('Form Trigger').item.json['GitHub Username'] }}/repos?sort=updated&per_page=20`
- Same auth + retry + continue-on-error settings as Node 5

## Node 7 — Code: Merge GitHub Data
- Combines Node 5 + Node 6 output into one clean object: `{ user: {...}, repos: [...], languages: [...] }`
- If Node 5 or 6 errored, set `github_data: null` and continue rather than throw —
  profile extraction should still run on CV text alone if GitHub data is unavailable

## Node 8 — Supabase: Update (github_data + raw_cv_text)
- Resource: Row, Operation: Update, Table: `profiles`, match on `id`
- `github_data`: output of Node 7
- `raw_cv_text`: output of Node 4

**✅ Checkpoint 2:** run against a real CV. Confirm `raw_cv_text` looks like actual
CV content (not garbled — PDF extraction sometimes mangles multi-column layouts,
worth eyeballing) and `github_data` has real repo/language info.

---

## Node 9 — LLM: Structure Profile
- HTTP Request node (or native Groq/Gemini node if your n8n version has one)
- Use **Prompt 1** from `prompts/phase1-prompts.md`
- Retry on fail: 2 attempts

## Node 10 — Code: Parse LLM JSON
- Per the parsing snippet in `prompts/phase1-prompts.md`
- On parse failure: don't crash — write to `error_log` (Node 12 below) and set
  `structured_profile: null`, letting the run continue in a visibly-failed state
  rather than stopping silently

## Node 11 — Supabase: Update (structured_profile, status)
- `structured_profile`: parsed output
- `status`: `profile_extracted`

**✅ Checkpoint 3 (Phase 1c):** run against **3–5 real, varied CVs** — at minimum
one clean/standard format, one with an unusual layout or gap, one with sparse
content. Manually read each `structured_profile` and confirm it actually reflects
that specific CV, not generic plausible-sounding output.

---

## Node 12 — LLM: Domain Recommendation
- Use **Prompt 2** from `prompts/phase1-prompts.md`, input is `structured_profile`
- Same retry settings

## Node 13 — Code: Parse LLM JSON
- Same pattern as Node 10

## Node 14 — Supabase: Insert Domain Recommendations
- Resource: Row, Operation: **Insert** (multiple rows — one per recommendation
  in the parsed `recommendations` array)
- Use a **Split Out** node before this if the LLM returned an array, to insert
  one row per domain with correct `rank`

## Node 15 — Supabase: Update Status
- `status`: `domain_recommended`

**✅ Checkpoint 4 (Phase 1d):** same 3–5 CVs — confirm each produces domain
suggestions that plausibly track that person's actual background, not the same
generic suggestion regardless of input.

---

## Error handling node (attach to every external call)

Add an **Error Trigger** workflow (separate n8n workflow, triggered on any node
failure) that:
1. Writes `{ step, error_message, timestamp }` appended to the failing profile's
   `error_log` column
2. Sets `status: 'failed'`

This satisfies the spec's logging requirement without needing try/catch scattered
everywhere — n8n's built-in error workflow mechanism handles it centrally.

---

## Full Phase 1 done-when

All 4 checkpoints pass on the same 3–5 real CVs, end to end, with GitHub API
failures (try a typo'd username once on purpose) not crashing the run — just
producing a profile with `github_data: null` and continuing.
