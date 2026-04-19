'use client'

import { cn } from '@/lib/utils/cn'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

interface ContextMenuItem {
  label: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  submenu?: ContextMenuItem[]
}

interface ContextMenuProps {
  items: ContextMenuItem[]
  children: React.ReactNode
  className?: string
}

interface Position {
  x: number
  y: number
}

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setPos({ x: e.clientX, y: e.clientY })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Clamp position to stay within viewport (applied as inline style via menuRef)
  useEffect(() => {
    if (!open || !menuRef.current) return
    const menu = menuRef.current
    const rect = menu.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const x = rect.right > vw ? vw - rect.width - 8 : pos.x
    const y = rect.bottom > vh ? vh - rect.height - 8 : pos.y
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
  }, [open, pos])

  return (
    <>
      <div
        ref={triggerRef}
        className={cn('contents', className)}
        onContextMenu={handleContextMenu}
        data-context-trigger
      >
        {children}
      </div>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-48 rounded bg-bg-highlight py-1 shadow-xl"
          style={{ left: pos.x, top: pos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                'flex h-9 w-full items-center px-3 text-left text-sm transition-colors',
                item.danger
                  ? 'text-red-400 hover:bg-bg-press hover:text-red-300'
                  : 'text-text-primary hover:bg-bg-press',
                item.disabled && 'cursor-not-allowed opacity-50',
              )}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}

/** Three-dot icon button that opens the context menu on click */
interface ContextMenuTriggerProps {
  items: ContextMenuItem[]
  className?: string
}

export function ContextMenuTrigger({ items, className }: ContextMenuTriggerProps) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Position>({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    // Right-align the menu to the button's right edge, pre-clamped so it never starts
    // off-screen. 192px = min-w-48 (the menu's minimum width). useLayoutEffect below
    // fine-tunes based on the actual rendered width.
    const x = Math.max(8, rect.right - 192)
    setPos({ x, y: rect.bottom })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('click', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Fine-tune position using the actual rendered dimensions. Direct DOM mutation is
  // intentional here — it corrects for content wider than the 192px estimate without
  // calling setState (which would cause an extra render cycle caught by the lint rule).
  useLayoutEffect(() => {
    if (!open || !menuRef.current) return
    const menu = menuRef.current
    const { width, height } = menu.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    let x = pos.x
    let y = pos.y
    if (x + width > vw - 8) x = vw - width - 8
    if (x < 8) x = 8
    if (y + height > vh - 8) y = vh - height - 8
    if (y < 8) y = 8
    menu.style.left = `${x}px`
    menu.style.top = `${y}px`
  }, [open, pos.x, pos.y])

  return (
    <>
      <button
        className={cn('rounded-full p-1 text-text-secondary hover:text-text-primary', className)}
        aria-label="More options"
        aria-haspopup="menu"
        onClick={handleClick}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="2" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="14" cy="8" r="1.5" />
        </svg>
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 min-w-48 rounded bg-bg-highlight py-1 shadow-xl"
          style={{ left: pos.x, top: pos.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                'flex h-9 w-full items-center px-3 text-left text-sm transition-colors',
                item.danger
                  ? 'text-red-400 hover:bg-bg-press hover:text-red-300'
                  : 'text-text-primary hover:bg-bg-press',
                item.disabled && 'cursor-not-allowed opacity-50',
              )}
              onClick={() => {
                item.onClick()
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </>
  )
}
