import { LeadSourcesPerformance } from "../lead-sources-performance";
import { RecentLeads } from "../recent-leads";

export default function LeadTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LeadSourcesPerformance/>
        <RecentLeads/>
    </div>
  );
};