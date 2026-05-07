import { useState } from 'react'
import { Briefcase, TrendingUp, FileSearch } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SkillsPipelineView } from './SkillsPipelineView'
import { SkillsTrendingView } from './SkillsTrendingView'
import { SkillsResumeAuditView } from './SkillsResumeAuditView'

type SubTab = 'pipeline' | 'trending' | 'resume'

const SUBTABS: {
  key: SubTab
  label: string
  icon: typeof Briefcase
  hint: string
}[] = [
  {
    key: 'pipeline',
    label: 'In your pipeline',
    icon: Briefcase,
    hint: 'Skills your active jobs ask for, mapped to your profile',
  },
  {
    key: 'trending',
    label: 'Trending',
    icon: TrendingUp,
    hint: 'Top skills across all snapshots, by time window',
  },
  {
    key: 'resume',
    label: 'Resume audit',
    icon: FileSearch,
    hint: 'Skills you claim that aren\'t backed by your resume text',
  },
]

export function SkillsTab() {
  const [active, setActive] = useState<SubTab>('pipeline')
  const activeMeta = SUBTABS.find((t) => t.key === active)!

  return (
    <div className="m-7 space-y-4">
      <div>
        <h2 className="text-[16px] font-semibold text-ink">Skills</h2>
        <p className="text-[12px] text-ink-secondary">{activeMeta.hint}</p>
      </div>

      <div className="flex items-center gap-1 rounded-[8px] border border-line bg-elevated p-1">
        {SUBTABS.map((t) => {
          const Icon = t.icon
          const isActive = t.key === active
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 rounded-[6px] px-3 py-2 text-[12.5px] font-medium transition-colors',
                isActive
                  ? 'bg-accent-strong text-white'
                  : 'text-ink-secondary hover:bg-hover hover:text-ink',
              )}
            >
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {active === 'pipeline' && <SkillsPipelineView />}
      {active === 'trending' && <SkillsTrendingView />}
      {active === 'resume' && <SkillsResumeAuditView />}
    </div>
  )
}
