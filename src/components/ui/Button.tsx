import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'default' | 'primary' | 'ghost'
type Size = 'sm' | 'md'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex items-center gap-1.5 rounded-[6px] border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60'

const variants: Record<Variant, string> = {
  default:
    'border-line bg-elevated text-ink hover:border-line-strong hover:bg-hover',
  primary:
    'border-accent-strong bg-accent-strong text-white hover:bg-accent-strong/90',
  ghost: 'border-transparent bg-transparent text-ink hover:bg-hover',
}

const sizes: Record<Size, string> = {
  sm: 'px-2.5 py-1 text-[12px]',
  md: 'px-3 py-1.5 text-[13px]',
}

export const Button = forwardRef<HTMLButtonElement, Props>(
  ({ variant = 'default', size = 'md', className, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    />
  ),
)
Button.displayName = 'Button'
