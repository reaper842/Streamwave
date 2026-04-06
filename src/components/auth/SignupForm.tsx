'use client'

import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4
  label: string
  color: string
}

function getPasswordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: '', color: '' }

  let score = 0
  if (password.length >= 8) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  const levels: PasswordStrength[] = [
    { score: 0, label: '', color: '' },
    { score: 1, label: 'Weak', color: 'bg-red-500' },
    { score: 2, label: 'Fair', color: 'bg-yellow-500' },
    { score: 3, label: 'Good', color: 'bg-blue-400' },
    { score: 4, label: 'Strong', color: 'bg-accent-primary' },
  ]

  return levels[score as 0 | 1 | 2 | 3 | 4]
}

export function SignupForm() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { register, isLoading, error, clearError } = useAuthStore()
  const router = useRouter()

  const strength = useMemo(() => getPasswordStrength(password), [password])

  const passwordErrors: string[] = []
  if (password && password.length < 8) passwordErrors.push('At least 8 characters')
  if (password && !/[A-Z]/.test(password)) passwordErrors.push('At least 1 uppercase letter')
  if (password && !/[0-9]/.test(password)) passwordErrors.push('At least 1 number')

  const isValid = displayName.trim() && email.trim() && passwordErrors.length === 0 && password

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    if (!isValid) return
    const { success } = await register(displayName.trim(), email.trim(), password)
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
        <label htmlFor="signup-name" className="text-xs font-semibold text-text-primary">
          Display name
        </label>
        <input
          id="signup-name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => {
            clearError()
            setDisplayName(e.target.value)
          }}
          required
          className="h-12 w-full rounded bg-bg-highlight px-4 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-text-primary"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="signup-email" className="text-xs font-semibold text-text-primary">
          Email address
        </label>
        <input
          id="signup-email"
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

      <div className="flex flex-col gap-2">
        <label htmlFor="signup-password" className="text-xs font-semibold text-text-primary">
          Password
        </label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            clearError()
            setPassword(e.target.value)
          }}
          required
          className="h-12 w-full rounded bg-bg-highlight px-4 text-sm text-text-primary placeholder-text-subdued outline-none focus:ring-2 focus:ring-text-primary"
        />

        {/* Password strength bar */}
        {password && (
          <div className="space-y-1">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    strength.score >= level ? strength.color : 'bg-bg-press'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-text-subdued">
              Strength:{' '}
              <span
                className={
                  strength.score <= 1
                    ? 'text-red-400'
                    : strength.score === 2
                      ? 'text-yellow-400'
                      : strength.score === 3
                        ? 'text-blue-400'
                        : 'text-accent-primary'
                }
              >
                {strength.label}
              </span>
            </p>
          </div>
        )}

        {/* Inline requirement hints */}
        {passwordErrors.length > 0 && (
          <ul className="space-y-0.5 text-xs text-text-subdued">
            {passwordErrors.map((msg) => (
              <li key={msg} className="flex items-center gap-1">
                <span className="text-red-400">✕</span> {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || !isValid}
        className="h-12 w-full rounded-full bg-accent-primary font-bold text-bg-base transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-bg-base/40 border-t-bg-base" />
            Creating account…
          </span>
        ) : (
          'Create Account'
        )}
      </button>
    </form>
  )
}
