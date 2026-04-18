import { Info } from 'lucide-react'

export function DemoBanner() {
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/10 border-b border-primary/20 text-sm">
      <Info className="h-4 w-4 text-primary shrink-0" />
      <p className="text-muted-foreground">
        This is a demo campaign to help you explore Grimoire.{' '}
        <a href="/campaigns/new" className="text-primary hover:underline font-medium">
          Create your own campaign
        </a>{' '}
        to get started.
      </p>
    </div>
  )
}
