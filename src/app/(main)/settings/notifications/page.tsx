'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell, Music2, ListMusic, ShieldCheck, Megaphone, ChevronLeft } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { apiClient } from '@/lib/api/client'
import { AccountTabBar } from '@/components/layout/AccountTabBar'
import type { NotificationPreferences, NotificationPreferenceKey } from '@/types/notifications'

// ── Toggle component ──────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean
  onChange: () => void
  disabled?: boolean
  id: string
}

function Toggle({ checked, onChange, disabled = false, id }: ToggleProps) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-accent-primary' : 'bg-bg-press',
      ].join(' ')}
    >
      <span
        aria-hidden="true"
        className={[
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0',
          'transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

// ── Preference row ────────────────────────────────────────────────────────────

interface PrefRowProps {
  id: NotificationPreferenceKey
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onToggle: (key: NotificationPreferenceKey) => void
  saving: boolean
}

function PrefRow({ id, icon, title, description, checked, onToggle, saving }: PrefRowProps) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <div className="flex-shrink-0 text-text-secondary" aria-hidden="true">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`pref-${id}`}
          className="block font-semibold text-text-primary cursor-pointer"
        >
          {title}
        </label>
        <p className="text-xs text-text-secondary mt-0.5">{description}</p>
      </div>
      <Toggle id={`pref-${id}`} checked={checked} onChange={() => onToggle(id)} disabled={saving} />
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PREF_CONFIG: Array<{
  key: NotificationPreferenceKey
  icon: React.ReactNode
  title: string
  description: string
}> = [
  {
    key: 'new_releases',
    icon: <Music2 size={18} />,
    title: 'New Releases',
    description: 'Get notified when artists you follow release new music',
  },
  {
    key: 'playlist_updates',
    icon: <ListMusic size={18} />,
    title: 'Playlist Activity',
    description: 'Updates when tracks are added to playlists you follow',
  },
  {
    key: 'account_security',
    icon: <ShieldCheck size={18} />,
    title: 'Account Security',
    description: 'Important alerts about your account and sign-in activity',
  },
  {
    key: 'product_updates',
    icon: <Megaphone size={18} />,
    title: 'Product Updates',
    description: 'New features, improvements, and StreamWave news',
  },
]

export default function NotificationsPage() {
  const { showToast } = useToast()
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient
      .get<NotificationPreferences>('/users/me/notifications')
      .then((res) => setPrefs(res.data))
      .catch(() => showToast('Failed to load notification preferences'))
  }, [showToast])

  const handleToggle = async (key: NotificationPreferenceKey) => {
    if (!prefs || saving) return

    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    setSaving(true)

    try {
      const res = await apiClient.patch<NotificationPreferences>('/users/me/notifications', {
        [key]: next[key],
      })
      setPrefs(res.data)
    } catch {
      setPrefs(prefs)
      showToast('Failed to save preference')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <AccountTabBar />

      {/* ── Page Header ── */}
      <div className="border-b border-border-default px-6 pb-6 pt-8">
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Back to Settings"
          >
            <ChevronLeft size={16} aria-hidden="true" />
            Settings
          </Link>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Bell size={24} className="text-accent-primary" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Notifications</h1>
            <p className="mt-0.5 text-sm text-text-secondary">
              Choose what you want to be notified about
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        {!prefs ? (
          /* Loading state — full skeletons handled by loading.tsx, but guard here too */
          <div className="space-y-3">
            {PREF_CONFIG.map((p) => (
              <div key={p.key} className="h-[72px] rounded-xl bg-bg-elevated animate-pulse" />
            ))}
          </div>
        ) : (
          <section>
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-text-subdued">
              Email &amp; Push Notifications
            </h2>
            <div className="overflow-hidden rounded-xl bg-bg-elevated divide-y divide-border-default">
              {PREF_CONFIG.map((p) => (
                <PrefRow
                  key={p.key}
                  id={p.key}
                  icon={p.icon}
                  title={p.title}
                  description={p.description}
                  checked={prefs[p.key]}
                  onToggle={handleToggle}
                  saving={saving}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-text-subdued">
              Notification delivery depends on your email and device settings.
            </p>
          </section>
        )}
      </div>
    </div>
  )
}
