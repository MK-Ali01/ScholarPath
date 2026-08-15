import { StatusBadge } from './StatusBadge';

interface Profile {
  skills: string[];
  education: { degree: string; institution: string; year?: string }[];
  projects: { name: string; description: string }[];
  publications: string[];
  technical_strengths: string[];
  apparent_interests: string[];
  github_summary?: {
    repo_count?: number;
    languages?: Record<string, number>;
  };
}

interface ProfileCardProps {
  githubUsername: string;
  profile: Profile | null;
  cvNeedsReview: boolean;
  extractionWarning?: string | null;
}

export function ProfileCard({
  githubUsername,
  profile,
  cvNeedsReview,
  extractionWarning,
}: ProfileCardProps) {
  return (
    <section className="review-section">
      <div className="section-header-row">
        <h3 className="section-label">Profile — @{githubUsername}</h3>
        {cvNeedsReview && <StatusBadge status="needs_review" />}
      </div>

      {extractionWarning && <p className="notes">⚠ {extractionWarning}</p>}

      {!profile ? (
        <p className="empty">No profile extracted yet.</p>
      ) : (
        <>
          {profile.skills?.length > 0 && (
            <p className="review-field">
              <strong>Skills:</strong> {profile.skills.join(', ')}
            </p>
          )}

          {profile.education?.length > 0 && (
            <div className="review-field">
              <strong>Education:</strong>
              <ul>
                {profile.education.map((e, i) => (
                  <li key={i}>
                    {e.degree} — {e.institution}
                    {e.year ? ` (${e.year})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.projects?.length > 0 && (
            <div className="review-field">
              <strong>Projects:</strong>
              <ul>
                {profile.projects.map((p, i) => (
                  <li key={i}>
                    <strong>{p.name}</strong> — {p.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {profile.publications?.length > 0 && (
            <p className="review-field">
              <strong>Publications:</strong> {profile.publications.join('; ')}
            </p>
          )}

          {profile.github_summary && (
            <p className="review-field">
              <strong>GitHub:</strong> {profile.github_summary.repo_count ?? 0} repos
              {profile.github_summary.languages &&
                ' · ' + Object.keys(profile.github_summary.languages).join(', ')}
            </p>
          )}
        </>
      )}
    </section>
  );
}
