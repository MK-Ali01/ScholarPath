interface ProfessorCardProps {
  name: string;
  affiliation?: string | null;
  contactEmail?: string | null;
  identificationConfidence: 'high' | 'medium' | 'low';
  identificationNotes?: string | null;
}

export function ProfessorCard({
  name,
  affiliation,
  contactEmail,
  identificationConfidence,
  identificationNotes,
}: ProfessorCardProps) {
  return (
    <section className="review-section">
      <h3 className="section-label">Professor Identification</h3>
      <p className="review-field">
        <strong>Name:</strong> {name}
      </p>
      <p className="review-field">
        <strong>Affiliation:</strong> {affiliation ?? 'Not determined'}
      </p>
      <p className="review-field">
        <strong>Contact email:</strong>{' '}
        {contactEmail ?? (
          <span className="unverified-flag-inline">
            Not found — cannot send without this
          </span>
        )}
      </p>
      <p className={`confidence confidence-${identificationConfidence}`}>
        {identificationConfidence} confidence
      </p>
      {identificationNotes && <p className="notes">⚠ {identificationNotes}</p>}
    </section>
  );
}
