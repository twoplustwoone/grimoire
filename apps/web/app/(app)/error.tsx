'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <h2 className="text-xl font-bold">Something went wrong</h2>
        <p className="text-muted-foreground text-sm">{error.message ?? 'An unexpected error occurred'}</p>
        <Button onClick={reset} variant="outline">Try again</Button>
      </div>
    </div>
  )
}
