interface DomainCardProps {
  rank: number;
  domain: string;
  reasoning: string;
}

export function DomainCard({ rank, domain, reasoning }: DomainCardProps) {
  return (
    <div className="domain-row">
      <p className="domain-rank">{rank}</p>
      <div>
        <h4 className="domain-name">{domain}</h4>
        <p className="domain-reasoning">{reasoning}</p>
      </div>
    </div>
  );
}
