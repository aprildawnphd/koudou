type Props = {
  title: string
  subtitle?: string
}

export function PageStub({ title, subtitle }: Props) {
  return (
    <>
      <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.01em] text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px] text-ink-secondary">{subtitle}</p>
          )}
        </div>
      </header>
      <div className="mx-7 my-6 grid place-items-center rounded-[12px] border border-line bg-elevated p-12 text-center">
        <div className="grid size-14 place-items-center rounded-[14px] bg-hover text-2xl text-ink-muted">
          ✦
        </div>
        <div className="mt-4 text-[18px] font-semibold text-ink">
          Stub view
        </div>
        <p className="mt-1.5 max-w-[460px] text-[13px] text-ink-secondary">
          Wired to the route, design tokens, and sidebar shell. Real content
          ships in a later session.
        </p>
      </div>
    </>
  )
}
