interface PaperCardProps {
  title: string;
  url: string;
  summary: string;
  source: string;
  year: number | string;
  confidence: 'high' | 'medium' | 'low';
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
    <div className="paper-row">
      <div className="paper-head">
        <a href={url} target="_blank" rel="noreferrer" className="paper-title">
          {title}
        </a>
        <span className={`confidence confidence-${confidence}`}>
          {confidence}
        </span>
      </div>
      <p className="paper-summary">{summary}</p>
      <p className="paper-meta">
        {source} · {year}
      </p>
    </div>
  );
}
