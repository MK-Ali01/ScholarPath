import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic'; // always fetch fresh — this is an ops dashboard, not a marketing page

type Paper = {
  id: string;
  title: string;
  plain_summary: string | null;
  relevance_confidence: 'high' | 'medium' | 'low' | null;
  relevance_reasoning: string | null;
  source: string;
  url: string | null;
  publication_year: number | null;
};

type ScholarshipMatch = {
  id: string;
  match_confidence: 'high' | 'medium' | 'low';
  match_reasoning: string;
  country_eligibility_status: string;
  scholarships: {
    name: string;
    country_or_region: string;
    deadline_text: string;
    source_url: string;
    last_verified_on: string;
  };
};

type DomainRec = {
  id: string;
  domain: string;
  reasoning: string;
  rank: number;
  papers: Paper[];
};

type Profile = {
  id: string;
  github_username: string;
  status: string;
  structured_profile: {
    skills?: string[];
    education?: { degree: string; field: string; institution: string; year: string | null }[];
    technical_strengths?: string[];
    extraction_notes?: string;
  } | null;
  created_at: string;
  domain_recommendations: DomainRec[];
  scholarship_matches: ScholarshipMatch[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Queued',
  intake_complete: 'Intake received',
  profile_extracted: 'Profile extracted',
  domain_recommended: 'Domains recommended',
  failed: 'Failed — needs review',
};

type ReviewPackageLink = {
  id: string;
  status: string;
  professors: { name: string } | null;
};

async function getPendingReviews(): Promise<ReviewPackageLink[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('review_packages')
    .select('id, status, professors(name)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load pending reviews: ${error.message}`);
  return (data ?? []) as unknown as ReviewPackageLink[];
}

async function getProfiles(): Promise<Profile[]> {
  const supabase = getServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, github_username, status, structured_profile, created_at, domain_recommendations(id, domain, reasoning, rank, papers(id, title, plain_summary, relevance_confidence, relevance_reasoning, source, url, publication_year)), scholarship_matches(id, match_confidence, match_reasoning, country_eligibility_status, scholarships(name, country_or_region, deadline_text, source_url, last_verified_on))')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to load profiles: ${error.message}`);
  return (data ?? []) as unknown as Profile[];
}

export default async function DashboardPage() {
  const [profiles, pendingReviews] = await Promise.all([getProfiles(), getPendingReviews()]);

  return (
    <main className="page">
      <header className="masthead">
        <span className="eyebrow">ScholarPath — Pipeline Log</span>
        <h1>Candidate Runs</h1>
        <p className="sub">Intake through outreach — full pipeline status</p>
      </header>

      {pendingReviews.length > 0 && (
        <div className="review-banner">
          <span>
            {pendingReviews.length} email{pendingReviews.length > 1 ? 's' : ''} awaiting your review
          </span>
          <div className="review-banner-links">
            {pendingReviews.map((r) => (
              <a key={r.id} href={`/review/${r.id}`} className="review-banner-link">
                Review draft to {r.professors?.name ?? 'professor'} →
              </a>
            ))}
          </div>
        </div>
      )}

      {profiles.length === 0 ? (
        <p className="empty">No runs yet. Submit the intake form to see a candidate here.</p>
      ) : (
        <div className="runs">
          {profiles.map((p) => (
            <article key={p.id} className="run-card">
              <div className="run-header">
                <h2>@{p.github_username}</h2>
                <span className={`status status-${p.status}`}>
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>

              {p.structured_profile ? (
                <div className="profile-block">
                  {p.structured_profile.extraction_notes && (
                    <p className="notes">⚠ {p.structured_profile.extraction_notes}</p>
                  )}
                  {p.structured_profile.skills && p.structured_profile.skills.length > 0 && (
                    <div className="tags">
                      {p.structured_profile.skills.slice(0, 8).map((s) => (
                        <span key={s} className="tag">{s}</span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="pending-text">Profile extraction pending…</p>
              )}

              {p.domain_recommendations && p.domain_recommendations.length > 0 && (
                <div className="domains">
                  {[...p.domain_recommendations]
                    .sort((a, b) => a.rank - b.rank)
                    .map((d) => (
                      <div key={d.id} className="domain-row">
                        <span className="domain-rank">{d.rank}</span>
                        <div>
                          <div className="domain-name">{d.domain}</div>
                          <p className="domain-reasoning">{d.reasoning}</p>

                          {d.papers && d.papers.length > 0 && (
                            <div className="papers">
                              {d.papers.map((paper) => (
                                <div key={paper.id} className="paper-row">
                                  <div className="paper-head">
                                    <a href={paper.url ?? '#'} target="_blank" rel="noreferrer" className="paper-title">
                                      {paper.title}
                                    </a>
                                    {paper.relevance_confidence && (
                                      <span className={`confidence confidence-${paper.relevance_confidence}`}>
                                        {paper.relevance_confidence}
                                      </span>
                                    )}
                                  </div>
                                  {paper.plain_summary && (
                                    <p className="paper-summary">{paper.plain_summary}</p>
                                  )}
                                  <span className="paper-meta">
                                    {paper.source === 'semantic_scholar' ? 'Semantic Scholar' : 'arXiv'}
                                    {paper.publication_year ? ` · ${paper.publication_year}` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {p.scholarship_matches && p.scholarship_matches.length > 0 && (
                <div className="scholarships">
                  <h3 className="section-label">Scholarship Matches</h3>
                  {[...p.scholarship_matches]
                    .sort((a, b) => {
                      const order = { high: 0, medium: 1, low: 2 };
                      return order[a.match_confidence] - order[b.match_confidence];
                    })
                    .map((m) => (
                      <div key={m.id} className="scholarship-row">
                        <div className="scholarship-head">
                          <a href={m.scholarships.source_url} target="_blank" rel="noreferrer" className="scholarship-name">
                            {m.scholarships.name}
                          </a>
                          <span className={`confidence confidence-${m.match_confidence}`}>
                            {m.match_confidence}
                          </span>
                        </div>
                        <p className="scholarship-reasoning">{m.match_reasoning}</p>
                        <div className="scholarship-meta">
                          <span>{m.scholarships.country_or_region}</span>
                          <span>·</span>
                          <span>{m.scholarships.deadline_text}</span>
                        </div>
                        {m.country_eligibility_status === 'not_verified' && (
                          <p className="unverified-flag">
                            ⚠ Country eligibility not verified — confirm manually before relying on this match
                          </p>
                        )}
                        <span className="verified-date">
                          Scholarship data last verified {new Date(m.scholarships.last_verified_on).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              <time className="timestamp">
                {new Date(p.created_at).toLocaleString()}
              </time>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
