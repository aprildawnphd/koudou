import { companyColor } from '@/lib/colors'
import { cn } from '@/lib/utils'

type Props = {
  name: string | null
  size?: number
  className?: string
}

export function Avatar({ name, size = 28, className }: Props) {
  const initial = (name?.trim()?.[0] ?? '?').toUpperCase()
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: companyColor(name),
        fontSize: Math.round(size * 0.4),
      }}
    >
      {initial}
    </div>
  )
}
