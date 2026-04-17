'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Users,
  MapPin,
  Shield,
  GitBranch,
  Search,
  Calendar,
  Settings,
} from 'lucide-react'

interface SidebarProps {
  user: { name?: string | null; email: string; image?: string | null }
}

const navigation = [
  { name: 'Campaigns', href: '/campaigns', icon: BookOpen },
]

const campaignNavigation = [
  { name: 'Sessions', href: 'sessions', icon: Calendar },
  { name: 'NPCs', href: 'npcs', icon: Users },
  { name: 'Locations', href: 'locations', icon: MapPin },
  { name: 'Factions', href: 'factions', icon: Shield },
  { name: 'Threads', href: 'threads', icon: GitBranch },
  { name: 'Clues', href: 'clues', icon: Search },
]

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-card">
      <div className="p-6 border-b">
        <h1 className="text-xl font-bold tracking-tight">Grimoire</h1>
        <p className="text-xs text-muted-foreground mt-1 truncate">{user.email}</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
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
      </nav>
      <div className="p-4 border-t">
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
