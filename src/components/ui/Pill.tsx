import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  dotColor?: string
  children: ReactNode
  className?: string
}

export function Pill({ dotColor, children, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1.5 rounded-[4px] bg-hover px-2 py-[3px] text-[11px] font-medium text-ink-secondary',
        className,
      )}
    >
      {dotColor && (
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ background: dotColor }}
        />
      )}
      {children}
    </span>
  )
}
