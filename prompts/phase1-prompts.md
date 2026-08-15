# Phase 1 — LLM Prompt Templates

Both prompts target Groq (Llama 3.3 70B or similar) or Gemini 2.0 Flash — either works,
both have generous free tiers. Use JSON mode / structured output if your provider
supports it; otherwise instruct strict JSON-only output as below and parse defensively.

---

## Prompt 1 — Profile Structuring (node: "Structure Profile")

**System / instruction:**
```
You are extracting a structured profile from a person's CV text and GitHub data.
Only use information explicitly present in the input — never invent skills,
degrees, or projects that aren't mentioned. If a field can't be determined,
use an empty array or null, not a guess.

Return ONLY valid JSON, no markdown fences, no commentary, matching this shape:

{
  "skills": ["string", ...],
  "education": [
    { "degree": "string", "field": "string", "institution": "string", "year": "string or null" }
  ],
  "projects": [
    { "name": "string", "description": "string", "technologies": ["string", ...] }
  ],
  "publications": ["string", ...],
  "technical_strengths": ["string", ...],
  "apparent_interests": ["string", ...],
  "extraction_notes": "string — flag anything ambiguous, missing, or low-confidence"
}
```

**User message (n8n expression):**
```
CV TEXT:
{{ $json.raw_cv_text }}

GITHUB DATA (repos, languages, README excerpts):
{{ JSON.stringify($json.github_data) }}
```

**Why `extraction_notes` matters:** this is your confidence-labeling hook from the
spec's production-grade requirements — surface it in the dashboard later so a messy
or sparse CV visibly says so, instead of silently producing thin output that looks
just as confident as a strong one.

---

## Prompt 2 — Domain Recommendation (node: "Recommend Domain")

**System / instruction:**
```
You are advising a prospective MPhil/MS applicant on research directions based
on their structured profile. Suggest 1 to 3 candidate research domains.

Ground every suggestion in specific evidence from the profile — reference the
actual skills, projects, or interests that justify it. Do not suggest a domain
the profile gives no real evidence for. If the profile is too thin to support
more than one confident suggestion, return only one and say so.

Return ONLY valid JSON, no markdown fences:

{
  "recommendations": [
    {
      "domain": "string — specific, not just 'Computer Science'",
      "reasoning": "string — 2-3 sentences citing specific profile evidence",
      "confidence": "high | medium | low"
    }
  ]
}
```

**User message (n8n expression):**
```
STRUCTURED PROFILE:
{{ JSON.stringify($json.structured_profile) }}
```

---

## Parsing note (both prompts)

LLM APIs wrap the actual text in a response envelope (Groq: `choices[0].message.content`,
Gemini: `candidates[0].content.parts[0].text`). Add a small Code node after each LLM
call to extract that string and `JSON.parse()` it — wrap in try/catch, and on parse
failure write to `error_log` on the profile row rather than crashing the workflow:

```javascript
try {
  const raw = $input.first().json.choices[0].message.content; // adjust path per provider
  const cleaned = raw.replace(/```json|```/g, '').trim();
  return [{ json: JSON.parse(cleaned) }];
} catch (err) {
  return [{ json: { _parse_error: true, message: err.message, raw: raw ?? null } }];
}
```
