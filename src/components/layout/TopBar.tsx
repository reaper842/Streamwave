'use client'

import { cn } from '@/lib/utils/cn'
import { useAuthStore } from '@/stores/auth'
import { useUIStore } from '@/stores/ui'
import { ChevronLeft, ChevronRight, Menu, User } from 'lucide-react'
import { useSession } from 'next-auth/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function TopBar() {
  const router = useRouter()
  const { toggleSidebar } = useUIStore()
  const { data: session } = useSession()
  const { logout } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Detect scroll inside main content to transition background
  useEffect(() => {
    const mainEl = document.getElementById('main-content')
    if (!mainEl) return
    const handler = () => setScrolled(mainEl.scrollTop > 20)
    mainEl.addEventListener('scroll', handler)
    return () => mainEl.removeEventListener('scroll', handler)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  const displayName = session?.user?.displayName ?? session?.user?.name ?? 'Account'
  const avatarUrl = session?.user?.avatarUrl ?? session?.user?.image ?? null

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between px-4 transition-colors duration-200',
        scrolled ? 'bg-bg-elevated' : 'bg-transparent',
      )}
    >
      {/* Left: hamburger + back/forward */}
      <div className="flex items-center gap-2">
        <button
          className="rounded-full p-2 text-text-secondary hover:text-text-primary transition-colors lg:hidden"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} aria-hidden="true" />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-text-primary hover:bg-black/60 transition-colors"
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <button
          className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-text-primary hover:bg-black/60 transition-colors"
          onClick={() => router.forward()}
          aria-label="Go forward"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      {/* Right: user profile */}
      <div ref={dropdownRef} className="relative">
        <button
          className="flex items-center gap-2 rounded-full bg-bg-press p-1 pr-3 text-sm font-semibold text-text-primary hover:bg-bg-highlight transition-colors"
          onClick={() => setDropdownOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={dropdownOpen}
          aria-label="User menu"
        >
          <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-elevated">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={displayName}
                width={28}
                height={28}
                className="h-full w-full object-cover"
              />
            ) : (
              <User size={16} aria-hidden="true" />
            )}
          </div>
          <span className="max-w-[120px] truncate">{displayName}</span>
        </button>

        {dropdownOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 w-48 rounded bg-bg-highlight py-1 shadow-xl"
          >
            <button
              role="menuitem"
              className="flex h-9 w-full items-center px-4 text-sm text-text-primary hover:bg-bg-press transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              Profile
            </button>
            <button
              role="menuitem"
              className="flex h-9 w-full items-center px-4 text-sm text-text-primary hover:bg-bg-press transition-colors"
              onClick={() => setDropdownOpen(false)}
            >
              Settings
            </button>
            <div className="my-1 border-t border-border-default" />
            <button
              role="menuitem"
              className="flex h-9 w-full items-center px-4 text-sm text-text-primary hover:bg-bg-press transition-colors"
              onClick={() => {
                setDropdownOpen(false)
                logout()
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
