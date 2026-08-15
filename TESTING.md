# Phase 5 — End-to-End Test Plan

Run these against the deployed system (not localhost), with the real
production Supabase project and real n8n instance, before calling this done.

## Test set — reuse your existing 3-5 CVs from Phase 1, plus these additions

| # | Scenario | What it's testing |
|---|---|---|
| 1 | Clean, strong CV + active GitHub | The "happy path" - should sail through all 4 phases with high-confidence output throughout |
| 2 | Sparse CV, minimal GitHub activity | `extraction_notes` and confidence fields should visibly reflect the thinness - not fake confidence |
| 3 | CV in an unusual format (multi-column, scanned-looking) | Extract from File shouldn't silently mangle this into garbage that flows downstream undetected |
| 4 | Deliberately narrow/obscure research domain | Phase 2's arXiv fallback should trigger; Phase 3 matches should skew toward `low` confidence honestly |
| 5 | Invalid/typo'd GitHub username | Should NOT crash the run - `github_data: null`, profile still completes from CV alone |
| 6 | A profile where no professor can be confidently identified | Phase 4 should stop and mark `failed` with a clear `error_log` entry - not draft an email to a guessed name |
| 7 | A profile where a professor IS identified but no email found | Review page should visibly block the Approve button (already built) - confirm this in the actual browser, not just code review |
| 8 | Full happy-path run through actual send | Approve a review package pointed at your own email (temporarily override `contact_email`) - confirm delivery, correct subject/body, matches what was shown in review |
| 9 | Reject flow | Reject a review package - confirm `status = 'rejected'`, confirm Workflow B never fires (check n8n execution list has no new execution for it) |
| 10 | Double-approve attempt | Try clicking Approve twice fast, or reloading and re-submitting - confirm the `.eq('status', 'pending_review')` guards in the API route actually prevent a double-send |

## What "done" means for Phase 5, concretely

- All 10 scenarios above pass on the deployed (not local) system
- At least one real end-to-end run, from CV upload through an actual received
  email in your own inbox, with every intermediate step visible and correct
  in the dashboard
- Error Workflow fires and is visible somewhere when you deliberately break
  something (e.g., temporarily use an invalid Groq API key and confirm you
  get notified, then revert)
- Dashboard shows sensible states for every status value a profile can be
  in - not just the happy path (currently the dashboard renders `status`
  labels but doesn't have distinct visual treatment for `failed` - worth
  adding a red state there before calling this finished, flagging rather
  than silently leaving it)

## One thing this test plan does NOT cover, on purpose

Actually sending unsolicited email to a real, unaware professor as a "test."
Every send test in this plan targets your own inbox. The first real send to
an actual professor should be a deliberate, single, human decision - not
something that happens as a side effect of testing infrastructure.
