import { cn } from '@/lib/utils'

export type Priority = 'low' | 'medium' | 'high'

const LABELS: Record<Priority, string> = {
  high: 'Urgent',
  medium: 'High',
  low: 'Med',
}

const HEIGHTS = ['h-[5px]', 'h-[8px]', 'h-[11px]']

export function PriorityBars({ level }: { level: Priority }) {
  const lit = level === 'high' ? 3 : level === 'medium' ? 2 : 1
  const color =
    level === 'high'
      ? 'bg-priority-high'
      : level === 'medium'
        ? 'bg-priority-med'
        : 'bg-priority-low'

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-secondary">
      <span className="inline-flex items-end gap-[2px]">
        {HEIGHTS.map((h, i) => (
          <span
            key={i}
            className={cn(
              'w-[3px] rounded-[1px]',
              h,
              i < lit ? color : 'bg-line-strong',
            )}
          />
        ))}
      </span>
      {LABELS[level]}
    </span>
  )
}
