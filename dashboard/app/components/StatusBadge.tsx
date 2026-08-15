const LABELS: Record<string, string> = {
  intake_received: 'Intake received',
  profile_extracted: 'Profile extracted',
  domain_recommended: 'Domains recommended',
  papers_found: 'Research papers found',
  failed: 'Failed',
  pending: 'Profile extraction pending',
};

// Maps a raw pipeline stage/status string to the right CSS modifier.
// Anything not explicitly "failed" falls back to the default brass
// "in progress" look already defined for .status in globals.css.
function statusClass(status: string) {
  if (status === 'failed') return 'status-failed';
  if (status === 'domain_recommended' || status === 'papers_found') {
    return 'status-domain_recommended'; // reuses the existing green "ok" style
  }
  return '';
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status ${statusClass(status)}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
