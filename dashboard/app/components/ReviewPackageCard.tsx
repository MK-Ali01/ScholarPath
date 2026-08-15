import Link from 'next/link';
import { StatusBadge } from './StatusBadge';

interface ReviewPackageCardProps {
  id: string;
  githubUsername: string;
  professorName: string;
  domain?: string | null;
  status: 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
}

export function ReviewPackageCard({
  id,
  githubUsername,
  professorName,
  domain,
  status,
  createdAt,
}: ReviewPackageCardProps) {
  return (
    <Link href={`/review/${id}`} className="review-package-card">
      <div>
        <p className="review-field">
          <strong>Outreach to {professorName}</strong>
        </p>
        <p className="notes">
          On behalf of @{githubUsername}
          {domain ? ` · ${domain}` : ''}
        </p>
      </div>
      <div className="review-package-card-meta">
        <StatusBadge status={status === 'pending_review' ? 'pending' : status} />
        <span className="paper-meta">{new Date(createdAt).toLocaleDateString()}</span>
      </div>
    </Link>
  );
}
