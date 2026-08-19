import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

// This route replaces n8n's Form Trigger as the intake point. It does the
// storage upload + profile row creation directly (same as Phase 1 Nodes 2-3
// in the workflow guide), then calls an n8n webhook to hand off the rest of
// the pipeline (extraction onward) by profile_id.
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get('cv') as File | null;
  const githubUsername = formData.get('github_username') as string | null;
  const candidateCountry = (formData.get('candidate_country') as string | null) || null;

  if (!file || !githubUsername) {
    return NextResponse.json({ error: 'CV file and GitHub username are required' }, { status: 400 });
  }

  const supabase = getServerSupabase();

  // 1. Upload CV to the 'cvs' storage bucket
  const filePath = `${Date.now()}-${file.name}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from('cvs')
    .upload(filePath, fileBuffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
  }

  // 2. Create the profile row
  const { data: profile, error: insertError } = await supabase
    .from('profiles')
    .insert({
      github_username: githubUsername,
      cv_file_path: filePath,
      candidate_country: candidateCountry,
      status: 'intake_complete',
    })
    .select('id')
    .single();

  if (insertError) {
    return NextResponse.json({ error: `Database error: ${insertError.message}` }, { status: 500 });
  }

  // 3. Hand off to n8n to run the rest of the pipeline (Phase 1 extraction
  // onward). This webhook needs to exist on the n8n side - see the note
  // below the code for the small workflow change needed.
  const pipelineWebhookUrl = process.env.N8N_START_PIPELINE_WEBHOOK_URL;
  if (pipelineWebhookUrl) {
    try {
      await fetch(pipelineWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profile.id }),
      });
    } catch {
      // Don't fail the request over this - the profile exists and can be
      // manually re-triggered. Surface it as a soft warning instead.
      return NextResponse.json({
        profile_id: profile.id,
        warning: 'Profile created, but could not reach the pipeline webhook. Check the tunnel is running.',
      });
    }
  }

  return NextResponse.json({ profile_id: profile.id });
}
