'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Music, ListMusic, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/tracks', label: 'Tracks', icon: Music, exact: false },
  { href: '/admin/playlists', label: 'Playlists', icon: ListMusic, exact: false },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-bg-elevated border-r border-border-default flex flex-col z-20">
      <div className="px-4 py-5 border-b border-border-default">
        <p className="text-xs font-bold text-accent-primary tracking-widest uppercase">
          StreamWave
        </p>
        <p className="text-text-subdued text-xs mt-0.5">Admin Panel</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded text-sm font-medium transition-colors',
                active
                  ? 'bg-bg-highlight text-text-primary'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-highlight',
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-4 py-4 border-t border-border-default">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-text-subdued hover:text-text-secondary transition-colors"
        >
          <ExternalLink size={13} />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
