'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

const TABS = [
  { href: '/profile', label: 'Profile' },
  { href: '/settings', label: 'Settings' },
] as const

export function AccountTabBar() {
  const pathname = usePathname()

  return (
    <div className="flex gap-2 px-6 pt-5 pb-1">
      {TABS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-semibold transition-colors',
            pathname === href
              ? 'bg-text-primary text-bg-base'
              : 'bg-bg-highlight text-text-primary hover:bg-bg-press',
          )}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}
