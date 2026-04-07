'use client'

import { MainContent } from '@/components/layout/MainContent'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { useUIStore } from '@/stores/ui'
import { useLibraryStore } from '@/stores/library'
import { useEffect } from 'react'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { setSidebarOpen } = useUIStore()
  const fetchLibrary = useLibraryStore((s) => s.fetchLibrary)

  // Responsive sidebar: collapse below 1200px, hide below 900px
  useEffect(() => {
    const update = () => {
      if (window.innerWidth >= 1200) {
        setSidebarOpen(true)
      } else if (window.innerWidth >= 900) {
        setSidebarOpen(false)
      }
      // Below 900px the sidebar is hidden via CSS; toggle controls it
    }
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [setSidebarOpen])

  // Bootstrap library data once when the authenticated layout mounts
  useEffect(() => {
    void fetchLibrary()
  }, [fetchLibrary])

  return (
    <div className="flex h-full flex-col">
      {/* Main area: sidebar + scrollable content, above the playback bar */}
      <div className="flex flex-1 overflow-hidden pb-[90px]">
        {/* Sidebar — hidden on < 900px, shown via toggle */}
        <div className="hidden md:flex h-full">
          <Sidebar />
        </div>

        {/* Content column */}
        <div className="flex flex-1 flex-col overflow-hidden bg-bg-base">
          <TopBar />
          <MainContent>{children}</MainContent>
        </div>
      </div>
    </div>
  )
}
