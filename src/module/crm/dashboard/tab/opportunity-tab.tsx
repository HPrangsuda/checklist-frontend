import { OpportunityTunnel } from "../opportunity-tunnel";
import { TopOpportunity } from "../top-opportunity";

export default function OpportunityTab() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TopOpportunity/>
      <OpportunityTunnel/>
    </div>
  );
};