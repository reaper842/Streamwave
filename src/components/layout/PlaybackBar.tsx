'use client'

import { useState } from 'react'
import { NowPlaying } from '@/components/playback/NowPlaying'
import { TransportControls } from '@/components/playback/TransportControls'
import { VolumeSlider } from '@/components/playback/VolumeSlider'
import { MiniPlayer } from '@/components/playback/MiniPlayer'
import { QueueButton } from '@/components/playback/QueueButton'
import { QueuePanel } from '@/components/playback/QueuePanel'

export function PlaybackBar() {
  const [isQueueOpen, setIsQueueOpen] = useState(false)

  return (
    <>
      {/* Queue panel — slides in above the playback bar on desktop */}
      <QueuePanel isOpen={isQueueOpen} onClose={() => setIsQueueOpen(false)} />

      {/* Full playback bar — visible on sm+ (≥640px) */}
      <footer
        data-testid="playback-bar"
        suppressHydrationWarning
        className="fixed bottom-0 left-0 right-0 z-40 hidden h-[90px] border-t border-border-default bg-bg-elevated px-4 sm:block"
        aria-label="Playback controls"
      >
        <div className="grid h-full grid-cols-3 items-center gap-4">
          <NowPlaying />
          <TransportControls />
          <div className="flex items-center justify-end gap-2">
            <VolumeSlider />
            <QueueButton isOpen={isQueueOpen} onToggle={() => setIsQueueOpen((o) => !o)} />
          </div>
        </div>
      </footer>

      {/* Mini player — visible on mobile only (< sm = < 640px) */}
      {/* Sits above the 56px MobileNavBar (bottom-14) */}
      <div
        className="fixed bottom-14 left-0 right-0 z-40 h-14 border-t border-border-default bg-bg-elevated sm:hidden"
        aria-label="Mini player"
      >
        <MiniPlayer />
      </div>
    </>
  )
}
