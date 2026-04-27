import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

const topOpportunities = [
  { company: "Acme Corp", owner: "Sarah Johnson", stage: "Proposal", value: 45000, probability: 75 },
  { company: "TechStart Inc", owner: "Mike Davis", stage: "Negotiation", value: 32000, probability: 60 },
  { company: "Global Solutions", owner: "Emma Wilson", stage: "Qualified", value: 78000, probability: 40 },
  { company: "Innovation Labs", owner: "John Smith", stage: "Proposal", value: 25000, probability: 80 },
]

export function TopOpportunity() {
  return (
    <Card className="w-full shadow-none">
      <CardHeader>
        <CardTitle>Top Opportunities</CardTitle>
        <CardDescription>Highest value opportunities in the pipeline</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {topOpportunities.map((opp, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
            >
              {/* Left section: company logo placeholder & details */}
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="font-semibold text-primary">{opp.company.charAt(0)}</span>
                </div>
                <div>
                  <div className="font-semibold">{opp.company}</div>
                  <div className="text-sm text-muted-foreground">{opp.owner}</div>
                </div>
              </div>

              {/* Right section: stage, value, probability & view button */}
              <div className="flex items-center gap-4">
                <Badge variant="outline">{opp.stage}</Badge>
                <div className="text-right">
                  <div className="font-semibold">${(opp.value / 1000).toFixed(0)}K</div>
                  <div className="text-sm text-muted-foreground">{opp.probability}% probability</div>
                </div>
                <Button variant="ghost" size="sm">
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}