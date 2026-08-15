'use client';

import { useState } from 'react';

export function IntakeForm() {
  const [file, setFile] = useState<File | null>(null);
  const [githubUsername, setGithubUsername] = useState('');
  const [linkedinText, setLinkedinText] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !githubUsername.trim()) {
      setErrorMsg('CV and GitHub username are both required.');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    const formData = new FormData();
    formData.append('cv', file);
    formData.append('github_username', githubUsername.trim());
    if (linkedinText.trim()) formData.append('linkedin_text', linkedinText.trim());

    try {
      const res = await fetch(process.env.NEXT_PUBLIC_N8N_INTAKE_WEBHOOK_URL!, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.success === false) {
        setErrorMsg(data.message || 'Something went wrong processing this candidate.');
        setStatus('error');
        return;
      }

      setStatus('success');
      setFile(null);
      setGithubUsername('');
      setLinkedinText('');
    } catch {
      setErrorMsg('Could not reach the intake pipeline. Check the n8n workflow is running.');
      setStatus('error');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="intake-form">
      <label>
        CV (PDF or DOCX)
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          required
        />
      </label>

      <label>
        GitHub username
        <input
          type="text"
          value={githubUsername}
          onChange={(e) => setGithubUsername(e.target.value)}
          placeholder="e.g. octocat"
          required
        />
      </label>

      <label>
        LinkedIn summary (optional)
        <textarea
          value={linkedinText}
          onChange={(e) => setLinkedinText(e.target.value)}
          rows={3}
        />
      </label>

      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Processing…' : 'Run Pipeline'}
      </button>

      {status === 'error' && <p className="error-flag">{errorMsg}</p>}
      {status === 'success' && <p className="success-flag">Candidate submitted — check the pipeline log below.</p>}
    </form>
  );
}
