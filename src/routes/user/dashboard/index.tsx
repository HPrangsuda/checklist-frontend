import { RecentUserActivity } from '@/module/user/dashboard/recent-user-activity';
import UserActivityStats from '@/module/user/dashboard/user-activity-stats';
import AttendanceStats from '@/module/user/dashboard/attendance-stats';
import TeamMembers from '@/module/user/dashboard/team-members';
import QuickLinks from '@/module/user/dashboard/quick-link';
import UserInfo from '@/module/user/dashboard/user-info';
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/user/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4 lg:space-y-6">
          <UserInfo/>
          <QuickLinks/>
          <TeamMembers/>
        </div>
        <div className="space-y-4 lg:space-y-6">
          <AttendanceStats/>
          <UserActivityStats/>
          <RecentUserActivity/>
        </div>
      </div>
    </div>
  );
};