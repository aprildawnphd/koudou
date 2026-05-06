import * as Popover from '@radix-ui/react-popover'
import { HelpCircle } from 'lucide-react'

type Props = {
  title?: string
  children: React.ReactNode
  iconSize?: number
}

// Small click-to-toggle info popover. Replaces the native `title=` attribute
// (which is hover-only with a ~1.5s delay and OS-default styling).
// Used inline next to form labels and table headers as an unobtrusive
// "tap for explanation" affordance.
export function InfoPopover({ title, children, iconSize = 11 }: Props) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label={title ?? 'More info'}
          className="inline-flex cursor-help items-center justify-center rounded-full text-ink-muted transition-colors hover:text-ink-secondary focus:text-accent-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-strong/30"
        >
          <HelpCircle size={iconSize} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-[100] w-[320px] rounded-[10px] border border-line bg-elevated p-4 text-[12px] leading-[1.55] text-ink-secondary shadow-[0_8px_24px_rgba(0,0,0,0.12)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
        >
          {title && (
            <div className="mb-1.5 text-[11px] font-semibold tracking-[0.06em] text-ink uppercase">
              {title}
            </div>
          )}
          <div className="space-y-2">{children}</div>
          <Popover.Arrow className="fill-elevated stroke-line" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
