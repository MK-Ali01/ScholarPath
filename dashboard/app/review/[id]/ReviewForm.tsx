'use client';

import { useState } from 'react';
import type { ReviewPackage } from '@/lib/get-review-package';

export function ReviewForm({ reviewPackage }: { reviewPackage: ReviewPackage }) {
  const [subject, setSubject] = useState(
    reviewPackage.edited_email_subject ?? reviewPackage.drafted_email_subject
  );
  const [body, setBody] = useState(
    reviewPackage.edited_email_body ?? reviewPackage.drafted_email_body
  );
  const [notes, setNotes] = useState(reviewPackage.reviewer_notes ?? '');
  const [status, setStatus] = useState(reviewPackage.status);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const alreadyDecided = status !== 'pending_review';
  const canApprove = !!reviewPackage.professors.contact_email;

  async function submit(action: 'approve' | 'reject') {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch('/api/review-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewPackageId: reviewPackage.id,
          action,
          editedSubject: subject,
          editedBody: body,
          reviewerNotes: notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Request failed');
      setStatus(action === 'approve' ? 'sent' : 'rejected');
      setMessage(
        action === 'approve'
          ? 'Approved and sent successfully.'
          : 'Marked as rejected. Nothing was sent.'
      );
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="review-section">
      <h3 className="section-label">Drafted Email — Edit Before Approving</h3>

      <label className="field-label">Subject</label>
      <input
        className="field-input"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        disabled={alreadyDecided}
      />

      <label className="field-label">Body</label>
      <textarea
        className="field-textarea"
        rows={12}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={alreadyDecided}
      />

      <label className="field-label">Reviewer notes (optional, kept for your records)</label>
      <textarea
        className="field-textarea"
        rows={2}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={alreadyDecided}
      />

      {!canApprove && !alreadyDecided && (
        <p className="unverified-flag">
          ⚠ No contact email was found for this professor — approving is disabled until
          one is added directly in Supabase.
        </p>
      )}

      {alreadyDecided ? (
        <p className={`decision-banner decision-${status}`}>
          This package is already marked: {status}
        </p>
      ) : (
        <div className="review-actions">
          <button
            className="btn btn-approve"
            disabled={busy !== null || !canApprove}
            onClick={() => submit('approve')}
          >
            {busy === 'approve' ? 'Sending…' : 'Approve & Send'}
          </button>
          <button
            className="btn btn-reject"
            disabled={busy !== null}
            onClick={() => submit('reject')}
          >
            {busy === 'reject' ? 'Saving…' : 'Reject'}
          </button>
        </div>
      )}

      {message && <p className="review-message">{message}</p>}
    </section>
  );
}
