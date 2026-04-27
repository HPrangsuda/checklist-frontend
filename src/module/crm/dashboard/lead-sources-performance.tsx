"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const leadSourceData = [
  { source: "Google Ads", leads: 1200, conversion: 45, cost: 12 },
  { source: "Facebook", leads: 950, conversion: 38, cost: 9 },
  { source: "LinkedIn", leads: 620, conversion: 52, cost: 15 },
  { source: "Email Campaigns", leads: 480, conversion: 40, cost: 8 },
]

export function LeadSourcesPerformance() {
  return (
    <Card className="w-full shadow-none">
      <CardHeader>
        <CardTitle>Lead Sources Performance</CardTitle>
        <CardDescription>Lead generation and conversion by source</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {leadSourceData.map((source, index) => (
            <div key={source.source} className="space-y-2">
              {/* Header row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Dynamic color bubble */}
                  <div
                    className={`w-3 h-3 rounded-full`}
                    style={{ backgroundColor: `hsl(${index * 90}, 70%, 50%)` }}
                  />
                  <span className="font-medium">{source.source}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{source.leads.toLocaleString()} leads</div>
                  <div className="text-sm text-muted-foreground">
                    {source.conversion}% conversion
                  </div>
                </div>
              </div>

              {/* Conversion Progress */}
              <Progress value={source.conversion} className="h-2" />

              {/* Footer row */}
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>${source.cost} cost per lead</span>
                <span>{source.conversion}% convert</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
