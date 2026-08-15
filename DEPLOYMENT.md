# Phase 5 — Deployment

## The gap that needs addressing first, honestly

Everything built so far assumes n8n is running locally in Docker with a
cloudflared quick tunnel (from Task 2's pattern). That's fine for building
and testing, but it is not production infrastructure for a system you're
calling production-grade:

- Quick tunnel URLs change on container restart - your intake form link,
  the Meta-style webhook pattern, and now the N8N_SEND_EMAIL_WEBHOOK_URL
  all silently break if cloudflared restarts (crash, host reboot, etc.)
- n8n running on your own laptop means the pipeline stops working the
  moment your laptop is off or asleep - not acceptable for something a
  candidate or professor might interact with at unpredictable times
- No monitoring/alerting if a workflow fails silently overnight

**Recommended fix, in order of effort:**

1. **Cheapest / fastest:** keep self-hosted n8n, but move it to a small
   always-on VPS (DigitalOcean/Hetzner, ~$6-12/mo) with a named Cloudflare
   Tunnel (not quick-tunnel mode) pointing a real subdomain at it - stable
   URL, survives reboots via `restart: unless-stopped` the same way your
   Docker Compose already does.
2. **Least maintenance:** n8n Cloud (n8n.io's own hosted offering) - removes
   all Docker/tunnel/VPS management entirely, at the cost of a subscription.
3. Either way: once the URL is stable, update `N8N_SEND_EMAIL_WEBHOOK_URL`
   in Vercel's env vars and the intake form's shared link to match - do this
   once, not per-restart.

This is a decision for you to make based on budget - flagging it rather than
picking for you, since it's a recurring cost either way.

---

## Deploying the dashboard (Vercel)

1. Push the full repo to GitHub (if not already)
2. Vercel → New Project → import the repo
3. **Root Directory:** set to `dashboard` (it's nested, not at repo root)
4. Environment Variables (Project Settings → Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `N8N_SEND_EMAIL_WEBHOOK_URL`
5. Deploy. Vercel auto-detects Next.js from `package.json`.
6. Test the deployed `/review/[id]` page against a real `pending_review`
   row before considering this done - not just the home page.

## Supabase production checklist

- Confirm every migration (`phase1` through `phase4`) has actually been run,
  in order, on your real project (not just tested locally against a
  throwaway one)
- Supabase's free tier pauses inactive projects after ~1 week of no
  activity - if this runs unattended, either keep some minimal weekly
  activity or upgrade before it goes properly "live"
- Double check RLS is enabled on every table (`select tablename from
  pg_tables where rowsecurity = false and schemaname = 'public';` should
  return nothing)

## n8n production checklist

- All 6+ workflows (Phase 1's intake, Phase 2's paper search, Phase 3's
  scholarship matching, Phase 4's Workflow A + Workflow B) set to **Active**
- n8n's built-in Error Workflow (mentioned back in Phase 1) actually
  configured and pointing somewhere you'll see it (email yourself, or a
  dedicated Slack channel) - a failure in an unattended pipeline is
  useless if nothing tells you it happened
- Credentials (Supabase, GitHub, Groq/Gemini, Gmail) are the real
  production ones, not test/personal throwaway accounts, if this is meant
  to run beyond your own testing
