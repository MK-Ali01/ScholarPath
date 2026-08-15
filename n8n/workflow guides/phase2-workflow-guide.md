# Phase 2 — n8n Workflow Build Guide

Extends the Phase 1 workflow. Trigger point: after `status = domain_recommended`
(add this as new nodes continuing the same workflow, or a separate workflow
triggered by a Supabase row-update webhook — either works; separate workflow
is cleaner for testing this phase in isolation, which is the approach below).

Credentials needed: same Groq/Gemini as Phase 1. Semantic Scholar and arXiv
need **no API key** for the request volumes this project will hit — but
Semantic Scholar strongly recommends registering for a free API key to get
a much higher rate limit (100 req/5min vs ~1 req/sec unauthenticated) —
worth doing at OpenAlex Api to avoid Phase 2 stalling
on rate limits during testing.

---

## Node 1 — Manual Trigger (for isolated Phase 2 testing)
- While testing, trigger manually with a hardcoded `domain_recommendation_id`
  and `domain` value pulled from a real Phase 1 test run
- Swap for a proper trigger (Supabase webhook on `domain_recommended` status)
  once Phase 2 itself is verified working

## Node 2 — Supabase: Get Domain Recommendation
- Resource: Row, Operation: Get, Table: `domain_recommendations`
- Filter: `id` = input `domain_recommendation_id`
- Output includes `domain` (the search query) and `profile_id`

## Node 3 — HTTP Request: Semantic Scholar Search
- Method: GET
- URL: `https://api.semanticscholar.org/graph/v1/paper/search`
- Query params:
  - `query`: `{{ $json.domain }}`
  - `fields`: `title,abstract,authors,venue,year,citationCount,url,externalIds`
  - `limit`: `10`
  - `year`: `2020-2026` (recent papers only, per spec's "recent" requirement)
- Header (if you registered): `x-api-key: {{ $credentials.semanticScholarKey }}`
- **On Error: Continue** + **Retry on Fail: 2 attempts, 1500ms wait**
- Add a **Wait node set to 1-2 seconds BEFORE this node** if looping over
  multiple domains — this is the rate-limit pacing requirement

## Node 4 — IF: Semantic Scholar Returned Results?
- Condition: `{{ $json.data.length }}` > 0
- **True →** Node 6 (skip arXiv, Semantic Scholar is primary)
- **False →** Node 5 (fallback to arXiv)

## Node 5 — HTTP Request: arXiv Fallback
- Method: GET
- URL: `http://export.arxiv.org/api/query`
- Query params: `search_query=all:{{ $json.domain }}&sortBy=submittedDate&sortOrder=descending&max_results=10`
- Returns XML, not JSON — add an **XML** node after this to parse it into
  a comparable structure (title, summary, authors, published date)
- Same retry/continue-on-error settings as Node 3

## Node 6 — Code: Normalize Paper Data
- Whichever source responded, map into one consistent shape regardless of origin:
```javascript
return items.map(paper => ({
  json: {
    source: paper._source, // 'semantic_scholar' or 'arxiv'
    external_id: paper.paperId || paper.arxivId,
    title: paper.title,
    abstract: paper.abstract || paper.summary || '',
    authors: paper.authors || [],
    venue: paper.venue || 'arXiv preprint',
    publication_year: paper.year || new Date(paper.published).getFullYear(),
    citation_count: paper.citationCount ?? null,
    url: paper.url || paper.link,
    domain: $('Node 2').item.json.domain,
    domain_recommendation_id: $('Node 2').item.json.id,
  }
}));
```

**✅ Checkpoint 1:** run against 2-3 different domains from your Phase 1 test
CVs. Confirm real, relevant-looking papers come back — not empty results,
not obviously unrelated papers from a too-broad query.

---

## Node 7 — Loop Over Items (Split In Batches)
- Batch size: 1 — process papers one at a time so the LLM summarization
  and rate-limit pacing apply per-paper, not all at once

## Node 8 — Wait
- 1 second — paces the LLM calls too, not just the search APIs

## Node 9 — LLM: Summarize Paper
- Use **Prompt 3** from `prompts/phase2-prompts.md`
- Retry on fail: 2 attempts

## Node 10 — Code: Parse LLM JSON
- Same defensive parsing pattern as Phase 1

## Node 11 — Supabase: Insert Paper Row
- Table: `papers`, all fields from Node 6 + `plain_summary`,
  `relevance_confidence`, `relevance_reasoning` from Node 10

**Loop back to Node 7** until all papers in the batch are processed.

## Node 12 — Supabase: Update Profile Status
- After the loop completes: `status = 'papers_found'` on the parent profile

**✅ Checkpoint 2 (Phase 2 done-when):** run end-to-end on your same 3-5
Phase 1 test profiles. For each: confirm papers were found (or the arXiv
fallback triggered correctly if Semantic Scholar came up empty), every
paper has a plain-language summary that actually reflects its abstract
(spot-check 2-3 manually), and at least one deliberately-mismatched domain
test produces papers correctly marked `relevance_confidence: low` rather
than false high-confidence matches.
