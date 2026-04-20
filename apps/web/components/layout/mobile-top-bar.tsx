'use client'

import { SidebarTrigger } from '@/components/ui/sidebar'

export function MobileTopBar() {
  return (
    <div className="flex md:hidden items-center gap-2 border-b bg-background px-4 h-14 shrink-0">
      <SidebarTrigger className="h-11 w-11" />
      <span className="text-base font-semibold tracking-tight">Grimoire</span>
    </div>
  )
}
