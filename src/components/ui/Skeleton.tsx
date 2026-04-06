import { cn } from '@/lib/utils/cn'

interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: string
}

export function Skeleton({ className, width, height, rounded }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-bg-highlight', rounded ?? 'rounded', className)}
      style={{
        width: width !== undefined ? width : undefined,
        height: height !== undefined ? height : undefined,
      }}
      aria-hidden="true"
    />
  )
}
