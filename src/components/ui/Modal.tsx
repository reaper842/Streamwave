'use client'

import { cn } from '@/lib/utils/cn'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    if (open) {
      el.showModal()
    } else {
      el.close()
    }
  }, [open])

  useEffect(() => {
    const el = dialogRef.current
    if (!el) return
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    el.addEventListener('cancel', handleCancel)
    return () => el.removeEventListener('cancel', handleCancel)
  }, [onClose])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={cn(
        'fixed inset-0 z-50 m-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-bg-elevated p-6 text-text-primary shadow-2xl backdrop:bg-black/70',
        className,
      )}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose()
      }}
    >
      <div className="flex items-start justify-between">
        {title && <h2 className="text-xl font-bold text-text-primary">{title}</h2>}
        <button
          onClick={onClose}
          className="ml-auto rounded-full p-1 text-text-secondary hover:text-text-primary"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>
      </div>
      <div className="mt-4">{children}</div>
    </dialog>
  )
}
