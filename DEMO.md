# Koudou — Demo

There's a private demo of Koudou running at **https://koudou.pages.dev/**.

This doc explains:
- **For visitors:** how to access the demo and what's in it.
- **For me (April):** how to share access — and rotate the gate when needed.
- **For forkers:** how to host your own private demo.

---

## For visitors

The deployment at `koudou.pages.dev` is a private demo, gated by a shared invite code while Koudou stays in personal-tool scope.

**To access:**

1. Email **april.dawn1019@gmail.com** for the current invite code. Include a sentence on what brought you to the project — I'm sharing this informally and like to know who I'm letting in.
2. Open https://koudou.pages.dev/. Enter your email + the invite code → click **Email me a magic link**.
3. Open the email from Supabase Auth, click the link. You're signed in.
4. Land on `/today`. Your account is empty — that's expected.
5. Open **Getting Started** in the sidebar → click **Run demo seed**.

**What the seed gives you:**

- Synthetic profile **Riley Aldridge** (12+ years senior product leadership, B2B SaaS) — including a full resume that drives the AI features.
- **8 target companies** across three tiers (dream / strong / interested).
- **9 contacts** at warmth levels Champion / Warm / Cold, linked to those companies.
- **10 jobs** spanning all four pipeline stages (applied, screening, interview, offer).
- **4 activities** on the focal GitLab VP Product job.
- **2 interviews** scheduled in the next 7 days.
- **1 milestone** (first interview celebration).

You can then exercise every page — Today, Jobs, Interviews, Network, Target Companies — and try the AI features end-to-end:

- **AI Job Search** at `/search` — uses Anthropic's web_search tool to find real currently-open postings on job boards (LinkedIn, Greenhouse, Lever, Wellfound, company careers pages). Each result is labeled: "Web result" (real URL, found in search) or "AI Suggestion" (fallback when web search returns sparse results, points to the company's careers page only). ~10–25 sec per call (web searches are slower than pure AI calls). **Limit: 10 / day per user.**
- **Cover Letters** at `/letters` — drafts a 3–4 paragraph letter against any job in your pipeline. ~3–8 sec per call. **Limit: 5 / day per user.**
- **Skill Gap** at `/insights` (Skill Gap tab) — analyzes your profile against your active pipeline. Quality improves once real Web result jobs are saved to your pipeline (the skill-extraction pipeline that auto-tags jobs is being rebuilt — Session 6.3).
- **Weekly Plan** at `/insights` (Weekly Plan tab) — drafts a 3-5 action plan for the upcoming week based on funnel state + entity context. Works on whatever pipeline state exists.

The daily caps keep AI costs predictable on my Anthropic budget ($25/mo hard cap on the dev key). If you hit a limit, try tomorrow.

**Re-seeding:** the **Run demo seed** button always wipes your existing data first, so you can reset whenever you want a clean state. It does not touch your sign-in or auth.

**Privacy:** all data is scoped per-user via Postgres RLS. Other demo users cannot see your seeded data.

---

## For me (sharing access)

The flow is now self-service. You share two things with anyone you want to let in:

1. **The URL:** https://koudou.pages.dev/
2. **The current invite code** (whatever you set `VITE_DEMO_INVITE_CODE` to in Cloudflare).

That's it. They sign themselves up via magic link. No Google Cloud Console, no per-user setup.

### Setting / rotating the invite code

1. **Cloudflare Pages dashboard** → koudou project → **Settings** → **Environment variables** → **Production** → set or update `VITE_DEMO_INVITE_CODE` to whatever you want (e.g. `koudou-2026`, `friends-and-fam`, etc.).
2. Trigger a redeploy: push any commit to `main`, or click **Retry deployment** on the latest build.
3. The new code takes effect once the deploy is live. **Existing accounts are unaffected** — rotation only blocks *new* sign-ups; people who already signed in keep their session.

**When to rotate:**
- The code shows up somewhere unexpected (a public Slack, a screenshot you didn't intend to share).
- You want to retire a generation of demo access and start fresh.
- You just feel like it. Rotation is cheap.

**To revoke a specific person:** delete their row from Supabase Auth → Users. They lose access; their data stays in the DB (RLS hides it from anyone else). Wipe their data manually if you want via `delete from auth.users where id = '<uuid>'` — cascade FKs clean up the rest.

### What about the legacy Google sign-in?

Anyone you previously added to Google's Test users list can still sign in via the **Continue with Google** button at the bottom of the auth page. You can leave that button there or remove it later. To stop adding new people via Google, just stop touching the Test users list — magic-link is the path going forward.

### Cost monitoring

The daily AI rate limits are the main protection — at the current caps (5 cover letters + 10 searches per user per day) and average usage, ~30 active users still leaves headroom under the $25/mo Anthropic cap.

For a defense-in-depth alert, set Anthropic billing alerts in the Console: **Settings → Billing → Spend Alerts** at $5 / $10 / $20.

---

## For forkers (hosting your own demo)

To stand up your own demo:

1. **Fork + clone.** Follow `README.md` "Forking?" for the full local-dev setup (Supabase project + OAuth client + migrations).
2. **Deploy to Cloudflare Pages** (or Vercel — either works):
   - Connect your GitHub fork.
   - Build command: `pnpm build`
   - Output directory: `dist` (no leading space — Cloudflare bug)
   - Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_PROJECT_ID`, and (optionally) `VITE_DEMO_INVITE_CODE`
3. **Add your deploy URL to Supabase Auth redirects** — Auth → URL Configuration → Site URL + Redirect URLs.
4. **Edit `src/pages/Auth.tsx`** "About this demo" callout: replace `april.dawn1019@gmail.com` and the GitHub URL with your own.
5. **Set your invite code** (or leave it unset for fully open sign-up — the code field disappears entirely when `VITE_DEMO_INVITE_CODE` is unset).
6. **Tighten or loosen daily AI caps** in `supabase/functions/generate-cover-letter/index.ts` and `supabase/functions/ai-job-search/index.ts` (`maxCalls` and `windowMinutes` on the `checkRateLimit` call).

The seed function (`src/lib/demoSeed.ts`) is self-contained — runs against the authenticated user's RLS-scoped tables, so no service role / no edge function needed.

---

## What lives where

| Concern | Where |
|---|---|
| Synthetic profile + dataset | `src/lib/demoSeed.ts` |
| Seed button + Getting Started copy | `src/pages/GettingStarted.tsx` |
| Auth page (magic link + invite code + Google) | `src/pages/Auth.tsx` |
| Daily AI rate limits | `supabase/functions/{generate-cover-letter,ai-job-search}/index.ts` (the `checkRateLimit` call) |
| Rate-limit infra | `supabase/functions/_shared/rate-limit.ts` + `api_rate_limits` table |
| Local-dev seed (SQL) | `supabase/seed.sql` — only used for hero screenshots |
| Invite code | `VITE_DEMO_INVITE_CODE` env var (Cloudflare Pages settings) |
| API keys (Anthropic) | Supabase Edge Function secrets (not in repo) |
