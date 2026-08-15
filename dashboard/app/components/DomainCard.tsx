interface DomainCardProps {
  rank: number;
  domain: string;
  reasoning: string;
}

export function DomainCard({ rank, domain, reasoning }: DomainCardProps) {
  return (
    <div className="review-field domain-card">
      <p className="domain-rank">{rank}</p>
      <div>
        <h4 className="domain-name">{domain}</h4>
        <p className="notes">{reasoning}</p>
      </div>
    </div>
  );
}
