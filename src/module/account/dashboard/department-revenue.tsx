import { Bar, BarChart, XAxis, YAxis } from "recharts"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const departmentData = [
  { department: "Electronics", revenue: 567.8, percentage: 32, growth: 8.3 },
  { department: "Fashion", revenue: 445.7, percentage: 25, growth: 9.3 },
  { department: "Home & Garden", revenue: 356.8, percentage: 20, growth: 8.1 },
  { department: "Sports", revenue: 267.9, percentage: 15, growth: 10.9 },
  { department: "Books", revenue: 142.3, percentage: 8, growth: 2.4 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function DepartmentRevenue() {
  return (
    <Card className="w-full shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6">
        <div className="space-y-1">
          <CardTitle className="text-md font-normal">Department Revenue</CardTitle>
          <CardDescription>Performance by business unit - December 2024</CardDescription>
        </div>
        <Select defaultValue="december">
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="december">December</SelectItem>
            <SelectItem value="november">November</SelectItem>
            <SelectItem value="october">October</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <ChartContainer config={chartConfig} className="px-10 h-[460px]">
          <BarChart
            accessibilityLayer
            data={departmentData}
            layout="vertical"
            margin={{
              left: 30,
            }}
          >
            <XAxis type="number" dataKey="revenue" hide />
            <YAxis
              dataKey="department"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => (value.length > 12 ? value.slice(0, 12) + "..." : value)}
            />
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0]?.payload
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <div className="font-medium mb-2">{data.department}</div>
                      <div className="space-y-1">
                        <div className="flex justify-between gap-4">
                          <span className="text-sm text-muted-foreground">Revenue:</span>
                          <span className="text-sm font-medium">${data.revenue}k</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-sm text-muted-foreground">Share:</span>
                          <span className="text-sm font-medium">{data.percentage}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-sm text-muted-foreground">Growth:</span>
                          <span
                            className={`text-sm font-medium ${data.growth > 0 ? "text-green-600" : "text-red-600"}`}
                          >
                            +{data.growth}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                }
                return null
              }}
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={5} />
          </BarChart>
        </ChartContainer>
    </Card>
  )
}
