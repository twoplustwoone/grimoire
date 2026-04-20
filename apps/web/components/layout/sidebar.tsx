'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ArrowLeft, Search, Settings } from 'lucide-react'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import {
  campaignNavigation,
  getCampaignIdFromPath,
  topLevelNavigation,
  type NavItem,
} from '@/lib/navigation'

interface SidebarProps {
  user: { name?: string | null; email: string; image?: string | null }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const campaignId = getCampaignIdFromPath(pathname)

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-sidebar">
      <div className="p-6 border-b">
        <span className="text-xl font-bold tracking-tight">Grimoire</span>
        <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {campaignId ? (
          <>
            <Link
              href="/campaigns"
              className="flex items-center gap-3 px-3 py-2 mb-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              All campaigns
            </Link>
            {campaignNavigation.map((item) => {
              const href = `/campaigns/${campaignId}/${item.href}`
              return (
                <NavLink key={item.href} item={item} href={href} pathname={pathname} />
              )
            })}
          </>
        ) : (
          topLevelNavigation.map((item) => (
            <NavLink key={item.href} item={item} href={item.href} pathname={pathname} />
          ))
        )}
      </nav>
      <div className="p-4 border-t space-y-1">
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
            document.dispatchEvent(event)
          }}
          className="flex items-center justify-between w-full px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
        >
          <span className="flex items-center gap-2">
            <Search className="h-3 w-3" />
            Search
          </span>
          <kbd className="flex items-center gap-0.5 border rounded px-1 py-0.5 text-[10px]">
            <span>⌘</span><span>K</span>
          </kbd>
        </button>
        <ThemeSwitcher />
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  )
}

function NavLink({ item, href, pathname }: { item: NavItem; href: string; pathname: string }) {
  const Icon = item.icon
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
      )}
    >
      <Icon className="h-4 w-4" />
      {item.name}
    </Link>
  )
}
