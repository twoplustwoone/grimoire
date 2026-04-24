import { Network } from 'lucide-react'

export default function Loading() {
  return (
    <div className="hidden md:flex flex-col h-full -m-6">
      <div className="flex items-center gap-2 px-6 py-4 border-b bg-card shrink-0">
        <div className="h-4 w-48 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Network className="h-8 w-8 animate-pulse" />
          <p className="text-sm">Loading graph…</p>
        </div>
      </div>
    </div>
  )
}
