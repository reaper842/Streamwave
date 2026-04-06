'use client'

import { NowPlaying } from '@/components/playback/NowPlaying'
import { TransportControls } from '@/components/playback/TransportControls'
import { VolumeSlider } from '@/components/playback/VolumeSlider'

export function PlaybackBar() {
  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-40 h-[90px] border-t border-border-default bg-bg-elevated px-4"
      aria-label="Playback controls"
    >
      <div className="grid h-full grid-cols-3 items-center gap-4">
        {/* Now Playing — left 30% */}
        <NowPlaying />

        {/* Transport Controls — center 40% */}
        <TransportControls />

        {/* Volume / Queue — right 30% */}
        <VolumeSlider />
      </div>
    </footer>
  )
}
