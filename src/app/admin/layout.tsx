import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/config'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const metadata = { title: 'Admin — StreamWave' }

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/')

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <AdminSidebar />
      <main className="ml-56 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
