import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// This route is the ONLY place in the whole system that can trigger an
// actual email send — it requires a real POST from the review UI's
// Approve button, which requires a human to have looked at the draft.
export async function POST(req: NextRequest) {
  const { reviewPackageId, action, editedSubject, editedBody, reviewerNotes } =
    await req.json();

  if (!reviewPackageId || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ error: 'Server is missing Supabase configuration' }, { status: 500 });
  }

  if (action === 'reject') {
    const { error } = await supabase
      .from('review_packages')
      .update({
        status: 'rejected',
        edited_email_subject: editedSubject,
        edited_email_body: editedBody,
        reviewer_notes: reviewerNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', reviewPackageId)
      .eq('status', 'pending_review'); // guard: can't reject an already-decided package

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // action === 'approve'
  const { error: updateError } = await supabase
    .from('review_packages')
    .update({
      status: 'approved',
      edited_email_subject: editedSubject,
      edited_email_body: editedBody,
      reviewer_notes: reviewerNotes,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', reviewPackageId)
    .eq('status', 'pending_review'); // guard: can't approve twice

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Trigger the n8n "Send Approved Email" webhook (Workflow B).
  const sendWebhookUrl = process.env.N8N_SEND_EMAIL_WEBHOOK_URL;
  if (!sendWebhookUrl) {
    return NextResponse.json(
      { error: 'N8N_SEND_EMAIL_WEBHOOK_URL is not configured' },
      { status: 500 }
    );
  }

  try {
    const n8nRes = await fetch(sendWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_package_id: reviewPackageId }),
    });
    const n8nData = await n8nRes.json().catch(() => ({}));

    if (!n8nRes.ok || n8nData.success === false) {
      // The approval itself is already saved — this only reflects the send outcome.
      return NextResponse.json(
        { error: 'Approved, but the send failed. Check n8n execution logs.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Approved, but could not reach the send workflow. Check the tunnel is running.' },
      { status: 502 }
    );
  }
}
