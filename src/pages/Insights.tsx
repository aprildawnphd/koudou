import { useState } from 'react'
import { BarChart3, Sparkles, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FunnelTab } from '@/components/insights/FunnelTab'
import { SkillsTab } from '@/components/insights/SkillsTab'
import { WeeklyPlanTab } from '@/components/insights/WeeklyPlanTab'

type Tab = 'funnel' | 'skills' | 'weekly-plan'

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'funnel', label: 'Pipeline funnel', icon: BarChart3 },
  { id: 'skills', label: 'Skill gap', icon: Sparkles },
  { id: 'weekly-plan', label: 'Weekly plan', icon: CalendarDays },
]

export function Insights() {
  const [tab, setTab] = useState<Tab>('funnel')

  return (
    <>
      <header className="px-7 pt-5 pb-3.5">
        <h1 className="text-[26px] font-bold tracking-[-0.01em] text-ink">
          Insights
        </h1>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Pipeline shape, skill alignment, and a focused plan for the week.
        </p>
      </header>

      <div className="flex items-center gap-1 border-b border-line px-7">
        {TABS.map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors',
                active
                  ? 'border-accent-strong text-ink'
                  : 'border-transparent text-ink-secondary hover:text-ink',
              )}
            >
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto pb-8">
        {tab === 'funnel' && <FunnelTab />}
        {tab === 'skills' && <SkillsTab />}
        {tab === 'weekly-plan' && <WeeklyPlanTab />}
      </div>
    </>
  )
}
