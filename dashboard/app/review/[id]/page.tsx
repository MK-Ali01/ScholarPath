import { getReviewPackage } from '@/lib/get-review-package';
import { ReviewForm } from './ReviewForm';

export const dynamic = 'force-dynamic';

export default async function ReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const pkg = await getReviewPackage(params.id);

  if (!pkg) {
    return (
      <main className="page">
        <p className="empty">No review package found for this ID.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <header className="masthead">
        <span className="eyebrow">
          Human Review — Required Before Send
        </span>

        <h1>Outreach to {pkg.professors.name}</h1>

        <p className="sub">
          On behalf of @{pkg.profiles.github_username}
          {pkg.domain_recommendations
            ? ` · ${pkg.domain_recommendations.domain}`
            : ''}
        </p>
      </header>

      <div className="review-card">
        <section className="review-section">
          <h3 className="section-label">Professor Identification</h3>

          <p className="review-field">
            <strong>Name:</strong> {pkg.professors.name}
          </p>

          <p className="review-field">
            <strong>Affiliation:</strong>{' '}
            {pkg.professors.affiliation ?? 'Not determined'}
          </p>

          <p className="review-field">
            <strong>Contact email:</strong>{' '}
            {pkg.professors.contact_email ?? (
              <span className="unverified-flag-inline">
                Not found — cannot send without this
              </span>
            )}
          </p>

          <p
            className={`confidence confidence-${pkg.professors.identification_confidence}`}
          >
            {pkg.professors.identification_confidence} confidence
          </p>

          {pkg.professors.identification_notes && (
            <p className="notes">
              ⚠ {pkg.professors.identification_notes}
            </p>
          )}
        </section>

        <ReviewForm reviewPackage={pkg} />
      </div>
    </main>
  );
}