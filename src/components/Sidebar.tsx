import { NavLink, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Sun,
  Inbox,
  Users,
  CalendarDays,
  Star,
  LayoutGrid,
  Search,
  FileText,
  PenLine,
  BarChart3,
  User,
  Settings as SettingsIcon,
  HelpCircle,
  PanelLeftClose,
  ChevronRight,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/integrations/supabase/client'
import type { LucideIcon } from 'lucide-react'

type Item = {
  to: string
  icon: LucideIcon
  label: string
  count?: number
  chevron?: boolean
}

const sectionToday: Item[] = [
  { to: '/today', icon: Sun, label: 'Today', count: 9 },
  { to: '/jobs', icon: Inbox, label: 'Jobs', chevron: true },
  { to: '/network', icon: Users, label: 'Network' },
  { to: '/interviews', icon: CalendarDays, label: 'Interviews' },
]

const sectionPipeline: Item[] = [
  { to: '/targets', icon: Star, label: 'Target Companies' },
  { to: '/boards', icon: LayoutGrid, label: 'Job Boards' },
  { to: '/search', icon: Search, label: 'Job Search' },
]

const sectionLibrary: Item[] = [
  { to: '/resumes', icon: FileText, label: 'Resumes' },
  { to: '/letters', icon: PenLine, label: 'Cover Letters' },
]

const sectionInsights: Item[] = [
  { to: '/insights', icon: BarChart3, label: 'Insights' },
]

const footerItems: Item[] = [
  { to: '/profile', icon: User, label: 'Profile' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
  { to: '/help', icon: HelpCircle, label: 'Help' },
]

function NavItem({ to, icon: Icon, label, count, chevron }: Item) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'mb-px flex items-center gap-3 rounded-[6px] px-2.5 py-[7px] text-sm transition-colors',
          'text-side-text hover:bg-side-bg-hover hover:text-side-text-active',
          isActive && 'bg-side-bg-active font-medium text-side-text-active',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            className={cn(
              'shrink-0 text-brand transition-opacity',
              isActive ? 'opacity-100' : 'opacity-90',
            )}
          />
          <span className="flex-1 truncate">{label}</span>
          {count != null && (
            <span className="rounded-[3px] bg-white/[0.06] px-1.5 py-px font-mono text-[11px] text-side-text-muted">
              {count}
            </span>
          )}
          {chevron && (
            <ChevronRight size={12} className="text-side-text-muted" />
          )}
        </>
      )}
    </NavLink>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pt-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.08em] text-side-text-muted uppercase">
      {children}
    </div>
  )
}

function SignOutButton() {
  const navigate = useNavigate()
  async function handleClick() {
    await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }
  return (
    <button
      type="button"
      onClick={handleClick}
      className="mb-px flex w-full items-center gap-3 rounded-[6px] px-2.5 py-[7px] text-sm text-side-text transition-colors hover:bg-side-bg-hover hover:text-side-text-active"
    >
      <LogOut size={16} className="shrink-0 text-brand opacity-90" />
      <span className="flex-1 truncate text-left">Sign out</span>
    </button>
  )
}

export function Sidebar() {
  return (
    <aside className="sidebar-scroll flex flex-col overflow-y-auto bg-side-bg px-2.5 py-3.5">
      {/* Workspace header */}
      <div className="mb-1 flex items-center gap-2.5 px-1.5 pt-1.5 pb-3.5">
        <img
          src="/brand/koudou-mark-light.png"
          alt="Koudou"
          className="block h-[30px] w-[30px] shrink-0 rounded-[7px]"
        />
        <div className="flex-1 text-[18px] font-bold tracking-[-0.01em] text-brand">
          Koudou
        </div>
        <button
          type="button"
          aria-label="Collapse sidebar"
          className="grid size-[22px] place-items-center rounded-[4px] border border-side-border text-[11px] text-side-text-muted hover:text-side-text-active"
        >
          <PanelLeftClose size={12} />
        </button>
      </div>

      {/* Getting Started */}
      <div className="mb-3">
        <NavItem to="/getting-started" icon={Sparkles} label="Getting Started" />
      </div>

      <div className="mb-3">
        <SectionLabel>Today</SectionLabel>
        {sectionToday.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>

      <div className="mb-3">
        <SectionLabel>Pipeline</SectionLabel>
        {sectionPipeline.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>

      <div className="mb-3">
        <SectionLabel>Library</SectionLabel>
        {sectionLibrary.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>

      <div className="mb-3">
        <SectionLabel>Insights</SectionLabel>
        {sectionInsights.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-auto border-t border-side-border pt-3">
        {footerItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
        <SignOutButton />
        <div className="mt-1 flex cursor-default items-center gap-2.5 rounded-[6px] p-2">
          <div className="grid size-7 place-items-center rounded-full bg-brand text-[11px] font-bold text-side-bg">
            AD
          </div>
          <div className="text-[13px] font-medium text-side-text-active">
            April Dawn
          </div>
        </div>
      </div>
    </aside>
  )
}
