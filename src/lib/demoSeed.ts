// Client-side demo seed for any signed-in user.
//
// Wipes the user's existing data, then re-populates with the synthetic
// Riley Aldridge profile + the same demo dataset that lives in
// supabase/seed.sql (8 target companies, 9 contacts, 10 jobs across all 4
// status buckets, 4 activities on the focal GitLab job, 2 interviews this
// week, 1 milestone). RLS scopes every insert to the current user, so this
// runs with the authenticated role — no service role / edge function needed.

import { supabase } from '@/integrations/supabase/client'

type SeedResult = { ok: true } | { ok: false; error: string }

const PROFILE = {
  name: 'Riley Aldridge',
  summary:
    'Senior product leader, 12+ years across B2B SaaS in DevTools, life sciences, and fintech. Looking for VP/Head of Product or CPO roles at Series C+ companies where I can own a $20M+ ARR line and lead a 10–25 person PM org. Strongest at "fix-it" turnarounds and cross-functional pricing.',
  resume_text: `RILEY ALDRIDGE
Senior Product Leader · 12+ years in B2B SaaS

PROFESSIONAL SUMMARY
Senior product leader with 12+ years building and scaling B2B SaaS platforms across DevTools, life sciences, and fintech infrastructure. Led PM teams of 8–25 and shipped products generating $40M+ ARR. Equally comfortable in hands-on roadmapping and exec-level strategy. Repeatedly hired into "fix-it" product-org turnarounds.

EXPERIENCE

VP, Product
Stanton Labs (Series C DevTools) · Feb 2023 – Present
- Inherited 14-person product org with no shipping cadence; established a 6-week shipping rhythm and quarterly OKR cycles. Time-to-launch dropped from 14 months to 4 months for major releases.
- Reorganized 4 PM teams from feature-aligned to outcome-aligned; cut inter-team dependencies 60% and freed 30% of PM bandwidth for discovery.
- Owned $18M ARR product line. Drove pricing repackaging that lifted ARPU 31% YoY with no measurable churn impact.
- Built first cross-functional product-marketing collaboration model. Cut launch-to-revenue lag from 90 days to 21 on three major releases.

Director, Product Management
Halverton Bio (Series E life-sciences cloud) · 2020 – 2023
- Led 8-person team across clinical data, compliance reporting, and audit workflows. Doubled portfolio's share of total ARR (12% → 25%) over 18 months.
- Authored the company's first product-discovery framework, adopted across all teams. Bad-feature-build rate (deprecated within 6 months) dropped from 47% to 11%.
- Hired 6 senior ICs and 1 manager. Three reports promoted to Director; one is now a CPO at a Series B.

Senior Product Manager
Lattera (Series B fintech infrastructure) · 2017 – 2020
- Owned merchant-onboarding product line: KYC, sub-merchant provisioning, fee-table customization.
- Shipped self-serve onboarding that cut time-to-first-transaction from 11 days to 2.5 hours, supporting 300% YoY active-merchant growth.
- Partnered with Compliance and Eng on automated audit-trail tooling adopted across 4 product surfaces. Eliminated $400K/year of manual audit overhead.

Product Manager
Coreframe (Series A B2B SaaS) · 2015 – 2017
- First PM at the company; built product-management discipline from zero.
- Migrated 6 engineering teams from feature-factory to roadmap-driven product organization.
- Led the company's first analytics dashboard product — became 35% of expansion revenue within 12 months.

Associate Product Manager
Tindale Systems · 2013 – 2015
- Junior PM rotation across workflow automation, billing integrations, admin tooling.
- Designed in-app onboarding tutorials that raised new-user activation from 22% to 51%.

EDUCATION

University of Michigan, Ann Arbor — M.S. Information Science (HCI concentration), 2013
Carleton College — B.A. Cognitive Science, 2011

SELECTED SKILLS

Product strategy and OKR design · Roadmap construction and stakeholder alignment · Pricing and packaging · A/B and multivariate experimentation · Customer discovery and JTBD interviewing · Product analytics (Mixpanel, Amplitude, custom Snowflake dashboards) · Cross-functional leadership across Eng, Design, GTM · Hiring + coaching senior PMs · Pricing-committee chair experience

LEADERSHIP

Mentor, ADPList — 40+ mentees in PM career transitions
Speaker — Product School Future Festival 2024 (panel on "Pricing as a Product Discipline")
Author — Three-part series on product-org turnarounds (Substack, ~8K subscribers)`,
  target_roles: ['VP Product', 'Head of Product', 'CPO'],
  industries: ['B2B SaaS', 'DevTools', 'Life Sciences', 'Fintech Infrastructure'],
  locations: ['San Francisco', 'New York', 'Boston', 'Any Location'],
  remote_preference: 'flexible' as const,
  min_base_salary: 240000,
  must_haves: [
    'Direct PM reports',
    'Equity grant',
    'Hybrid or remote',
    'Series C or later',
  ],
  nice_to_haves: [
    'Async culture',
    'Mission-driven product',
    'Strong eng partnership',
  ],
  skills: [
    'Product strategy',
    'OKR design',
    'Pricing and packaging',
    'Roadmap construction',
    'Customer discovery',
    'A/B experimentation',
    'Mixpanel',
    'Amplitude',
    'Cross-functional leadership',
    'Hiring + coaching senior PMs',
  ],
}

const TARGET_COMPANIES = [
  { name: 'GitLab', tier: 'dream' as const, notes: 'DevOps platform; remote-first; strong PM track' },
  { name: 'Veeva Systems', tier: 'dream' as const, notes: 'Life sciences cloud; product platforms group' },
  { name: 'Stripe', tier: 'dream' as const, notes: 'Payments infra; growing PM org' },
  { name: 'Toptal', tier: 'strong' as const, notes: 'Talent marketplace; CPO referral path open' },
  { name: 'TriNetX', tier: 'strong' as const, notes: 'Real-world data; hiring SrDir for RWD platform' },
  { name: 'Hyland', tier: 'strong' as const, notes: 'Content services; VP Product opening' },
  { name: 'Labcorp', tier: 'interested' as const, notes: 'Diagnostics; broad PM org' },
  { name: 'Parexel', tier: 'interested' as const, notes: 'Clinical research; product roles in trial tech' },
]

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const future = (days: number, hour = 14) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const CONTACTS = [
  { companyName: 'GitLab', name: 'Linnea Quintero', role: 'Director of Engineering', warmth: 'champion' as const, network_role: 'booster', last_touch: day(2), follow_up: day(-1), notes: 'Confirmed she submitted the referral. Onsite scheduled.' },
  { companyName: 'Stripe', name: 'Tobias Asare', role: 'Head of Talent', warmth: 'champion' as const, network_role: 'booster', last_touch: day(3), follow_up: day(-4), notes: 'Asked me to send updated resume; will route to PM org.' },
  { companyName: 'GitLab', name: 'Beatrix Aldine', role: 'Recruiter', warmth: 'warm' as const, network_role: 'recruiter_internal', last_touch: day(5), follow_up: day(-2), notes: 'Recruiter at GitLab; coordinating onsite logistics.' },
  { companyName: 'TriNetX', name: 'Cyrus Tane', role: 'VP Product', warmth: 'warm' as const, network_role: 'booster', last_touch: day(7), follow_up: day(-5), notes: 'Promised to introduce me to hiring manager.' },
  { companyName: 'Toptal', name: 'Esperanza Lin', role: 'CPO', warmth: 'warm' as const, network_role: 'booster', last_touch: day(4), follow_up: day(-1), notes: 'Met for coffee; sponsoring the Round 2 process.' },
  { companyName: 'Veeva Systems', name: 'Theo Marchetti', role: 'VP Engineering', warmth: 'warm' as const, network_role: 'booster', last_touch: day(6), follow_up: day(-5), notes: 'Champion for Research Platforms role.' },
  { companyName: 'TriNetX', name: 'Jules Okonkwo', role: 'PM', warmth: 'cold' as const, network_role: 'connector', last_touch: day(21), follow_up: null, notes: null },
  { companyName: 'Stripe', name: 'Naia Faroughi', role: 'Product Lead', warmth: 'cold' as const, network_role: 'connector', last_touch: day(40), follow_up: null, notes: 'Reach out to reactivate.' },
  { companyName: 'Veeva Systems', name: 'Henrik Bartolo', role: 'Sr PM', warmth: 'cold' as const, network_role: 'connector', last_touch: day(32), follow_up: null, notes: 'Reach out to reactivate.' },
]

const JOBS = [
  {
    companyName: 'GitLab',
    company: 'GitLab',
    role: 'VP, Product',
    status: 'interview' as const,
    sub_status: 'Onsite scheduled',
    priority: 'high' as const,
    match_score: 5,
    applied_date: day(6),
    warm: true,
    location: 'Remote',
    description:
      "Lead the Product organization across GitLab's full DevSecOps platform — owning the roadmap for CI/CD, source code management, security scanning, and AI-assisted development features. Manage 4 PM directors and ~15 ICs across a geo-distributed team. Required: 8+ years product leadership at Series C+ SaaS, experience with developer tools or platforms, track record of scaling pricing and packaging, strong analytical chops with Mixpanel or Amplitude. Experience with usage-based pricing and platform extensibility a plus. Tools: SQL, product analytics, OKR design, A/B experimentation.",
  },
  {
    companyName: 'Toptal',
    company: 'Toptal',
    role: 'Head of Product, Talent',
    status: 'interview' as const,
    sub_status: 'Round 2',
    priority: 'high' as const,
    match_score: 4,
    applied_date: day(8),
    warm: true,
    location: 'Remote',
    description:
      "Own product strategy for the talent-side experience of the world's largest remote talent marketplace. Lead a PM team of 6 covering matching algorithms, candidate onboarding, skill assessments, and engagement tooling. Required: 7+ years product at marketplaces or two-sided platforms; deep familiarity with supply-side dynamics, A/B experimentation, and matching/recommendation systems. Comfortable with SQL and product analytics. Bonus: ML/recommendation experience, marketplace pricing, async leadership.",
  },
  {
    companyName: 'TriNetX',
    company: 'TriNetX',
    role: 'Sr Director, Real-World Data',
    status: 'interview' as const,
    sub_status: 'Hiring mgr',
    priority: 'medium' as const,
    match_score: 4,
    applied_date: day(10),
    warm: true,
    location: 'Boston',
    description:
      'Direct the Real-World Data product line at TriNetX, the leading global health research network connecting CROs with deidentified patient data. Lead an 8-person PM team across data acquisition, query tooling, and analytics products. Required: 6+ years product in healthcare or life sciences SaaS, familiarity with EHR data, HIPAA and GDPR compliance, FHIR standards, and clinical research workflows. Experience with cohort-building tools or population health analytics strongly preferred.',
  },
  {
    companyName: 'Veeva Systems',
    company: 'Veeva Systems',
    role: 'VP Product, Research Platforms',
    status: 'interview' as const,
    sub_status: 'Recruiter screen',
    priority: 'medium' as const,
    match_score: 5,
    applied_date: day(12),
    warm: true,
    location: 'Remote',
    description:
      "Lead product for Veeva's Research Platforms division, owning the cloud platform that powers clinical trial management for the world's largest pharma sponsors. Direct a 12-person PM org. Required: 10+ years product leadership in regulated SaaS (life sciences, healthcare, or financial services), experience with clinical operations workflows, EDC and CTMS systems, GxP compliance. Proven cross-functional alignment between product, engineering, and customer success at $50M+ ARR scale. Strong strategic thinker.",
  },
  {
    companyName: 'Hyland',
    company: 'Hyland',
    role: 'VP Product',
    status: 'screening' as const,
    sub_status: 'Phone screen',
    priority: 'medium' as const,
    match_score: 3,
    applied_date: day(5),
    warm: false,
    location: 'Remote',
    description:
      "Drive product strategy for Hyland's flagship content services platform serving enterprises in healthcare, government, and financial services. Manage 6 PMs across document management, workflow automation, and intelligent capture. Required: 8+ years enterprise B2B product, experience with content management or workflow platforms, comfortable with on-premise and hybrid deployment models, strong stakeholder management with Fortune 500 customers. Plus: OCR, AI document classification, regulatory compliance (SOX, HIPAA).",
  },
  {
    companyName: 'Stripe',
    company: 'Stripe',
    role: 'Head of Product, Payments Infra',
    status: 'screening' as const,
    sub_status: 'Recruiter intro',
    priority: 'medium' as const,
    match_score: 4,
    applied_date: day(4),
    warm: true,
    location: 'San Francisco',
    description:
      "Own product for Stripe's core payments infrastructure — the systems handling authorization, settlement, fee calculation, and merchant-of-record services. Lead a 10-person PM team partnering closely with engineering on the global payments network. Required: 8+ years product at fintech or payments, deep technical fluency (you can read code and review engineering RFCs), experience with regulatory frameworks (PSD2, PCI-DSS), and a track record of shipping high-stakes infrastructure products. Strong with SQL and product analytics.",
  },
  {
    companyName: 'Parexel',
    company: 'Parexel',
    role: 'Senior Director, Product',
    status: 'applied' as const,
    sub_status: 'Submitted',
    priority: 'low' as const,
    match_score: 3,
    applied_date: day(18),
    warm: false,
    location: 'Remote',
    description:
      "Lead product organization for Parexel's clinical research technology suite supporting global Phase I-IV trials. Build product management discipline from scratch in a CRO environment transitioning to product-led models. Required: 7+ years product in clinical research, life sciences SaaS, or healthcare. Knowledge of clinical operations (EDC, CTMS, eTMF), ICH-GCP guidelines, FDA 21 CFR Part 11 compliance. Change management experience essential — this is a transformation role.",
  },
  {
    companyName: 'Veeva Systems',
    company: 'Veeva Systems',
    role: 'VP Product, Trial Tech',
    status: 'applied' as const,
    sub_status: 'Submitted',
    priority: 'medium' as const,
    match_score: 4,
    applied_date: day(15),
    warm: true,
    location: 'Remote',
    description:
      "Lead product for Veeva's Trial Tech suite — eTMF, CTMS, study startup, and clinical payments applications used by 80%+ of top pharma sponsors. Manage 8 PMs. Required: 10+ years product leadership, experience with clinical trial operations or research SaaS, GxP compliance fluency, strong understanding of multi-tenant SaaS architecture, M&A integration experience preferred. Excellent communicator able to engage VP-level customer stakeholders and translate clinical workflows into product requirements.",
  },
  {
    companyName: 'Labcorp',
    company: 'Labcorp',
    role: 'Head of Product',
    status: 'applied' as const,
    sub_status: 'Recruiter intro',
    priority: 'low' as const,
    match_score: 3,
    applied_date: day(8),
    warm: false,
    location: 'Remote',
    description:
      "Drive product strategy for Labcorp's digital portfolio across patient-facing apps, provider portals, and B2B diagnostics integrations. Manage 5 PMs partnering with internal labs and external healthcare clients. Required: 6+ years product in healthcare or diagnostics, experience integrating with EHR systems (Epic, Cerner), familiarity with HL7 and FHIR standards, comfortable with mobile-first product strategy. Lab science background not required but appreciated.",
  },
  {
    companyName: null,
    company: 'Acme Staffing',
    role: 'Sr Director, PM (contractor)',
    status: 'offer' as const,
    sub_status: 'Reviewing terms',
    priority: 'high' as const,
    match_score: 4,
    applied_date: day(25),
    warm: true,
    location: 'Remote',
    description:
      '6-month contract to lead product for a stealth-mode B2B SaaS startup pre-Series A. Hands-on role: strategy, user research, roadmapping, plus PM IC work as needed. Required: 8+ years product at early-stage B2B SaaS, comfortable building from zero, comfortable with startup ambiguity, strong with founder-fit dynamics. Equity component is per-month rather than a full-time grant. Remote, US-based.',
  },
]

const ACTIVITIES = [
  { type: 'interview', occurred_at: day(0), text: 'Onsite scheduled — Wed 2pm' },
  { type: 'message', occurred_at: day(3), text: 'Linnea confirmed referral submission' },
  { type: 'apply', occurred_at: day(6), text: 'Application submitted' },
  { type: 'note', occurred_at: day(8), text: "Linnea intro'd — coffee chat went well" },
]

export async function runDemoSeed(userId: string): Promise<SeedResult> {
  try {
    // Wipe existing user data — order matters (FKs cascade but explicit is safer).
    const wipes = [
      supabase.from('activities').delete().eq('user_id', userId),
      supabase.from('interviews').delete().eq('user_id', userId),
      supabase.from('milestones').delete().eq('user_id', userId),
      supabase.from('cover_letters').delete().eq('user_id', userId),
      supabase.from('jobs').delete().eq('user_id', userId),
      supabase.from('contacts').delete().eq('user_id', userId),
      supabase.from('target_companies').delete().eq('user_id', userId),
    ]
    for (const w of wipes) {
      const { error } = await w
      if (error) throw error
    }

    // Profile (update — trigger creates the row on signup)
    const { error: profileErr } = await supabase
      .from('profiles')
      .update(PROFILE)
      .eq('id', userId)
    if (profileErr) throw profileErr

    // Target companies
    const { data: companies, error: tcErr } = await supabase
      .from('target_companies')
      .insert(TARGET_COMPANIES.map((c) => ({ user_id: userId, ...c })))
      .select('id, name')
    if (tcErr) throw tcErr
    const tcByName = new Map<string, string>(
      (companies ?? []).map((c) => [c.name, c.id]),
    )

    // Contacts
    const { error: contactsErr } = await supabase.from('contacts').insert(
      CONTACTS.map((c) => ({
        user_id: userId,
        target_company_id: tcByName.get(c.companyName) ?? null,
        name: c.name,
        role: c.role,
        warmth: c.warmth,
        network_role: c.network_role,
        last_touch: c.last_touch,
        follow_up: c.follow_up,
        notes: c.notes,
      })),
    )
    if (contactsErr) throw contactsErr

    // Jobs
    const { data: jobs, error: jobsErr } = await supabase
      .from('jobs')
      .insert(
        JOBS.map((j) => ({
          user_id: userId,
          target_company_id: j.companyName
            ? (tcByName.get(j.companyName) ?? null)
            : null,
          company: j.company,
          role: j.role,
          status: j.status,
          sub_status: j.sub_status,
          priority: j.priority,
          match_score: j.match_score,
          applied_date: j.applied_date,
          warm: j.warm,
          location: j.location,
          description: j.description,
        })),
      )
      .select('id, role, company')
    if (jobsErr) throw jobsErr

    const focalJob = (jobs ?? []).find(
      (j) => j.role === 'VP, Product' && j.company === 'GitLab',
    )
    const toptalJob = (jobs ?? []).find(
      (j) => j.role === 'Head of Product, Talent' && j.company === 'Toptal',
    )

    // Activities — 4 entries on the focal GitLab job
    if (focalJob) {
      const { error: actErr } = await supabase.from('activities').insert(
        ACTIVITIES.map((a) => ({
          user_id: userId,
          job_id: focalJob.id,
          type: a.type,
          occurred_at: a.occurred_at,
          text: a.text,
        })),
      )
      if (actErr) throw actErr
    }

    // Interviews — next 7 days
    const interviews: {
      user_id: string
      job_id: string
      scheduled_at: string
      type: string
      panelists: string[]
      prep_notes: string
    }[] = []
    if (focalJob) {
      interviews.push({
        user_id: userId,
        job_id: focalJob.id,
        scheduled_at: future(2, 14),
        type: 'onsite',
        panelists: ['Linnea Quintero', 'Hiring Manager', 'CPO'],
        prep_notes:
          'Bring two product critiques + the platform-vs-tools framing.',
      })
    }
    if (toptalJob) {
      interviews.push({
        user_id: userId,
        job_id: toptalJob.id,
        scheduled_at: future(4, 11),
        type: 'panel',
        panelists: ['Esperanza Lin (CPO)', 'VP Eng', 'Sr PM'],
        prep_notes:
          'Round 2 — focus on marketplace dynamics, supply-side levers.',
      })
    }
    if (interviews.length > 0) {
      const { error: ivErr } = await supabase
        .from('interviews')
        .insert(interviews)
      if (ivErr) throw ivErr
    }

    // Milestone (fired 2 hours ago) — surfaces the celebration banner on Today
    const milestoneFiredAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const { error: msErr } = await supabase.from('milestones').insert({
      user_id: userId,
      kind: 'first_interview',
      fired_at: milestoneFiredAt,
    })
    if (msErr) throw msErr

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Seed failed' }
  }
}
