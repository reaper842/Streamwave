'use client'

import { apiClient, ApiRequestError } from '@/lib/api/client'
import Link from 'next/link'
import { useState } from 'react'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await apiClient.post('/auth/password-reset', { email: email.trim() })
      setSubmitted(true)
    } catch (err) {
      // Always show success to prevent user enumeration
      if (err instanceof ApiRequestError && err.status !== 429) {
        setSubmitted(true)
      } else if (err instanceof ApiRequestError && err.status === 429) {
        setError('Too many requests. Please wait a moment and try again.')
      } else {
        setSubmitted(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="w-full max-w-sm rounded-lg bg-bg-elevated p-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-primary/20">
            <svg
              viewBox="0 0 24 24"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-accent-primary"
              aria-hidden="true"
            >
              <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-text-primary">Check your email</h1>
        <p className="mb-6 text-sm text-text-secondary">
          If an account exists for <span className="text-text-primary">{email}</span>, we&apos;ve
          sent a password reset link. Check your spam folder if you don&apos;t see it.
        </p>
        <Link
          href="/login"
          className="text-sm text-text-primary underline hover:text-accent-primary"
        >
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm rounded-lg bg-bg-elevated p-8">
      <h1 className="mb-2 text-center text-3xl font-bold text-text-primary">Reset password</h1>
      <p className="mb-6 text-center text-sm text-text-secondary">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="rounded bg-red-900/40 px-4 py-3 text-sm text-red-300 border border-red-800"
          >
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="reset-email" className="text-xs font-semibold text-text-primary">
            Email address
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 w-full rounded bg-bg-highlight px-4 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-text-primary"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="h-12 w-full rounded-full bg-accent-primary font-bold text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg-base/40 border-t-bg-base" />
              Sending…
            </span>
          ) : (
            'Send reset link'
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-subdued">
        <Link href="/login" className="text-text-primary underline hover:text-accent-primary">
          Back to login
        </Link>
      </p>
    </div>
  )
}
