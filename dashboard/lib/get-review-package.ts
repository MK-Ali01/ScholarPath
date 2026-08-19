// import { getServerSupabase } from './supabase-server';

// export type ReviewPackage = {
//   id: string;
//   status: string;
//   drafted_email_subject: string;
//   drafted_email_body: string;
//   edited_email_subject: string | null;
//   edited_email_body: string | null;
//   reviewer_notes: string | null;
//   profiles: {
//     github_username: string;
//     structured_profile: Record<string, unknown> | null;
//   };
//   professors: {
//     name: string;
//     affiliation: string | null;
//     contact_email: string | null;
//     identification_confidence: string;
//     identification_notes: string | null;
//   };
//   domain_recommendations: { domain: string; reasoning: string } | null;
// };

// export async function getReviewPackage(id: string): Promise<ReviewPackage | null> {
//   const supabase = getServerSupabase();
//   const { data, error } = await supabase
//     .from('review_packages')
//     .select(
//       `id, status, drafted_email_subject, drafted_email_body, edited_email_subject, edited_email_body, reviewer_notes,
//        profiles(github_username, structured_profile),
//        professors(name, affiliation, contact_email, identification_confidence, identification_notes),
//        domain_recommendations(domain, reasoning)`
//     )
//     .eq('id', id)
//     .single();

//   if (error) {
//     if (error.code === 'PGRST116') return null; // no row found
//     throw new Error(`Failed to load review package: ${error.message}`);
//   }
//   return data as unknown as ReviewPackage;
// }
