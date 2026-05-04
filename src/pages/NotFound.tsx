import { Link, useLocation } from 'react-router-dom'

export function NotFound() {
  const location = useLocation()
  return (
    <div className="grid h-full place-items-center px-7 py-12">
      <div className="max-w-[460px] rounded-[12px] border border-line bg-elevated p-12 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover font-mono text-[20px] text-ink-muted">
          404
        </div>
        <div className="mb-1.5 text-[18px] font-semibold text-ink">
          Page not found
        </div>
        <p className="mb-5 text-[13px] text-ink-secondary">
          <span className="font-mono text-[12px] text-ink-muted">
            {location.pathname}
          </span>{' '}
          doesn't match any route.
        </p>
        <Link
          to="/today"
          className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent-strong px-3 py-1.5 text-[13px] font-medium text-white hover:bg-accent-strong/90"
        >
          Back to Today
        </Link>
      </div>
    </div>
  )
}
