'use client'

import { cn } from '@/lib/utils/cn'
import { X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ToastType = 'default' | 'error' | 'success'

interface Toast {
  id: string
  message: string
  type?: ToastType
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const showToast = useCallback((message: string, type: ToastType = 'default') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-28 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), 3000)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [toast.id, onDismiss])

  return (
    <div
      role="alert"
      className={cn(
        'pointer-events-auto flex items-center gap-3 rounded px-4 py-3 text-sm text-text-primary shadow-lg',
        toast.type === 'error' ? 'bg-red-900' : 'bg-bg-press',
        toast.type === 'success' && 'bg-accent-primary text-bg-base',
      )}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-2 text-text-secondary hover:text-text-primary"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}
