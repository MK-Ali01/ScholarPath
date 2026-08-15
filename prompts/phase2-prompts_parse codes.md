# Phase 2 — LLM Prompt Template

## Prompt 3 — Paper Summary + Relevance (node: "Summarize Paper")

**System / instruction:**
```
You are helping a prospective grad student quickly evaluate a research paper
against their intended research domain.

Given the paper's abstract and the student's target domain, produce:
1. A plain-language summary (2-3 sentences, no jargon a non-specialist
   wouldn't understand — explain what the paper actually did and found).
2. A relevance judgment: how well this paper's actual content matches the
   stated domain — not just keyword overlap.

Be honest about weak matches. If the abstract only tangentially relates to
the domain, say so and mark relevance "low" — do not inflate relevance to
seem more useful.

Return ONLY valid JSON, no markdown fences:

{
  "plain_summary": "string",
  "relevance_confidence": "high | medium | low",
  "relevance_reasoning": "string — one sentence on why this confidence level"
}
```

**User message (n8n expression):**
```
TARGET DOMAIN: {{ $json.domain }}

PAPER TITLE: {{ $json.title }}

ABSTRACT: {{ $json.abstract }}
```

Parse with the same try/catch JSON pattern as Phase 1's prompts.

# Codes for Nodes
## Node 5 — Code: Normalize Paper Data

This converts OpenAlex results into the common paper structure.

const domainRec = $('Get Domain Recommendation').first().json;


const domainRecommendationId =
  $('Edit Fields').first().json.domain_recommendation_id ||
  domainRec.id;


const results = $json.results || [];


return results.map(paper => {


  let abstract = '';


  if (paper.abstract_inverted_index) {
    const words = [];


    for (const [word, positions] of Object.entries(
      paper.abstract_inverted_index
    )) {
      for (const position of positions) {
        words[position] = word;
      }
    }


    abstract = words.filter(Boolean).join(' ');
  }


  const authors = (paper.authorships || []).map(author => ({
    name: author.author?.display_name || ''
  }));


  return {
    json: {
      source: 'openalex',


      external_id: paper.id || null,


      title: paper.title || '',


      abstract,


      authors,


      venue:
        paper.primary_location?.source?.display_name || '',


      publication_year:
        paper.publication_year || null,


      citation_count:
        paper.cited_by_count ?? null,


      url:
        paper.primary_location?.landing_page_url ||
        paper.doi ||
        paper.id ||
        null,


      domain:
        domainRec.domain,


      domain_recommendation_id:
        domainRecommendationId
    }
  };
});
### Expected output
{
  "source": "openalex",
  "external_id": "https://openalex.org/W123456",
  "title": "Paper title",
  "abstract": "Paper abstract...",
  "authors": [
    {
      "name": "Author Name"
    }
  ],
  "venue": "Conference Name",
  "publication_year": 2024,
  "citation_count": 120,
  "url": "https://...",
  "domain": "Natural Language Processing",
  "domain_recommendation_id": "UUID"
}

## Node 9 — Code: Parse LLM JSON
let raw = null;


try {
  raw = $json?.candidates?.[0]?.content?.parts?.[0]?.text;


  if (!raw) {
    throw new Error('Gemini returned no text content');
  }


  const cleaned = raw
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();


  const result = JSON.parse(cleaned);


  if (!result.plain_summary) {
    throw new Error('Missing plain_summary');
  }


  if (!['high', 'medium', 'low'].includes(
    result.relevance_confidence
  )) {
    throw new Error('Invalid relevance_confidence');
  }


  if (!result.relevance_reasoning) {
    throw new Error('Missing relevance_reasoning');
  }


  const paper = $('Loop Over Items').item.json;


  return {
    json: {
      source: paper.source,
      external_id: paper.external_id,
      title: paper.title,
      abstract: paper.abstract,
      authors: paper.authors,
      venue: paper.venue,
      publication_year: paper.publication_year,
      citation_count: paper.citation_count,
      url: paper.url,
      domain: paper.domain,
      domain_recommendation_id:
        paper.domain_recommendation_id,


      plain_summary: result.plain_summary,
      relevance_confidence:
        result.relevance_confidence,
      relevance_reasoning:
        result.relevance_reasoning,


      _parse_error: false
    }
  };


} catch (err) {


  const paper = $('Loop Over Items').item.json;


  return {
    json: {
      ...paper,


      plain_summary: null,


      relevance_confidence: 'low',


      relevance_reasoning:
        'LLM response could not be parsed: ' + err.message,


      _parse_error: true,


      _parse_message: err.message,


      _raw_llm_response: raw
    }
  };
}