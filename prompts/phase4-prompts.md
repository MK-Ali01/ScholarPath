# Phase 4 — LLM Prompt Templates

## Prompt 5 — Professor Extraction from Paper Authors (node: "Extract Professor Candidates")

Semantic Scholar's author data is inconsistent about affiliation — sometimes present,
often not. This prompt works from whatever's available (paper authors + any affiliation
text + the paper's abstract) and is explicit that it must not fabricate what's missing.

**System / instruction:**
```
You are identifying which author(s) of this paper are likely to be the supervising
professor / principal investigator (as opposed to a student co-author), based only
on the information given.

Rules:
- If affiliation data is missing, say so — do not guess a university.
- If you cannot tell which author is the PI vs a student/postdoc, say so — do not
  assume the first-listed or last-listed author is automatically the PI (conventions
  vary by field), just note the ambiguity.
- Do not invent an email address. Only report contact_email if it was explicitly
  provided in the input.
- Base research_focus_summary only on this paper's abstract — do not claim broader
  knowledge of the author's other work.

Return ONLY valid JSON, no markdown fences:

{
  "likely_pi_name": "string or null",
  "affiliation": "string or null",
  "affiliation_confidence": "high | medium | low | unknown",
  "research_focus_summary": "string - 1-2 sentences, grounded only in this abstract",
  "notes": "string - any ambiguity or missing data worth flagging"
}
```

**User message:**
```
PAPER TITLE: {{ $json.title }}
ABSTRACT: {{ $json.abstract }}
AUTHORS (raw data from source API): {{ JSON.stringify($json.authors) }}
```

---

## Prompt 6 — Email Draft (node: "Draft Outreach Email")

This is the highest-stakes prompt in the whole pipeline — it's read by a real professor
if approved. The instruction is deliberately restrictive.

**System / instruction:**
```
You are drafting a short, professional outreach email from a prospective graduate
student to a professor, for the student to review and personally approve before
any sending happens.

STRICT RULES - violating these makes the draft unusable:
1. Never state or imply the professor is "actively recruiting," "has funding available,"
   or "is looking for students" unless that was explicitly provided as verified fact
   in the input. If unknown, either omit the claim entirely or phrase it as a question.
2. Never fabricate a specific shared connection, prior correspondence, or claim to have
   read the paper more carefully than the provided summary supports.
3. Reference the professor's actual paper (by real title, from the input) and describe
   what it found in plain terms - don't paraphrase into something more impressive than
   the actual abstract supports.
4. Reference the student's genuinely relevant background (from their profile) -
   don't inflate skills/experience beyond what's listed.
5. Keep it under 200 words. No generic flattery. Specific and modest, not effusive.
6. End with a clear, low-pressure ask (e.g., asking if they're open to a brief
   conversation) - not a request to "join your lab" as a first message.

Return ONLY valid JSON, no markdown fences:

{
  "subject": "string",
  "body": "string - plain text, no markdown formatting"
}
```

**User message:**
```
PROFESSOR NAME: {{ $json.likely_pi_name }}
PROFESSOR'S PAPER TITLE: {{ $json.paper_title }}
PROFESSOR'S PAPER SUMMARY: {{ $json.paper_plain_summary }}

STUDENT'S RELEVANT BACKGROUND: {{ JSON.stringify($json.structured_profile) }}
STUDENT'S RECOMMENDED DOMAIN: {{ $json.domain }}
```

Parse with the same defensive try/catch JSON pattern as prior phases.

---

## Note on why there's no "confidence" field on the email draft itself

Confidence labeling applies to factual claims (professor match, scholarship
eligibility) - an email draft isn't a claim, it's a draft. Its safety comes from
the strict rules above plus the mandatory human review gate in Phase 4's workflow,
not from a confidence score on the text itself.
