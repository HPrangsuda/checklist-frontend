"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FunnelChart, Funnel, LabelList, Tooltip, ResponsiveContainer } from "recharts"

const salesFunnelData = [
  { name: "Leads", value: 2400, fill: "#8884d8" },
  { name: "Qualified Leads", value: 1800, fill: "#83a6ed" },
  { name: "Proposals", value: 1200, fill: "#8dd1e1" },
  { name: "Negotiations", value: 800, fill: "#82ca9d" },
  { name: "Closed Deals", value: 500, fill: "#a4de6c" },
]

export function OpportunityTunnel() {
  return (
    <Card className="w-full shadow-none">
      <CardHeader>
        <CardTitle>Sales Funnel Analysis</CardTitle>
        <CardDescription>Conversion rates through the sales pipeline</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Funnel Chart */}
          <ResponsiveContainer width="100%" height={400}>
            <FunnelChart>
              <Tooltip />
              <Funnel dataKey="value" data={salesFunnelData} isAnimationActive>
                <LabelList position="center" fill="#fff" stroke="none" dataKey="name" />
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>

          {/* Conversion Rates */}
          <div className="space-y-4">
            <h4 className="font-semibold">Conversion Rates</h4>
            {salesFunnelData.map((stage, index) => {
              const nextStage = salesFunnelData[index + 1]
              const conversionRate = nextStage
                ? ((nextStage.value / stage.value) * 100).toFixed(1)
                : null

              return (
                <div
                  key={stage.name}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: stage.fill }}
                    ></div>
                    <span className="font-medium">{stage.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{stage.value.toLocaleString()}</div>
                    {conversionRate && (
                      <div className="text-sm text-muted-foreground">{conversionRate}% conversion</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
