import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActivityTab from '@/module/crm/dashboard/tab/activity-tab';
import LeadTab from '@/module/crm/dashboard/tab/lead-tab';
import OpportunityTab from '@/module/crm/dashboard/tab/opportunity-tab';
import OverviewTab from '@/module/crm/dashboard/tab/overview-tab';
import SaleTab from '@/module/crm/dashboard/tab/sale-tab';
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react';

export const Route = createFileRoute('/crm/dashboard/')({
  component: DashboardPage,
})

function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  return (
    <div className="p-4">
      <div className="mx-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-[600px]">
            <TabsTrigger value="overview" className="font-normal">
              Overview
            </TabsTrigger>
            <TabsTrigger value="sales" className="font-normal">
              Sales
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="font-normal">
              Opportunities
            </TabsTrigger>
            <TabsTrigger value="leads" className="font-normal">
              Leads
            </TabsTrigger>
            <TabsTrigger value="activity" className="font-normal">
              Activity
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-6">
            <OverviewTab />
          </TabsContent>
          <TabsContent value="sales" className="space-y-6">
            <SaleTab/>
          </TabsContent>
          <TabsContent value="opportunities" className="space-y-6">
            <OpportunityTab />
          </TabsContent>
          <TabsContent value="leads" className="space-y-6">
            <LeadTab/>
          </TabsContent>
          <TabsContent value="activity" className="space-y-6">
            <ActivityTab/>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};