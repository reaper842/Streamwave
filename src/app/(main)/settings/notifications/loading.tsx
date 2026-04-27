import { AccountTabBar } from '@/components/layout/AccountTabBar'

export default function NotificationsLoading() {
  return (
    <div>
      <AccountTabBar />

      {/* Page header skeleton */}
      <div className="border-b border-border-default px-6 pb-6 pt-8">
        <div className="h-4 w-20 rounded bg-bg-elevated animate-pulse" />
        <div className="flex items-center gap-3 mt-4">
          <div className="h-6 w-6 rounded bg-bg-elevated animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 w-40 rounded bg-bg-elevated animate-pulse" />
            <div className="h-4 w-64 rounded bg-bg-elevated animate-pulse" />
          </div>
        </div>
      </div>

      <div className="px-6 py-8">
        <div className="h-3 w-44 rounded bg-bg-elevated animate-pulse mb-4" />
        <div className="overflow-hidden rounded-xl bg-bg-elevated divide-y divide-border-default">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-[18px] w-[18px] flex-shrink-0 rounded bg-bg-highlight animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-32 rounded bg-bg-highlight animate-pulse" />
                <div className="h-3 w-56 rounded bg-bg-highlight animate-pulse" />
              </div>
              <div className="h-6 w-11 flex-shrink-0 rounded-full bg-bg-highlight animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
