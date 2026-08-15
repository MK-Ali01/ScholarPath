import { StatusBadge } from './StatusBadge';

interface Profile {
  skills: string[];
  education: { degree: string; institution: string; year?: string }[];
  projects: { name: string; description: string }[];
  publications: string[];
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
    <div className="run-card">
      <div className="run-header">
        <h2>@{githubUsername}</h2>
        {cvNeedsReview && <StatusBadge status="failed" />}
      </div>

      {extractionWarning && <p className="notes">⚠ {extractionWarning}</p>}

      {!profile ? (
        <p className="pending-text">Profile extraction pending…</p>
      ) : (
        <>
          {profile.skills?.length > 0 && (
            <div className="tags">
              {profile.skills.map((s, i) => (
                <span key={i} className="tag">{s}</span>
              ))}
            </div>
          )}

          {profile.education?.length > 0 && (
            <p className="paper-meta">
              {profile.education
                .map((e) => `${e.degree} — ${e.institution}${e.year ? ` (${e.year})` : ''}`)
                .join(' · ')}
            </p>
          )}

          {profile.projects?.length > 0 && (
            <div className="scholarships">
              <p className="section-label">Projects</p>
              {profile.projects.map((p, i) => (
                <div key={i} className="scholarship-row">
                  <p className="scholarship-name" style={{ textDecoration: 'none' }}>{p.name}</p>
                  <p className="scholarship-reasoning">{p.description}</p>
                </div>
              ))}
            </div>
          )}

          {profile.github_summary && (
            <p className="paper-meta">
              {profile.github_summary.repo_count ?? 0} repos
              {profile.github_summary.languages &&
                ' · ' + Object.keys(profile.github_summary.languages).join(', ')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
