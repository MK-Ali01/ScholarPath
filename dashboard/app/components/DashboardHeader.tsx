interface DashboardHeaderProps {
  candidateCount: number;
  needsReviewCount: number;
  lastRunAt?: string | null;
}

export function DashboardHeader({
  candidateCount,
  needsReviewCount,
  lastRunAt,
}: DashboardHeaderProps) {
  return (
    <header className="masthead">
      <span className="eyebrow">ScholarPath — Pipeline Log</span>
      <h1>Candidate Runs</h1>
      <p className="sub">
        {candidateCount} candidate{candidateCount === 1 ? '' : 's'} processed
        {needsReviewCount > 0 && (
          <>
            {' · '}
            <span className="unverified-flag-inline">
              {needsReviewCount} need{needsReviewCount === 1 ? 's' : ''} review
            </span>
          </>
        )}
        {lastRunAt && <> · last run {new Date(lastRunAt).toLocaleString()}</>}
      </p>
    </header>
  );
}
