'use client'

import { useEffect } from 'react'
import { connectEngineToStore } from '@/stores/player'

/**
 * Mounts once in the root layout. Subscribes the AudioEngine to usePlayerStore
 * so all engine state changes are reflected in the Zustand store.
 */
export function AudioEngineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const unsubscribe = connectEngineToStore()
    return unsubscribe
  }, [])

  return <>{children}</>
}
