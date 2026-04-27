import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const monthlySessionData = [
  { month: "2024-01", desktop: 1245, mobile: 890, total: 2135 },
  { month: "2024-02", desktop: 1567, mobile: 1123, total: 2690 },
  { month: "2024-03", desktop: 1834, mobile: 1456, total: 3290 },
  { month: "2024-04", desktop: 2156, mobile: 1678, total: 3834 },
  { month: "2024-05", desktop: 2345, mobile: 1890, total: 4235 },
  { month: "2024-06", desktop: 2567, mobile: 2134, total: 4701 },
  { month: "2024-07", desktop: 2789, mobile: 2345, total: 5134 },
  { month: "2024-08", desktop: 2934, mobile: 2567, total: 5501 },
  { month: "2024-09", desktop: 3123, mobile: 2789, total: 5912 },
  { month: "2024-10", desktop: 3345, mobile: 2934, total: 6279 },
  { month: "2024-11", desktop: 3567, mobile: 3123, total: 6690 },
  { month: "2024-12", desktop: 3789, mobile: 3345, total: 7134 },
]

const chartConfig = {
  total: {
    label: "Total Sessions",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function UserSession() {
  const totalSessions = React.useMemo(
    () => monthlySessionData.reduce((acc, curr) => acc + curr.total, 0),
    []
  )

  return (
    <Card className="py-0 w-full shadow-none">
      <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
          <CardTitle>User Session Activity</CardTitle>
          <CardDescription>Monthly total sessions for the last 12 months</CardDescription>
        </div>
        <div className="flex">
          <div className="relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 sm:border-t-0 sm:border-l sm:px-8 sm:py-6">
            <span className="text-muted-foreground text-sm">{chartConfig.total.label}</span>
            <span className="text-xl leading-none font-semibold">
              {totalSessions.toLocaleString()}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[370px] w-full">
          <BarChart
            accessibilityLayer
            data={monthlySessionData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value + "-01")
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  year: "2-digit",
                })
              }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => `${value.toLocaleString()}`}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[180px]"
                  nameKey="sessions"
                  labelFormatter={(value) => {
                    const date = new Date(value + "-01")
                    return date.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  }}
                />
              }
            />
            <Bar dataKey="total" fill={`var(--color-total)`} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
