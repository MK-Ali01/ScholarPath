'use client';

import { useEffect, useState } from 'react';

const STAGE_ORDER = [
  'intake_complete',
  'profile_extracted',
  'domain_recommended',
  'papers_found',
  'scholarships_matched',
  'awaiting_review',
  'completed',
];

const STAGE_LABEL: Record<string, string> = {
  pending: 'Queued',
  intake_complete: 'Intake received — starting extraction…',
  profile_extracted: 'Profile extracted — recommending domain…',
  domain_recommended: 'Domain recommended — searching papers…',
  papers_found: 'Papers found — matching scholarships…',
  scholarships_matched: 'Scholarships matched — identifying professors…',
  awaiting_review: 'Draft ready — awaiting human review',
  completed: 'Complete',
  failed: 'Failed',
};

export default function ProfileStatusPage({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch(`/api/profile-status/${params.id}`, { cache: 'no-store' });
        const json = await res.json();
        if (!active) return;
        if (!res.ok) { setErrorMsg(json.error); return; }
        setData(json);
      } catch {
        if (active) setErrorMsg('Lost connection while polling.');
      }
    }
    poll();
    const interval = setInterval(poll, 3000);
    return () => { active = false; clearInterval(interval); };
  }, [params.id]);

  if (errorMsg) return <main className="page"><p className="empty">{errorMsg}</p></main>;
  if (!data) return <main className="page"><p className="empty">Loading…</p></main>;

  const stageIndex = STAGE_ORDER.indexOf(data.status);
  const isDone = data.status === 'completed' || data.status === 'awaiting_review';
  const isFailed = data.status === 'failed';

  return (
    <main className="page">
      <header className="masthead">
        <span className="eyebrow">ScholarPath — Live Status</span>
        <h1>@{data.github_username}</h1>
        <p className="sub">{STAGE_LABEL[data.status] ?? data.status}</p>
      </header>

      {!isDone && !isFailed && (
        <div className="progress-track">
          {STAGE_ORDER.map((stage, i) => (
            <div key={stage} className={`progress-step ${i <= stageIndex ? 'progress-step-done' : ''}`} />
          ))}
        </div>
      )}

      {isFailed && (
        <p className="unverified-flag">
          ⚠ Pipeline failed. {data.error_log?.length ? data.error_log[data.error_log.length - 1]?.message : ''}
        </p>
      )}

      {data.structured_profile && (
        <div className="run-card">
          <h3 className="section-label">Extracted Profile</h3>
          <div className="tags">
            {(data.structured_profile.skills ?? []).slice(0, 8).map((s: string) => (
              <span key={s} className="tag">{s}</span>
            ))}
          </div>
        </div>
      )}

      {data.domain_recommendations?.map((d: any) => (
        <div key={d.id} className="run-card">
          <h3 className="section-label">Recommended Domain</h3>
          <div className="domain-name">{d.domain}</div>
          <p className="domain-reasoning">{d.reasoning}</p>

          {d.papers?.length > 0 && (
            <div className="papers">
              {d.papers.map((paper: any) => (
                <div key={paper.id} className="paper-row">
                  <div className="paper-head">
                    <a href={paper.url ?? '#'} target="_blank" rel="noreferrer" className="paper-title">{paper.title}</a>
                    {paper.relevance_confidence && (
                      <span className={`confidence confidence-${paper.relevance_confidence}`}>{paper.relevance_confidence}</span>
                    )}
                  </div>
                  {paper.plain_summary && <p className="paper-summary">{paper.plain_summary}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {data.scholarship_matches?.length > 0 && (
        <div className="run-card">
          <h3 className="section-label">Scholarship Matches</h3>
          {data.scholarship_matches.map((m: any) => (
            <div key={m.id} className="scholarship-row">
              <div className="scholarship-head">
                <span className="scholarship-name">{m.scholarships.name}</span>
                <span className={`confidence confidence-${m.match_confidence}`}>{m.match_confidence}</span>
              </div>
              <p className="scholarship-reasoning">{m.match_reasoning}</p>
            </div>
          ))}
        </div>
      )}

      {data.status === 'awaiting_review' && (
        <p className="review-message">A draft outreach email is ready — check the home page's review banner.</p>
      )}
    </main>
  );
}
