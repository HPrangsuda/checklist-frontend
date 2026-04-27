import { DepartmentRevenue } from '@/module/account/dashboard/department-revenue';
import { RevenueExpenses } from '@/module/account/dashboard/revenue-expenses';
import { AccountStats } from '@/module/account/dashboard/account-stats';
import { TopSeller } from '@/module/account/dashboard/top-seller';
import TopProduct from '@/module/account/dashboard/top-product';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/account/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  return (
    <div className="p-4">
      <div className='pb-4'>
        <AccountStats />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4 lg:space-y-6">
          <RevenueExpenses />
          <TopSeller/>
        </div>
        <div className="space-y-4 lg:space-y-6">
          <DepartmentRevenue />
          <TopProduct/>
        </div>
      </div>
    </div>
  );
};