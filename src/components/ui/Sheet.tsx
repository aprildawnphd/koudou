import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  headerLeft?: ReactNode
  children: ReactNode
  className?: string
}

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  headerLeft,
  children,
  className,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[80] bg-[rgba(15,23,42,0.5)] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in data-[state=closed]:fade-out" />
        <Dialog.Content
          className={cn(
            'fixed top-0 right-0 bottom-0 z-[90] flex w-[480px] flex-col border-l border-line bg-elevated shadow-[-8px_0_32px_rgba(0,0,0,0.08)] focus:outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
            className,
          )}
          aria-describedby={description ? undefined : undefined}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div className="font-mono text-[11px] text-ink-muted">
              {headerLeft}
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-2.5 py-1 text-[12px] text-ink hover:border-line-strong hover:bg-hover"
              >
                <X size={12} />
                Close
                <span className="ml-1 rounded-[3px] bg-hover px-1.5 py-px font-mono text-[10px] text-ink-muted">
                  Esc
                </span>
              </button>
            </Dialog.Close>
          </div>
          {/* a11y: Radix Dialog requires a Title; visually hidden if not provided */}
          <Dialog.Title className={title ? 'sr-only' : 'sr-only'}>
            {title ?? 'Detail panel'}
          </Dialog.Title>
          {description && (
            <Dialog.Description className="sr-only">
              {description}
            </Dialog.Description>
          )}
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
