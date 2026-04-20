'use client'

import { useState } from 'react'
import { ArrowLeft, Menu, UserCircle, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import {
  campaignNavigation,
  getCampaignIdFromPath,
  topLevelNavigation,
  type NavItem,
} from '@/lib/navigation'

interface MobileHeaderProps {
  user: { name?: string | null; email: string }
}

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const campaignId = getCampaignIdFromPath(pathname)

  function close() {
    setOpen(false)
  }

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-sidebar">
        <span className="text-lg font-bold tracking-tight">Grimoire</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={close}>
          <nav className="absolute top-0 left-0 w-72 h-full bg-sidebar border-r p-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold">Grimoire</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11"
                onClick={close}
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-6 truncate">{user.email}</p>
            <div className="space-y-1 flex-1">
              {campaignId ? (
                <>
                  <Link
                    href="/campaigns"
                    onClick={close}
                    className="flex items-center gap-3 px-3 py-3.5 mb-2 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    All campaigns
                  </Link>
                  {campaignNavigation.map((item) => {
                    const href = `/campaigns/${campaignId}/${item.href}`
                    return (
                      <MobileNavLink
                        key={item.href}
                        item={item}
                        href={href}
                        pathname={pathname}
                        onSelect={close}
                      />
                    )
                  })}
                </>
              ) : (
                topLevelNavigation.map((item) => (
                  <MobileNavLink
                    key={item.href}
                    item={item}
                    href={item.href}
                    pathname={pathname}
                    onSelect={close}
                  />
                ))
              )}
            </div>
            <ThemeSwitcher />
            <Link
              href="/settings"
              onClick={close}
              className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <UserCircle className="h-4 w-4" />
              Account
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}

function MobileNavLink({
  item,
  href,
  pathname,
  onSelect,
}: {
  item: NavItem
  href: string
  pathname: string
  onSelect: () => void
}) {
  const Icon = item.icon
  const isActive = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      onClick={onSelect}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium transition-colors',
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
