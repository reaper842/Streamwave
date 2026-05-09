'use client'

import { ListMusic } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface QueueButtonProps {
  isOpen: boolean
  onToggle: () => void
}

export function QueueButton({ isOpen, onToggle }: QueueButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'rounded p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary',
        isOpen ? 'text-accent-primary' : 'text-text-secondary hover:text-text-primary',
      )}
      aria-label={isOpen ? 'Close queue' : 'Open queue'}
      aria-pressed={isOpen}
    >
      <ListMusic size={16} aria-hidden="true" />
    </button>
  )
}
