'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PenSquare } from 'lucide-react'

export function CaptureCTA() {
  const [disclosed, setDisclosed] = useState(false)

  return (
    <div className="space-y-2">
      <Button size="lg" className="w-full sm:w-auto" onClick={() => setDisclosed(true)}>
        <PenSquare className="h-4 w-4 mr-2" />
        Start capturing
      </Button>
      {disclosed && (
        <p className="text-sm text-muted-foreground">
          Capture is coming in a future update.
        </p>
      )}
    </div>
  )
}
