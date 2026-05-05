import type { ReactNode } from 'react'

type Props = {
  head: string
  body: ReactNode
}

export function EntryCallout({ head, body }: Props) {
  return (
    <div className="mx-7 mb-4 rounded-[10px] border border-[#f59e0b] bg-gradient-to-br from-[#fef3c7] to-[#fde68a] px-4 py-3.5">
      <div className="text-[12px] font-bold tracking-[0.04em] text-[#92400e]">
        {head}
      </div>
      <div className="mt-1 text-[13px] text-[#78350f]">{body}</div>
    </div>
  )
}
