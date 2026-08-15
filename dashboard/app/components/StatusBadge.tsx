type Status =
  | 'success'
  | 'failed'
  | 'pending'
  | 'needs_review'
  | 'flagged'
  | 'approved'
  | 'rejected';

const LABELS: Record<Status, string> = {
  success: 'Complete',
  failed: 'Failed',
  pending: 'Pending',
  needs_review: 'Needs Review',
  flagged: 'Flagged',
  approved: 'Approved',
  rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`status-badge status-badge-${status}`}>
      {LABELS[status] ?? status}
    </span>
  );
}
