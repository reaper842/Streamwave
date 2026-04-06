'use client'

import { cn } from '@/lib/utils/cn'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'icon'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-accent-primary text-bg-base font-bold hover:bg-accent-hover active:scale-95',
  secondary:
    'border border-text-subdued text-text-primary hover:border-text-primary active:scale-95',
  ghost: 'text-text-secondary hover:text-text-primary',
  icon: 'text-text-secondary hover:text-text-primary rounded-full hover:bg-bg-highlight',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-8 py-3 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
        variantClasses[variant],
        variant !== 'icon' && sizeClasses[size],
        variant === 'icon' && 'p-2',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
