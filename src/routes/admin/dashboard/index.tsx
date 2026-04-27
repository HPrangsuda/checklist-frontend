import { AdminStats } from '@/module/admin/dashboard/admin-stats'
import { RecentUserActivity } from '@/module/admin/dashboard/recent-user-activity'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="p-4 space-y-4">
      <AdminStats />
      <RecentUserActivity />
    </div>
  )
}