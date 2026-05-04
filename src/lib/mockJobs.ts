// Dev-only mock fixtures matching the Koudou schema.
// Used by /preview/jobs (gated on import.meta.env.DEV).

import type { Tables } from '@/integrations/supabase/types'

type Job = Tables<'jobs'>
type Activity = Tables<'activities'>

const day = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()

const mockJob = (
  partial: Pick<Job, 'id' | 'role' | 'company' | 'status' | 'priority'> &
    Partial<Job>,
): Job => ({
  user_id: 'mock',
  target_company_id: null,
  sub_status: null,
  match_score: null,
  due_date: null,
  applied_date: null,
  warm: false,
  posted_url: null,
  salary_band: null,
  description: null,
  notes: null,
  location: null,
  created_at: day(7),
  updated_at: day(1),
  ...partial,
})

export const MOCK_JOBS: Job[] = [
  mockJob({ id: '00000001-0000-0000-0000-000000000001', role: 'VP, Product', company: 'GitLab', status: 'interview', priority: 'high', match_score: 5, applied_date: day(6), warm: true, location: 'Remote', sub_status: 'Onsite scheduled' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000002', role: 'Head of Product, Talent', company: 'Toptal', status: 'interview', priority: 'high', match_score: 4, applied_date: day(8), warm: false, location: 'Remote', sub_status: 'Round 2' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000003', role: 'Sr Director, Real-World Data', company: 'TriNetX', status: 'interview', priority: 'medium', match_score: 4, applied_date: day(10), warm: true, location: 'Boston', sub_status: 'Hiring mgr' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000004', role: 'VP Product, Research Platforms', company: 'Veeva Systems', status: 'interview', priority: 'medium', match_score: 5, applied_date: day(12), warm: true, location: 'Remote', sub_status: 'Recruiter screen' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000005', role: 'VP Product', company: 'Hyland', status: 'screening', priority: 'medium', match_score: 3, applied_date: day(5), warm: false, location: 'Remote', sub_status: 'Phone screen' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000006', role: 'Head of Product', company: 'Labcorp', status: 'screening', priority: 'low', match_score: 3, applied_date: day(7), warm: false, location: 'Remote', sub_status: 'Awaiting call' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000007', role: 'Head of Product, Bench Data', company: 'Benchling', status: 'screening', priority: 'medium', match_score: 4, applied_date: day(4), warm: true, location: 'SF', sub_status: 'Recruiter intro' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000008', role: 'Senior Director, Product', company: 'Parexel', status: 'applied', priority: 'low', match_score: 3, applied_date: day(18), warm: false, location: 'Remote' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000009', role: 'VP Product, Research Platforms', company: 'Veeva Systems', status: 'applied', priority: 'medium', match_score: 4, applied_date: day(15), warm: true, location: 'Remote' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000010', role: 'Head of Product', company: 'Benchling', status: 'applied', priority: 'low', match_score: 3, applied_date: day(8), warm: false, location: 'SF' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000011', role: 'Director, Product (Platform)', company: 'GitLab', status: 'applied', priority: 'medium', match_score: 4, applied_date: day(6), warm: true, location: 'Remote' }),
  mockJob({ id: '00000001-0000-0000-0000-000000000012', role: 'Sr Director, PM (contractor)', company: 'Acme Staffing', status: 'offer', priority: 'high', match_score: 4, applied_date: day(25), warm: true, location: 'Remote', sub_status: 'Reviewing terms' }),
]

const mockActivity = (
  partial: Pick<Activity, 'id' | 'job_id' | 'type'> & Partial<Activity>,
): Activity => ({
  user_id: 'mock',
  contact_id: null,
  occurred_at: day(0),
  text: null,
  created_at: day(0),
  ...partial,
})

export const MOCK_ACTIVITIES: Record<string, Activity[]> = {
  '00000001-0000-0000-0000-000000000001': [
    mockActivity({ id: 'a1', job_id: '00000001-0000-0000-0000-000000000001', type: 'interview', occurred_at: day(0), text: 'Onsite scheduled — Wed 2pm' }),
    mockActivity({ id: 'a2', job_id: '00000001-0000-0000-0000-000000000001', type: 'message', occurred_at: day(3), text: 'Maya confirmed referral submission' }),
    mockActivity({ id: 'a3', job_id: '00000001-0000-0000-0000-000000000001', type: 'apply', occurred_at: day(6), text: 'Application submitted' }),
    mockActivity({ id: 'a4', job_id: '00000001-0000-0000-0000-000000000001', type: 'note', occurred_at: day(8), text: "Maya intro'd — coffee chat went well" }),
  ],
}
