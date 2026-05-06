import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function TagInput({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: Props) {
  const [text, setText] = useState('')

  function add() {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!value.includes(trimmed)) onChange([...value, trimmed])
    setText('')
  }

  function remove(tag: string) {
    onChange(value.filter((v) => v !== tag))
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !text && value.length > 0) {
      e.preventDefault()
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-[40px] flex-wrap items-center gap-1.5 rounded-[6px] border border-line bg-elevated px-2 py-1.5 focus-within:border-accent-strong focus-within:ring-2 focus-within:ring-accent-strong/20',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-[4px] bg-hover px-2 py-0.5 text-[12px] text-ink"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-ink-muted hover:text-priority-high"
              aria-label={`Remove ${tag}`}
            >
              <X size={11} />
            </button>
          )}
        </span>
      ))}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={value.length === 0 ? placeholder : ''}
        disabled={disabled}
        className="min-w-[120px] flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-muted"
      />
    </div>
  )
}
