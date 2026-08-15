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
    <Link href={`/review/${id}`} className="run-card" style={{ display: 'block', textDecoration: 'none' }}>
      <div className="run-header">
        <h2>Outreach to {professorName}</h2>
        <StatusBadge status={status === 'pending_review' ? 'pending' : status} />
      </div>
      <p className="pending-text">
        On behalf of @{githubUsername}
        {domain ? ` · ${domain}` : ''}
      </p>
      <span className="timestamp">{new Date(createdAt).toLocaleString()}</span>
    </Link>
  );
}
