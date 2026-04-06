import { cn } from '@/lib/utils/cn'

interface MainContentProps {
  children: React.ReactNode
  className?: string
}

export function MainContent({ children, className }: MainContentProps) {
  return (
    <main id="main-content" className={cn('flex-1 overflow-y-auto', className)}>
      {children}
    </main>
  )
}
