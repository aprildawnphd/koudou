import { useMemo } from 'react'
import { ChevronDown, Plus, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Pill } from '@/components/ui/Pill'
import { Avatar } from '@/components/ui/Avatar'
import { EntryCallout } from '@/components/EntryCallout'
import { CompanyFavicon } from '@/components/CompanyFavicon'
import { useNetworkData } from '@/hooks/useNetworkData'
import { networkRoleLabel } from '@/lib/networkRoles'
import { lastTouchText, dueDisplay } from '@/lib/dates'
import { cn } from '@/lib/utils'
import type { Tables } from '@/integrations/supabase/types'

type Contact = Tables<'contacts'>
type TargetCompany = Tables<'target_companies'>

type Warmth = 'champion' | 'warm' | 'cold'

const WARMTH_ORDER: Warmth[] = ['champion', 'warm', 'cold']

const WARMTH_LABEL: Record<Warmth, string> = {
  champion: 'Champions',
  warm: 'Warm',
  cold: 'Cold',
}

const WARMTH_COLOR: Record<Warmth, string> = {
  champion: 'var(--warmth-referral)',
  warm: 'var(--warmth-warm)',
  cold: 'var(--warmth-cold)',
}

function GroupHeader({ warmth, count }: { warmth: Warmth; count: number }) {
  return (
    <div className="sticky top-0 z-[2] flex cursor-pointer items-center gap-2.5 border-b border-line bg-app-bg px-7 py-2.5">
      <ChevronDown size={10} className="text-ink-muted" />
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ background: WARMTH_COLOR[warmth] }}
      />
      <span className="text-[13px] font-semibold text-ink">{WARMTH_LABEL[warmth]}</span>
      <span className="rounded-[10px] bg-hover px-1.5 py-px font-mono text-[11px] text-ink-muted">
        {count}
      </span>
    </div>
  )
}

function ContactRow({
  contact,
  company,
}: {
  contact: Contact
  company: TargetCompany | null
}) {
  const followUp = dueDisplay(contact.follow_up)
  const role = networkRoleLabel(contact.network_role)
  return (
    <div className="grid cursor-pointer grid-cols-[28px_1fr_140px_130px_90px_90px] items-center gap-3.5 border-b border-line bg-elevated px-7 py-3 text-[13px] hover:bg-hover">
      <Avatar name={contact.name} size={28} />
      <div className="min-w-0 truncate">
        <span className="font-medium text-ink">{contact.name}</span>
        {contact.role && (
          <span className="ml-1.5 text-[12px] text-ink-muted">{contact.role}</span>
        )}
      </div>
      {company ? (
        <Pill className="!gap-1.5">
          <CompanyFavicon name={company.name} size={14} />
          <span className="truncate">{company.name}</span>
        </Pill>
      ) : (
        <span className="text-[12px] text-ink-muted">—</span>
      )}
      {role ? (
        <Pill>{role}</Pill>
      ) : (
        <span className="text-[12px] text-ink-muted">—</span>
      )}
      <span className="font-mono text-[12px] text-ink-secondary">
        {lastTouchText(contact.last_touch)}
      </span>
      <span
        className={cn(
          'font-mono text-[12px]',
          followUp.cls === 'stale' && 'font-semibold text-priority-high',
          followUp.cls === 'soon' && 'font-semibold text-brand-strong',
          followUp.cls === '' && 'text-ink-secondary',
        )}
      >
        {followUp.text}
      </span>
    </div>
  )
}

function isWarmth(value: string | null): value is Warmth {
  return value === 'champion' || value === 'warm' || value === 'cold'
}

export function Network() {
  const { contacts, targetCompanies, isLoading, error } = useNetworkData()

  const tcById = useMemo(
    () => new Map(targetCompanies.map((t) => [t.id, t])),
    [targetCompanies],
  )

  const grouped = useMemo(() => {
    const buckets = new Map<Warmth, Contact[]>()
    for (const c of contacts) {
      const w: Warmth = isWarmth(c.warmth) ? c.warmth : 'cold'
      if (!buckets.has(w)) buckets.set(w, [])
      buckets.get(w)!.push(c)
    }
    return WARMTH_ORDER.filter((w) => (buckets.get(w)?.length ?? 0) > 0).map((w) => ({
      warmth: w,
      contacts: buckets.get(w)!,
    }))
  }, [contacts])

  return (
    <>
      <header className="flex items-start gap-4 px-7 pt-5 pb-3.5">
        <div className="flex-1">
          <h1 className="flex items-center gap-2.5 text-[26px] font-bold tracking-[-0.01em] text-ink">
            Network
          </h1>
          <p className="mt-1 text-[13px] text-ink-secondary">
            {contacts.length} contact{contacts.length === 1 ? '' : 's'}, grouped by warmth.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Visual-only stub — implementation deferred. See PROJECT.md
              "Maybe pull from Lovable" for the bulk-import plan. */}
          <Button title="Coming in a future session">
            <Upload size={12} /> Import CSV
          </Button>
          <Button variant="primary" title="Coming in a future session">
            <Plus size={12} /> Add contact
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-8">
        <EntryCallout
          head="CONNECTION-FIRST ENTRY"
          body={
            <>
              Find a <strong>Booster</strong> — filter to target companies where you
              have no warm contact yet. Those are the gaps to close.
            </>
          }
        />

        {isLoading && (
          <div className="px-7 py-8 text-[13px] text-ink-muted">Loading contacts…</div>
        )}
        {error && (
          <div className="m-7 rounded-[8px] border border-priority-high/30 bg-priority-high/5 px-4 py-3 text-[13px] text-priority-high">
            Failed to load contacts: {(error as Error).message}
          </div>
        )}
        {!isLoading && !error && contacts.length === 0 && (
          <div className="m-7 rounded-[12px] border border-line bg-elevated p-12 text-center">
            <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[14px] bg-hover text-2xl text-ink-muted">
              ✦
            </div>
            <div className="mb-1.5 text-[18px] font-semibold text-ink">
              No contacts yet
            </div>
            <p className="mx-auto mb-4 max-w-[460px] text-[13px] text-ink-secondary">
              Add your first contact to start mapping your network. Bulk import from
              Lovable is on the way in a future session.
            </p>
          </div>
        )}

        {grouped.map((g) => (
          <div key={g.warmth}>
            <GroupHeader warmth={g.warmth} count={g.contacts.length} />
            {g.contacts.map((c) => (
              <ContactRow
                key={c.id}
                contact={c}
                company={c.target_company_id ? (tcById.get(c.target_company_id) ?? null) : null}
              />
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
