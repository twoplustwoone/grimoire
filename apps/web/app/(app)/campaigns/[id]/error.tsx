'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

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
        <div className="flex gap-3 justify-center">
          <Button onClick={reset} variant="outline">Try again</Button>
          <Button asChild variant="ghost">
            <Link href="/campaigns">Back to campaigns</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
