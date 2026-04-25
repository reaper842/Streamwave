'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import Image from 'next/image'
import { User, ChevronRight, LogOut, Lock, Bell } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api/client'

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const { showToast } = useToast()

  const [displayName, setDisplayName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (session?.user) {
      setDisplayName(session.user.displayName ?? session.user.name ?? '')
    }
  }, [session])

  const currentName = session?.user?.displayName ?? session?.user?.name ?? ''
  const avatarUrl = session?.user?.avatarUrl ?? session?.user?.image ?? null
  const email = session?.user?.email ?? ''

  const handleSave = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    const trimmed = displayName.trim()
    if (!trimmed || trimmed === currentName) return

    setIsSaving(true)
    try {
      await apiClient.patch('/users/me', { display_name: trimmed })
      await update({ displayName: trimmed })
      showToast('Display name updated')
    } catch {
      showToast('Failed to update display name')
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty = displayName.trim() !== '' && displayName.trim() !== currentName

  return (
    <div>
      {/* ── Page Header ── */}
      <div className="border-b border-border-default px-6 pb-6 pt-8">
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your account and preferences</p>
      </div>

      <div className="px-6 py-8">
        {/* ── Profile Summary Card ── */}
        <div className="mb-8 flex items-center gap-4 rounded-xl bg-bg-elevated p-5">
          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white/10">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={currentName || 'User'}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-bg-highlight">
                <User size={28} className="text-text-subdued" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-text-primary">
              {currentName || 'StreamWave User'}
            </p>
            <p className="truncate text-sm text-text-secondary">{email}</p>
          </div>
          <Link
            href="/profile"
            className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-border-default px-4 py-1.5 text-sm font-semibold text-text-primary transition-colors hover:border-text-secondary hover:bg-bg-highlight"
          >
            View Profile
            <ChevronRight size={14} aria-hidden="true" />
          </Link>
        </div>

        {/* ── Account Section ── */}
        <section className="mb-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-subdued">
            Account
          </h2>
          <div className="overflow-hidden rounded-xl bg-bg-elevated">
            <form onSubmit={(e) => void handleSave(e)}>
              {/* Email row — read-only */}
              <div className="flex flex-col gap-1.5 border-b border-border-default px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
                <label className="w-32 flex-shrink-0 text-sm font-semibold text-text-secondary">
                  Email
                </label>
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    readOnly
                    aria-label="Email address (read-only)"
                    className="w-full rounded-md bg-bg-highlight px-3 py-2 text-sm text-text-subdued outline-none cursor-default"
                  />
                  <p className="mt-1 text-xs text-text-subdued">
                    Email cannot be changed after registration.
                  </p>
                </div>
              </div>

              {/* Display name row */}
              <div className="flex flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
                <label
                  htmlFor="display-name"
                  className="w-32 flex-shrink-0 text-sm font-semibold text-text-secondary"
                >
                  Display Name
                </label>
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    placeholder="Enter your display name"
                    className="flex-1 rounded-md bg-bg-highlight px-3 py-2 text-sm text-text-primary placeholder-text-subdued outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
                  />
                  <button
                    type="submit"
                    disabled={isSaving || !isDirty}
                    className="rounded-full bg-accent-primary px-5 py-2 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        {/* ── Other Settings (non-functional placeholders matching Spotify's pattern) ── */}
        <section className="mb-8">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-subdued">
            Privacy &amp; Security
          </h2>
          <div className="overflow-hidden rounded-xl bg-bg-elevated divide-y divide-border-default">
            <Link
              href="/reset-password"
              className="flex items-center gap-4 px-5 py-4 text-sm transition-colors hover:bg-bg-highlight"
            >
              <Lock size={18} className="flex-shrink-0 text-text-secondary" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold text-text-primary">Change Password</p>
                <p className="text-xs text-text-secondary">Update your account password</p>
              </div>
              <ChevronRight
                size={16}
                className="flex-shrink-0 text-text-subdued"
                aria-hidden="true"
              />
            </Link>
            <div className="flex items-center gap-4 px-5 py-4 text-sm opacity-50 cursor-default select-none">
              <Bell size={18} className="flex-shrink-0 text-text-secondary" aria-hidden="true" />
              <div className="flex-1">
                <p className="font-semibold text-text-primary">Notifications</p>
                <p className="text-xs text-text-secondary">Coming soon</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Account Actions ── */}
        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-subdued">
            Account Actions
          </h2>
          <div className="overflow-hidden rounded-xl bg-bg-elevated">
            <button
              onClick={() => void signOut({ redirectTo: '/login' })}
              className="flex w-full items-center gap-4 px-5 py-4 text-sm transition-colors hover:bg-bg-highlight"
            >
              <LogOut size={18} className="flex-shrink-0 text-red-400" aria-hidden="true" />
              <div className="flex-1 text-left">
                <p className="font-semibold text-text-primary">Log out</p>
                <p className="text-xs text-text-secondary">
                  Sign out of your account on this device
                </p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
