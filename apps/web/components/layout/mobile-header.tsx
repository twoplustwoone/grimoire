'use client'

import { useState } from 'react'
import { Menu, X, BookOpen, Settings } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface MobileHeaderProps {
  user: { name?: string | null; email: string }
}

const navigation = [
  { name: 'Campaigns', href: '/campaigns', icon: BookOpen },
]

export function MobileHeader({ user }: MobileHeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card">
        <h1 className="text-lg font-bold tracking-tight">Grimoire</h1>
        <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </header>
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <nav className="absolute top-0 left-0 w-72 h-full bg-card border-r p-6 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-lg font-bold">Grimoire</h1>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-6 truncate">{user.email}</p>
            <div className="space-y-1 flex-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                      pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </nav>
        </div>
      )}
    </>
  )
}
