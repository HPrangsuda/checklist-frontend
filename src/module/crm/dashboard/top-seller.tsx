import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const performers = [
  { name: "Sarah Johnson", deals: 8, revenue: "$124,000", target: 85 },
  { name: "Mike Davis", deals: 6, revenue: "$98,000", target: 78 },
  { name: "Emma Wilson", deals: 5, revenue: "$87,000", target: 72 },
  { name: "John Smith", deals: 4, revenue: "$65,000", target: 65 },
]

export function TopSeller() {
  return (
    <Card className="shadow-none w-full">
      <CardHeader>
        <CardTitle>Top Performers</CardTitle>
        <CardDescription>Sales team performance this month</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {performers.map((performer, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
          >
            {/* Left: Name & Deals */}
            <div className="space-y-1">
              <p className="font-medium">{performer.name}</p>
              <p className="text-sm text-muted-foreground">{performer.deals} deals closed</p>
            </div>

            {/* Right: Revenue & Progress */}
            <div className="text-right space-y-1">
              <p className="font-bold">{performer.revenue}</p>
              <div className="flex items-center gap-2">
                <Progress value={performer.target} className="w-16 h-2" />
                <span className="text-xs text-muted-foreground">{performer.target}%</span>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
