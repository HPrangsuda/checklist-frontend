import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

const opportunities = [
  { company: "Acme Corp", value: "$45,000", stage: "Proposal", probability: 75 },
  { company: "TechStart Inc", value: "$32,000", stage: "Negotiation", probability: 60 },
  { company: "Global Solutions", value: "$78,000", stage: "Qualified", probability: 40 },
  { company: "Innovation Labs", value: "$25,000", stage: "Proposal", probability: 80 },
]

export function RecentOpportunity() {
  return (
    <Card className="shadow-none w-full">
      <CardHeader>
        <CardTitle>Recent Opportunities</CardTitle>
        <CardDescription>Latest opportunities in the pipeline</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {opportunities.map((opp, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
          >
            {/* Left side: Company & Stage */}
            <div className="space-y-1">
              <p className="font-medium">{opp.company}</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{opp.stage}</Badge>
                <span className="text-sm text-muted-foreground">{opp.probability}% probability</span>
              </div>
            </div>

            {/* Right side: Value & Progress */}
            <div className="text-right">
              <p className="font-bold text-lg">{opp.value}</p>
              <Progress value={opp.probability} className="w-20 h-2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}