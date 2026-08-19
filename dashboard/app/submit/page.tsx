'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SubmitPage() {
  const [file, setFile] = useState<File | null>(null);
  const [githubUsername, setGithubUsername] = useState('');
  const [candidateCountry, setCandidateCountry] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !githubUsername) {
      setError('CV file and GitHub username are both required.');
      return;
    }
    setBusy(true);
    setError(null);

    const formData = new FormData();
    formData.append('cv', file);
    formData.append('github_username', githubUsername);
    formData.append('candidate_country', candidateCountry);

    try {
      const res = await fetch('/api/submit-intake', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Submission failed');
      router.push(`/profile/${data.profile_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <header className="masthead">
        <span className="eyebrow">ScholarPath — Intake</span>
        <h1>Submit a Candidate</h1>
        <p className="sub">CV + GitHub username to start the pipeline</p>
      </header>

      <form onSubmit={handleSubmit} className="review-card" style={{ maxWidth: 480 }}>
        <label className="field-label">CV file (PDF or DOCX)</label>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
        />

        <label className="field-label">GitHub username</label>
        <input
          className="field-input"
          value={githubUsername}
          onChange={(e) => setGithubUsername(e.target.value)}
          disabled={busy}
          placeholder="octocat"
        />

        <label className="field-label">Country of citizenship (optional, improves scholarship matching)</label>
        <input
          className="field-input"
          value={candidateCountry}
          onChange={(e) => setCandidateCountry(e.target.value)}
          disabled={busy}
          placeholder="e.g. Pakistan"
        />

        {error && <p className="unverified-flag" style={{ marginTop: 16 }}>{error}</p>}

        <button type="submit" className="btn btn-approve" disabled={busy} style={{ marginTop: 20 }}>
          {busy ? 'Submitting…' : 'Submit & Start Pipeline'}
        </button>
      </form>
    </main>
  );
}
