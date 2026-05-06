# Koudou — Demo

There's a private demo of Koudou running at **https://koudou.pages.dev/**.

This doc explains:
- **For visitors:** how to access the demo and what's in it.
- **For me (April):** how to add a new demo user.
- **For forkers:** how to host your own private demo.

---

## For visitors

The deployment at `koudou.pages.dev` is a private demo. Sign-in is gated to a small Google "Test users" allowlist while Koudou stays in personal-tool scope.

**To request access:**

1. Email **april.dawn1019@gmail.com** with the Google address you'd sign in with. Include a sentence on what brought you to the project — I'm sharing this informally, and I like to know who I'm letting in.
2. Once added (usually same-day), open https://koudou.pages.dev/ and sign in with Google.
3. Land on `/today`. Your account is empty — that's expected.
4. Open **Getting Started** in the sidebar → click **Run demo seed**.

**What the seed gives you:**

- Synthetic profile **Riley Aldridge** (12+ years senior product leadership, B2B SaaS) — including a full resume that drives the AI features.
- **8 target companies** across three tiers (dream / strong / interested).
- **9 contacts** at warmth levels Champion / Warm / Cold, linked to those companies.
- **10 jobs** spanning all four pipeline stages (applied, screening, interview, offer).
- **4 activities** on the focal GitLab VP Product job.
- **2 interviews** scheduled in the next 7 days.
- **1 milestone** (first interview celebration).

You can then exercise every page — Today, Jobs, Interviews, Network, Target Companies — and try the AI features end-to-end:

- **AI Job Search** at `/search` — generates job leads from the synthetic profile. ~5–15 sec per call.
- **Cover Letters** at `/letters` — drafts a 3–4 paragraph letter against any job in your pipeline. ~3–8 sec per call.

**Re-seeding:** the **Run demo seed** button always wipes your existing data first, so you can reset whenever you want a clean state. It does not touch your sign-in or profile auth.

**Costs:** AI calls hit my Anthropic budget ($25/mo cap on the dev key). Be reasonable — a handful of letters and searches is fine.

**Privacy:** all data is scoped per-user via Postgres RLS. Other demo users cannot see your seeded data.

---

## For me (adding a new demo user)

When someone emails asking for access:

1. **Google Cloud Console** → project `koudou-495319` → **APIs & Services** → **OAuth consent screen** → **Audience** → **Test users** → **+ Add users**. Paste their Google address. Save.
   - Direct: https://console.cloud.google.com/auth/audience?project=koudou-495319
   - Limit is 100 test users. Currently well under that — don't sweat it.
2. Reply to their email confirming access. Tell them to:
   - Open https://koudou.pages.dev/
   - Sign in with the Google address you just added
   - Open **Getting Started** → click **Run demo seed**

That's it. No DB-side step needed. Profile row is auto-created on first sign-in by the `handle_new_user` trigger; the seed button populates the rest.

**To remove someone:** Google Cloud Console → same page → click their row → Remove. Their existing data stays in the DB (RLS blocks them anyway), and is never visible to other users.

**To wipe a removed user's data entirely** (rare): get their UUID from the Supabase Auth dashboard → run `delete from auth.users where id = '<uuid>'`. Cascade FKs clean up all per-user rows.

---

## For forkers (hosting your own demo)

Everything above assumes my Supabase project + my OAuth client. To stand up your own demo:

1. **Fork + clone.** Follow `README.md` "Forking?" for the full local-dev setup (Supabase project + OAuth client + migrations).
2. **Deploy to Cloudflare Pages** (or Vercel — either works):
   - Connect your GitHub fork.
   - Build command: `pnpm build`
   - Output directory: `dist` (no leading space — Cloudflare bug)
   - Env vars: `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
3. **Add your deploy URL to OAuth redirects** — Supabase Auth → URL Configuration → Site URL + Redirect URLs.
4. **Edit `src/pages/GettingStarted.tsx`** "About this demo" section: replace the `april.dawn1019@gmail.com` line and the GitHub URL with your own.
5. **Decide your access model.** The Google OAuth "Test users" gate is what makes this private without you running a custom allowlist. If you want it fully open, switch the OAuth consent screen from `Testing` to `In production` (requires Google verification — multi-day review).

The seed function (`src/lib/demoSeed.ts`) is self-contained — it runs against the authenticated user's RLS-scoped tables, so no service role / no edge function. Anyone signed into your fork can populate.

---

## What lives where

| Concern | Where |
|---|---|
| Synthetic profile + dataset | `src/lib/demoSeed.ts` |
| Seed button + access copy | `src/pages/GettingStarted.tsx` |
| Local-dev seed (SQL) | `supabase/seed.sql` — only used for hero screenshots |
| Test users allowlist | Google Cloud Console (not in repo) |
| API keys (Anthropic) | Supabase Edge Function secrets (not in repo) |
