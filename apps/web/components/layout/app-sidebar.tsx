'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import {
  campaignNavigation,
  getCampaignIdFromPath,
  isNavItemActive,
  topLevelNavigation,
  type NavItem,
} from '@/lib/navigation'
import { ArrowLeft, Search, UserCircle } from 'lucide-react'

interface Props {
  user: { name?: string | null; email: string }
}

export function AppSidebar({ user }: Props) {
  const pathname = usePathname()
  const campaignId = getCampaignIdFromPath(pathname)
  const { state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <div className="px-2 py-2 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-0">
          <span className="text-lg font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            Grimoire
          </span>
          <p className="text-xs text-muted-foreground mt-1 truncate group-data-[collapsible=icon]:hidden">
            {user.email}
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {campaignId ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="All campaigns"
                    className="text-muted-foreground"
                  >
                    <Link href="/campaigns">
                      <ArrowLeft />
                      <span>All campaigns</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                {campaignNavigation.map((item) => {
                  const href = item.href
                    ? `/campaigns/${campaignId}/${item.href}`
                    : `/campaigns/${campaignId}`
                  return (
                    <NavMenuItem
                      key={item.name}
                      item={item}
                      href={href}
                      pathname={pathname}
                    />
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {topLevelNavigation.map((item) => (
                  <NavMenuItem
                    key={item.name}
                    item={item}
                    href={item.href}
                    pathname={pathname}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Search (⌘K)"
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: true,
                  bubbles: true,
                })
                document.dispatchEvent(event)
              }}
            >
              <Search />
              <span className="flex-1 text-left">Search</span>
              <kbd className="flex items-center gap-0.5 border rounded px-1 py-0.5 text-[10px] group-data-[collapsible=icon]:hidden">
                <span>⌘</span>
                <span>K</span>
              </kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {!isCollapsed && (
            <SidebarMenuItem>
              <ThemeSwitcher />
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Account">
              <Link href="/settings">
                <UserCircle />
                <span>Account</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function NavMenuItem({
  item,
  href,
  pathname,
}: {
  item: NavItem
  href: string
  pathname: string
}) {
  const Icon = item.icon
  const isActive = isNavItemActive(item, href, pathname)
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.name}
      >
        <Link href={href} aria-current={isActive ? 'page' : undefined}>
          <Icon />
          <span>{item.name}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
