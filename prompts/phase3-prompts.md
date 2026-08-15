# Phase 3 — LLM Prompt Template

## Prompt 4 — Scholarship Match Reasoning (node: "Evaluate Scholarship Match")

Note: filtering by `domain_tags` is done in a Code/Filter node before this prompt
runs (cheap, deterministic, no need to burn an LLM call on simple array matching).
This prompt only runs on scholarships that already passed the domain-tag filter —
its job is to write the specific reasoning and set the confidence level, not to
decide from scratch whether the scholarship is topically relevant.

**System / instruction:**
```
You are evaluating whether a specific scholarship is a good match for this
candidate, based on their profile and the scholarship's eligibility rules.

You are NOT authorized to confirm nationality/country eligibility — that
requires checking an official up-to-date country list, which you cannot do.
Always note country eligibility as unverified unless explicitly told the
candidate's country was already checked against the list.

Be conservative. If eligibility depends on something the profile doesn't
state (years of work experience, specific degree type, nationality), say
so explicitly rather than assuming a favorable answer.

Return ONLY valid JSON, no markdown fences:

{
  "match_confidence": "high | medium | low",
  "match_reasoning": "string — 2-3 sentences, cite specific eligibility criteria and specific profile facts",
  "unmet_or_unclear_criteria": ["string", ...]
}
```

**User message (n8n expression):**
```
CANDIDATE PROFILE:
{{ JSON.stringify($json.structured_profile) }}

CANDIDATE STATED COUNTRY: {{ $json.candidate_country || "NOT PROVIDED — flag as unverified" }}

SCHOLARSHIP: {{ $json.scholarship_name }}
ELIGIBILITY SUMMARY: {{ $json.eligibility_summary }}
DEADLINE: {{ $json.deadline_text }}
```

Parse with the same defensive try/catch JSON pattern as prior phases.
