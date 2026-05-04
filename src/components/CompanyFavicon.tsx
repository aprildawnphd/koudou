import { companyColor, companyInitial } from '@/lib/colors'
import { cn } from '@/lib/utils'

type Props = {
  name: string | null
  size?: number
  className?: string
}

export function CompanyFavicon({ name, size = 22, className }: Props) {
  return (
    <div
      className={cn(
        'grid shrink-0 place-items-center rounded-[5px] font-bold text-white',
        className,
      )}
      style={{
        width: size,
        height: size,
        background: companyColor(name),
        fontSize: Math.round(size * 0.5),
      }}
    >
      {companyInitial(name)}
    </div>
  )
}
