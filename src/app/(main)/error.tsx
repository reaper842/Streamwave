'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MainError({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log to console in dev; in production this would go to Sentry
    console.error('[Route Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bg-highlight">
        <AlertCircle size={32} className="text-text-secondary" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold text-text-primary">Something went wrong</h2>
        <p className="max-w-sm text-sm text-text-secondary">
          We couldn&apos;t load this page. This might be a temporary issue.
        </p>
      </div>
      <button
        onClick={reset}
        className="rounded-full bg-text-primary px-6 py-2 text-sm font-semibold text-bg-base transition-opacity hover:opacity-90 active:opacity-75"
      >
        Try again
      </button>
    </div>
  )
}
