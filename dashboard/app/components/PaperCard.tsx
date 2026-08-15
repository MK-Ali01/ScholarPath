interface PaperCardProps {
  title: string;
  url: string;
  summary: string;
  source: string;
  year: number | string;
  confidence: 'high' | 'low';
}

export function PaperCard({
  title,
  url,
  summary,
  source,
  year,
  confidence,
}: PaperCardProps) {
  return (
    <div className="review-field paper-card">
      <a href={url} target="_blank" rel="noreferrer" className="paper-title">
        {title}
      </a>
      <span className={`confidence confidence-${confidence}`}>
        {confidence} confidence
      </span>
      <p className="notes">{summary}</p>
      <p className="paper-meta">
        {source} · {year}
      </p>
    </div>
  );
}
