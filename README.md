# Koudou

**A job-search workspace for the relationship-first era.**

For mid-career PMs running 10+ concurrent pursuits, Koudou maps your network,
surfaces paths into target companies, and recommends the next move to improve
offer odds — operationalizing relationship-first job search in a familiar
productivity-tool interface.

📋 **Product context:** see [`PRODUCT.md`](./PRODUCT.md) for the full value
proposition (thesis · UX · intelligence), persona, JTBDs, and competitive
landscape.

Built from a static design-handoff prototype (`design_handoff_koudou`, currently private).

## What it looks like

![Today — session home with Up Next queue and This Week strip](screenshots/today.png)

<details>
<summary>More views</summary>

**Jobs** — status-grouped pipeline (interview / screening / applied / offer)

![Jobs](screenshots/jobs.png)

**Job detail panel** — slide-in with status, priority, match score, and activity timeline

![Job detail panel](screenshots/jobs-detail.png)

**Network** — contacts grouped by warmth (Champions / Warm / Cold)

![Network](screenshots/network.png)

**Target Companies** — three tiers with per-row aggregates (jobs tracked, contacts, active apps)

![Target Companies](screenshots/targets.png)

**Getting Started** — entry-point chooser with adaptive "this week's focus" callout

![Getting Started](screenshots/getting-started.png)

**Sign in** — email/password or Google OAuth via Supabase

![Sign in](screenshots/auth.png)

</details>

> Screenshots are populated from `supabase/seed.sql`. Names are deliberately fictional.

## Demo

A private demo runs at **https://koudou.pages.dev/**. Sign-in is invite-only via a shared code; email April for access. See [`DEMO.md`](DEMO.md) for the full flow, what gets seeded, and how to host your own.

> **Note on AI features:**
> - **AI Job Search** uses Anthropic's `web_search` tool to find real postings on job boards; results are visually labeled as "Web result" (real URL) or "AI Suggestion" (fallback when web search returns sparse results, points to careers page).
> - **Cover Letters** generate from your profile + resume context.
> - **Weekly Plan** generates a 3-5 action plan from your pipeline state, scoreboard, and entity context.
> - **Skills tab** runs on persisted skill snapshots extracted at job-add time by a Haiku 4.5 pipeline — no AI quota cost when viewing.
> - **Daily AI quotas (per user, non-owner):** 3 searches/day, 5 letters/day, 5 weekly plans/day. Owner exempt via `OWNER_USER_IDS` env var.

## Stack

- **Build:** Vite + TypeScript
- **UI:** React 19 + Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Routing:** React Router 7
- **State:** TanStack Query (server) + Zustand (UI)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions on Deno)
- **AI:** Anthropic SDK — Claude Sonnet 4.6 (search, letters, weekly plan) + Haiku 4.5 (skill extraction) + `web_search_20250305` server tool
- **Email:** Resend SMTP (magic-link auth)
- **Deploy:** Cloudflare Pages (auto-deploy from `main`) — private demo at [koudou.pages.dev](https://koudou.pages.dev/)
- **Package mgr:** pnpm
- **Node:** ≥20

## Lineage

Koudou was first built on Lovable, where iteration on the JTBD framework, the
design system, and the product direction happened. After that build accumulated
UX cruft, the surface area was redesigned in Claude Design — the static
prototype lives in a sibling `design_handoff_koudou` repo (currently private) —
and ported here as a clean Vite + React + Supabase rebuild.

The Lovable predecessor is preserved as a private archive: frozen, read-only,
retained as a historical record. This codebase is the active line.

## Quick start

```bash
pnpm install
cp .env.example .env   # then fill in your Supabase values
pnpm dev
```

The dev server runs on http://localhost:5173.

## Forking? Stand up your own backend

This repo intentionally ships **zero credentials**. `.env` is gitignored, and any
secrets in screenshots/docs are illustrative. To run your own copy you'll set up
your own Supabase project + your own Google OAuth client (~15 minutes total).

### 1 · Supabase project

1. Create a free Supabase project at https://supabase.com/dashboard.
2. **Settings → API** → copy these into `koudou/.env`:
   ```env
   VITE_SUPABASE_URL="https://<your-project>.supabase.co"
   VITE_SUPABASE_ANON_KEY="<your publishable / anon key>"
   ```
3. **SQL Editor** → paste and run `supabase/migrations/20260504_initial_schema.sql`,
   then `supabase/migrations/20260504_grants.sql`. Both are idempotent.
4. **Authentication → URL Configuration → Redirect URLs** → add `http://localhost:5173/**`.

### 2 · Google OAuth (for "Continue with Google")

1. **Google Cloud Console** → create a new project (any name; "No organization"
   is fine for personal Google accounts).
2. **APIs & Services → OAuth consent screen** (or **Google Auth Platform → Branding**
   in the newer UI):
   - Audience: **External**
   - App name: anything (`Koudou` is fine)
   - User support + developer contact emails: your email
   - Save. Don't publish — keep it in **Testing** mode.
3. **Audience → Test users** → add your email (only listed test users can sign in).
4. **Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Authorized JavaScript origins:
     - `http://localhost:5173`
     - `https://<your-project>.supabase.co`
   - Authorized redirect URIs:
     - `https://<your-project>.supabase.co/auth/v1/callback`
   - Copy the resulting **Client ID** and **Client Secret**.
5. **Supabase → Authentication → Providers → Google**:
   - Toggle **Enable Sign in with Google** on.
   - Paste Client ID + Client Secret. Save.

### 3 · Run

```bash
pnpm install && pnpm dev
```

Hit http://localhost:5173/auth, click **Continue with Google**. You'll see Google's
"unverified app" warning — that's expected for a personal/self-hosted instance.
Approve, and you'll land in the app. RLS policies in the schema scope every table
to `user_id = auth.uid()`, so each forker only ever sees their own data.

## Project shape

```
src/
├── components/
│   ├── AppLayout.tsx     ← sidebar + main outlet
│   ├── Sidebar.tsx       ← IA: Today / Pipeline / Library / Insights
│   └── PageStub.tsx      ← placeholder used by all v1 stub pages
├── integrations/
│   └── supabase/
│       ├── client.ts     ← typed client, reads VITE_SUPABASE_*
│       └── types.ts      ← regenerate with `supabase gen types`
├── lib/
│   └── utils.ts          ← cn() helper
├── pages/                ← one file per route
├── App.tsx               ← <Routes>
├── main.tsx              ← <BrowserRouter> + QueryClient
└── index.css             ← design tokens (source of truth) + Tailwind theme
```

## Routes

| Path               | Page                      | Status |
| ------------------ | ------------------------- | ------ |
| `/auth`            | Sign in (magic-link + Google OAuth + invite code) | ✅ Wired to Supabase |
| `/getting-started` | Entry-point chooser + demo seed + backfill | ✅ Built |
| `/today`           | Greeting + Up Next queue + This Week strip | ✅ Built (Session 3) |
| `/jobs`            | Pipeline — status-grouped Linear-style table | ✅ Built (Session 2) |
| `/network`         | Contacts grouped by warmth (Champions / Warm / Cold) | ✅ Built (Session 4) |
| `/interviews`      | Interview calendar         | ⏳ Stub |
| `/targets`         | Target Companies (three-tier with per-row aggregates) | ✅ Built (Session 4) |
| `/boards`          | Job Boards                 | ⏳ Stub |
| `/search`          | AI Job Search — Anthropic `web_search` + AI-Suggestion fallback | ✅ Built (Sessions 5 + 6.2) |
| `/resumes`         | Resume library             | ⏳ Stub |
| `/letters`         | Cover Letters — AI-generated, profile-aware | ✅ Built (Session 5) |
| `/insights`        | Funnel + Skills + Weekly Plan tabs | ✅ Built (Sessions 6 + 6.1 + 6.4) |
| `/profile`         | Search profile + completeness scoring | ✅ Built (Session 5) |
| `/settings`        | Account + integrations    | ⏳ Stub |
| `/help`            | Docs + shortcuts          | ⏳ Stub |

## Design tokens

The CSS variables in `src/index.css` are the source of truth, ported directly from
`design_handoff_koudou/src/styles.css`. They're exposed to Tailwind via `@theme inline`
so utility classes like `bg-side-bg`, `text-brand-strong`, `border-line`, `text-ink-muted`
all resolve to the prototype's exact values.

When the prototype CSS and this codebase disagree, the prototype wins — re-port the token.

## License

[PolyForm Noncommercial 1.0.0](./LICENSE) — free for noncommercial use; contact the
author for commercial licensing. See [NOTICE.md](./NOTICE.md).

## Roadmap

1. ✅ **Session 1** — Scaffold + sidebar shell + auth route
2. ✅ **Session 2** — Schema + Pipeline (Jobs) view + DetailPanel + Google OAuth
3. ✅ **Session 3** — Today view + actionEngine port
4. ✅ **Session 4** — Network + Target Companies + Getting Started + brand marks
5. ✅ **Session 5** — AI features (AI Job Search, Cover Letters) + Profile + private demo deploy
   - **5.5** — Magic-link auth + invite-code demo gate + tighter AI rate limits + Resend SMTP
6. ✅ **Session 6** — Insights surface (Funnel + Skills + Weekly Plan tabs)
   - **6.1** — Pipeline Funnel rebuild (Pendo-style cohort flow viz)
   - **6.2** — AI Job Search rebuild on real web search (Anthropic `web_search_20250305`)
   - **6.3** — Skill extraction pipeline (`job_skills_snapshots` + Haiku 4.5 extractor)
   - **6.4** — Skills tab rebuild on real data (Pipeline / Trending / Resume audit sub-views)
   - **6.5** — Weekly Plan JTBD design review
7. 🔄 **v2 — Unified workspace rebuild** *(in scoping)* — replaces the originally-planned Sessions 6.6/6.7/6.8/7 after the 2026-05-18 architectural pivot. See [`PRODUCT.md`](./PRODUCT.md) for the differentiation thesis driving the rebuild.

Detailed session plans live in `../design_handoff_koudou/README.md` (v1 scope) and `_private/V2_ARCHITECTURE.md` (v2 scope, gitignored working doc).
