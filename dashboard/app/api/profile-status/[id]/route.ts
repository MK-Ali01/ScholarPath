import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `id, github_username, status, error_log, structured_profile, created_at,
       domain_recommendations(id, domain, reasoning, rank,
         papers(id, title, plain_summary, relevance_confidence, url, source, publication_year)
       ),
       scholarship_matches(id, match_confidence, match_reasoning, country_eligibility_status,
         scholarships(name, country_or_region, deadline_text, source_url)
       )`
    )
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
  return NextResponse.json(data);
}
