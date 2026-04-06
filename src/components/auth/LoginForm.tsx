'use client'

import { useAuthStore } from '@/stores/auth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, clearError } = useAuthStore()
  const router = useRouter()

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const { success } = await login(email, password)
    if (success) router.push('/')
  }

  return (
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
        <label htmlFor="login-email" className="text-xs font-semibold text-text-primary">
          Email address
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(e) => {
            clearError()
            setEmail(e.target.value)
          }}
          required
          className="h-12 w-full rounded bg-bg-highlight px-4 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-text-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="login-password" className="text-xs font-semibold text-text-primary">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            clearError()
            setPassword(e.target.value)
          }}
          required
          className="h-12 w-full rounded bg-bg-highlight px-4 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-text-primary"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading || !email || !password}
        className="h-12 w-full rounded-full bg-accent-primary font-bold text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg-base/40 border-t-bg-base" />
            Logging in…
          </span>
        ) : (
          'Log In'
        )}
      </button>

      <p className="text-center text-sm text-text-subdued">
        <Link
          href="/reset-password"
          className="text-text-primary underline hover:text-accent-primary"
        >
          Forgot your password?
        </Link>
      </p>
    </form>
  )
}
