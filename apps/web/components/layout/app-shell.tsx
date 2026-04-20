'use client'

import { useEffect, useRef, useState } from 'react'
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { MobileTopBar } from '@/components/layout/mobile-top-bar'

const MIN_WIDTH = 180
const MAX_WIDTH = 320
const DEFAULT_WIDTH = 240
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

interface Props {
  user: { name?: string | null; email: string; image?: string | null }
  defaultOpen: boolean
  defaultWidth: number
  children: React.ReactNode
}

export function AppShell({ user, defaultOpen, defaultWidth, children }: Props) {
  const [width, setWidth] = useState(() =>
    clamp(defaultWidth || DEFAULT_WIDTH, MIN_WIDTH, MAX_WIDTH)
  )

  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={{ '--sidebar-width': `${width}px` } as React.CSSProperties}
      >
        <AppSidebar user={user} />
        <SidebarInset>
          <MobileTopBar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </SidebarInset>
        <DesktopResizeHandle width={width} onWidthChange={setWidth} />
      </SidebarProvider>
    </TooltipProvider>
  )
}

function DesktopResizeHandle({
  width,
  onWidthChange,
}: {
  width: number
  onWidthChange: (w: number) => void
}) {
  const { state, isMobile } = useSidebar()
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const latestWidthRef = useRef(width)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    latestWidthRef.current = width
  }, [width])

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  function onMouseDown(e: React.MouseEvent) {
    startXRef.current = e.clientX
    startWidthRef.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    function onMove(ev: MouseEvent) {
      const delta = ev.clientX - startXRef.current
      const next = clamp(startWidthRef.current + delta, MIN_WIDTH, MAX_WIDTH)
      latestWidthRef.current = next
      onWidthChange(next)
    }
    function onUp() {
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      cleanupRef.current = null
      document.cookie = `sidebar_width=${latestWidthRef.current}; path=/; max-age=${COOKIE_MAX_AGE}`
    }
    cleanupRef.current = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (isMobile || state === 'collapsed') return null

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onMouseDown={onMouseDown}
      className="fixed inset-y-0 z-20 hidden w-1 cursor-col-resize bg-transparent hover:bg-sidebar-border md:block"
      style={{ left: `calc(var(--sidebar-width) - 2px)` }}
    />
  )
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}
