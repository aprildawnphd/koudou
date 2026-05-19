# Koudou — Product

> **Searching and applying isn't enough anymore.** The modern job search rewards
> relationships, prescriptive targeting, and warm context — but tracking that
> work across people, roles, and companies is genuinely hard. Koudou is a
> familiar productivity-style workspace with AI woven through to map your
> network, surface paths into target companies, and recommend the next move
> that'll improve your odds of an offer.

## Value proposition

Koudou wins on three layers:

**1. Thesis — relationship-first job search is the new right to win**

Job-seekers in 2026 don't win by sending more applications; they win by
prescriptive targeting of specific companies, building warm paths into them
through their network, and applying with context. Koudou is built around this
paradigm — relationships are first-class, not a sidecar feature.

**2. UX — familiar productivity-workspace interface**

No new mental model to learn. If you've used Linear, Asana, or Notion,
Koudou's surfaces (status-grouped tables, filter chips, Kanban) are
immediately recognizable — but every column, filter, and pill is opinionated
about job-search semantics. Onboarding is fast because the interaction
conventions are already in muscle memory.

**3. Intelligence — AI woven through, not bolted on**

Koudou understands the graph of contacts ↔ roles ↔ target companies, and
traverses it to surface specific next moves: *"Sarah at OpenAI used to work
at Anthropic, one of your targets — ask her for an intro to her former
team."* That kind of cross-entity reasoning is hard to replicate in
general-purpose tools, which see flat lists of items without domain context.

### Positioning statement

**For** mid-career PMs running 10+ concurrent pursuits in active search,
**who** know that relationships beat cold applications but can't track the
work across people, roles, and companies,
**Koudou is** a job-search workspace
**that** maps your network, recommends specific next moves, and
operationalizes the relationship-first paradigm —
**unlike** general-purpose PM tools (no domain awareness) or job-search
trackers (no relationship graph).

## Problem

Modern senior-PM job searches succeed through relationships and prescriptive
targeting, not application volume. But the tooling hasn't caught up:

- **LinkedIn** surfaces the social graph but doesn't operationalize a workflow on top of it
- **Job-search trackers** (Huntr, Teal, Simplify) manage applications but not the relationship graph that produces them
- **General productivity tools** (Linear, Asana, Notion) require hours of manual customization that breaks as the search context evolves
- **DIY spreadsheets** scale poorly past ~5 concurrent pursuits

Mid-career PMs running 10+ concurrent pursuits across target companies, warm
contacts, active applications, and scheduled interviews need a workspace that
understands the domain natively — and an AI layer that recommends "the next
move that improves offer odds" rather than just tracking state.

## Primary persona — *Riley, the active senior PM*

| Dimension | Riley |
|---|---|
| Career stage | 8-15 years; Senior PM / Director of Product / Head of Product level |
| Search context | Active search; often while still employed OR strategically transitioning after a layoff or company sale |
| Mindset | Has been on the hiring side. Knows referrals beat cold apps 10x. Willing to do slower, relationship-intensive work. |
| Concurrent pursuits | 8-15 active opportunities at any time across target companies |
| Tools today | LinkedIn + Excel/Google Sheets + maybe Notion + occasionally a sales CRM misused as a job tracker |
| Pain points | Fragmented tools; lost context across surfaces; doesn't know what to do next when 10+ pursuits compete for attention; cold applications waste time; warm intros work but tracking them is manual |
| Behaviors | Targets specific companies (not spray-and-pray); networks proactively; tracks who-knows-whom; iterates on positioning materials |
| Decision driver | "Will this help me land an offer at a company I actually want to work at, faster?" |

*Portfolio-framing note: one persona for v1. A secondary "early-to-mid career PM"
persona can be added if user discovery surfaces meaningfully different needs.*

## Jobs to be Done

1. **When I'm targeting a specific company**, I want to find paths into it through my network, **so I can land warm introductions rather than cold applications.**
2. **When I'm running 10+ concurrent pursuits**, I want to see what action moves each one forward today, **so I don't drop balls and I prioritize highest-leverage work.**
3. **When I meet a new contact**, I want to capture them in context with relevant target companies and roles, **so I can later trace paths and reactivate them when opportunities arise.**
4. **When I have limited focus time**, I want recommendations on which actions will most improve my offer odds, **so I'm working on what matters, not what's noisy.**
5. **When I've been searching a while**, I want to see whether my approach is working (conversion data across stages), **so I can adjust strategy rather than just doing more.**

## Competitive landscape

| Category | Examples | Strength | Where Koudou differentiates |
|---|---|---|---|
| General productivity / PM tools | Linear, Asana, Notion, Monday | Flexible; familiar; rich filters | No domain awareness; require hours of manual setup; no job-search-specific AI; no graph reasoning across contacts↔companies↔roles |
| Job-search trackers | Huntr, Teal, Simplify, JobSync | Domain-aware status flows; cheap | Track applications but not relationships; weak on the contact↔company↔role graph; AI is mostly resume-formatting, not strategy |
| LinkedIn | LinkedIn | Where the social graph already lives | No workflow layer; ads-driven UX; weak relationship-state tracking; can't operationalize a structured search |
| Sales CRMs adapted | HubSpot, Pipedrive, Affinity | Strong on relationship pipelines | Wrong vocabulary (Deals vs Jobs); cost-prohibitive for individuals; overkill |
| DIY | Spreadsheets + email + LinkedIn | Free; flexible | No AI; no recommendations; no graph; high maintenance |

**Koudou's position:** the only tool that natively combines (1) the job-search
domain model, (2) familiar productivity-workspace UX, and (3) AI that traverses
the contact-role-company graph to recommend specific next moves.

## What this implies for the product

- **Relationships are first-class** — not a sidecar feature. The dashboard surfaces relationship activity alongside application activity.
- **Recommendations are specific, not generic** — *"Ask Sarah for an intro to her former colleague at Anthropic"* beats *"Network more."*
- **The graph is queryable** — contacts ↔ roles ↔ companies are linked entities, not isolated lists.
- **AI is woven through, not bolted on** — every surface that involves judgment (cover letters, job search, recommendations, weekly planning) shares the same intelligence layer.
- **Familiar UX over novel UX** — users shouldn't have to learn a new mental model. Linear-style productivity-tool conventions, applied to job search.

## Status

- **Commercial intent:** Portfolio piece (decided 2026-05-18)
- **Differentiation thesis:** Locked 2026-05-18
- **v1 live:** [koudou.pages.dev](https://koudou.pages.dev/) (private demo)
- **v2 (unified workspace + graph reasoning):** in scoping; spec at `_private/V2_ARCHITECTURE.md` (gitignored working doc)
- **User discovery:** lightweight portfolio-framing scope; informal conversations only
