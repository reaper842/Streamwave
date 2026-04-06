'use client'

import { apiClient, ApiRequestError } from '@/lib/api/client'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'

function getPasswordErrors(password: string): string[] {
  const errors: string[] = []
  if (password.length < 8) errors.push('At least 8 characters')
  if (!/[A-Z]/.test(password)) errors.push('At least 1 uppercase letter')
  if (!/[0-9]/.test(password)) errors.push('At least 1 number')
  return errors
}

export default function ResetPasswordConfirmPage() {
  const params = useParams()
  const token = typeof params['token'] === 'string' ? params['token'] : ''
  const router = useRouter()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordErrors = password ? getPasswordErrors(password) : []
  const mismatch = confirm && password !== confirm
  const isValid = password && confirm && passwordErrors.length === 0 && !mismatch

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!isValid) return
    setIsLoading(true)
    setError(null)
    try {
      await apiClient.post('/auth/password-reset/confirm', { token, password })
      router.push('/login?reset=success')
    } catch (err) {
      const message =
        err instanceof ApiRequestError
          ? err.status === 400
            ? 'This reset link is invalid or has expired.'
            : err.message
          : 'Something went wrong. Please try again.'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm rounded-lg bg-bg-elevated p-8">
      <h1 className="mb-2 text-center text-3xl font-bold text-text-primary">New password</h1>
      <p className="mb-6 text-center text-sm text-text-secondary">
        Choose a strong password for your account.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {error && (
          <div
            role="alert"
            className="rounded bg-red-900/40 px-4 py-3 text-sm text-red-300 border border-red-800"
          >
            {error}{' '}
            <Link href="/reset-password" className="underline hover:text-red-200">
              Request a new link
            </Link>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label htmlFor="new-password" className="text-xs font-semibold text-text-primary">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-12 w-full rounded bg-bg-highlight px-4 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-text-primary"
          />
          {passwordErrors.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs text-text-subdued">
              {passwordErrors.map((msg) => (
                <li key={msg} className="flex items-center gap-1">
                  <span className="text-red-400">✕</span> {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="confirm-password" className="text-xs font-semibold text-text-primary">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="h-12 w-full rounded bg-bg-highlight px-4 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-text-primary"
          />
          {mismatch && <p className="mt-1 text-xs text-red-400">Passwords do not match.</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading || !isValid}
          className="h-12 w-full rounded-full bg-accent-primary font-bold text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg-base/40 border-t-bg-base" />
              Saving…
            </span>
          ) : (
            'Set new password'
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
