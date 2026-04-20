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
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export const topLevelNavigation: NavItem[] = [
  { name: 'Campaigns', href: '/campaigns', icon: BookOpen },
]

export const campaignNavigation: NavItem[] = [
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
