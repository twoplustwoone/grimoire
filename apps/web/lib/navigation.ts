import {
  BookOpen,
  Users,
  UserCircle,
  MapPin,
  Shield,
  GitBranch,
  Search,
  Calendar,
  Globe,
  Network,
  Settings,
  LayoutDashboard,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  /** When true, the item is only active on exact pathname match — not on any
   *  child path. Used by the campaign Overview item, whose href is the
   *  campaign root and would otherwise match every sub-route. */
  exact?: boolean
}

export const topLevelNavigation: NavItem[] = [
  { name: 'Campaigns', href: '/campaigns', icon: BookOpen },
]

export const campaignNavigation: NavItem[] = [
  { name: 'Overview', href: '', icon: LayoutDashboard, exact: true },
  { name: 'Sessions', href: 'sessions', icon: Calendar },
  { name: 'Player Characters', href: 'player-characters', icon: UserCircle },
  { name: 'NPCs', href: 'npcs', icon: Users },
  { name: 'Locations', href: 'locations', icon: MapPin },
  { name: 'Factions', href: 'factions', icon: Shield },
  { name: 'Threads', href: 'threads', icon: GitBranch },
  { name: 'Clues', href: 'clues', icon: Search },
  { name: 'World Events', href: 'world-events', icon: Globe },
  { name: 'Graph', href: 'graph', icon: Network },
  { name: 'Settings', href: 'settings', icon: Settings },
]

export function getCampaignIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)/)
  if (!match) return null
  const id = match[1]
  if (id === 'new') return null
  return id
}

export function isNavItemActive(item: NavItem, href: string, pathname: string): boolean {
  return item.exact
    ? pathname === href
    : pathname === href || pathname.startsWith(href + '/')
}
