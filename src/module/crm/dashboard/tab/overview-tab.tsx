import { CrmStats } from "../crm-stats";
import { MonthlyRevenue } from "../monthly-revenue";
import { OpportunityStage } from "../opportunity-stage";
import { RecentOpportunity } from "../recent-opportunity";
import { TopSeller } from "../top-seller";

export default function OverviewTab() {
  return (
    <div>
      <div className='pb-4'>
        <CrmStats />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MonthlyRevenue />
        <OpportunityStage />
        <RecentOpportunity />
        <TopSeller />
      </div>
    </div>
  );
};