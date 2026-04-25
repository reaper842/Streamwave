'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api/client'

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const { showToast } = useToast()

  const currentName = session?.user?.displayName ?? session?.user?.name ?? ''

  const [displayName, setDisplayName] = useState(currentName)
  const [isSaving, setIsSaving] = useState(false)

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

  return (
    <div className="px-6 py-8">
      <h1 className="mb-8 text-2xl font-bold text-text-primary">Settings</h1>

      {/* Account */}
      <section className="mb-10">
        <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-text-secondary">
          Account
        </h2>
        <div className="max-w-md rounded-lg bg-bg-elevated p-6">
          <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-5">
            {/* Email — read-only */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-text-primary">Email</label>
              <input
                type="email"
                value={session?.user?.email ?? ''}
                readOnly
                className="rounded bg-bg-highlight px-3 py-2 text-sm text-text-secondary outline-none"
              />
              <p className="text-xs text-text-subdued">
                Email cannot be changed after registration.
              </p>
            </div>

            {/* Display name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="display-name" className="text-sm font-semibold text-text-primary">
                Display Name
              </label>
              <input
                id="display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="Enter your display name"
                className="rounded bg-bg-highlight px-3 py-2 text-sm text-text-primary placeholder-text-subdued outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving || !displayName.trim() || displayName.trim() === currentName}
              className="self-start rounded-full bg-accent-primary px-6 py-2.5 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save Profile'}
            </button>
          </form>
        </div>
      </section>

      {/* Danger zone */}
      <section>
        <h2 className="mb-4 text-base font-semibold uppercase tracking-wider text-text-secondary">
          Account Actions
        </h2>
        <div className="max-w-md rounded-lg bg-bg-elevated p-6 flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Log out</p>
            <p className="mt-1 text-xs text-text-secondary">
              Sign out of your account on this device.
            </p>
          </div>
          <button
            onClick={() => router.push('/api/auth/signout')}
            className="self-start rounded-full border border-border-default px-6 py-2 text-sm font-semibold text-text-primary transition-colors hover:border-text-secondary"
          >
            Log out
          </button>
        </div>
      </section>
    </div>
  )
}
