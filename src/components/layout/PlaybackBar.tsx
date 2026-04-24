'use client'

import { NowPlaying } from '@/components/playback/NowPlaying'
import { TransportControls } from '@/components/playback/TransportControls'
import { VolumeSlider } from '@/components/playback/VolumeSlider'
import { MiniPlayer } from '@/components/playback/MiniPlayer'

export function PlaybackBar() {
  return (
    <>
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
          <VolumeSlider />
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
