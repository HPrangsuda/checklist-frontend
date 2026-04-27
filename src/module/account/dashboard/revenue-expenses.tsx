import { useState } from "react"
import { TrendingUp } from "lucide-react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const chartData = {
  "2024": [
    { month: "January", revenue: 245000, expenses: 180000 },
    { month: "February", revenue: 267000, expenses: 195000 },
    { month: "March", revenue: 289000, expenses: 210000 },
    { month: "April", revenue: 312000, expenses: 225000 },
    { month: "May", revenue: 298000, expenses: 215000 },
    { month: "June", revenue: 334000, expenses: 240000 },
    { month: "July", revenue: 356000, expenses: 255000 },
    { month: "August", revenue: 378000, expenses: 270000 },
    { month: "September", revenue: 345000, expenses: 250000 },
    { month: "October", revenue: 389000, expenses: 280000 },
    { month: "November", revenue: 412000, expenses: 295000 },
    { month: "December", revenue: 456000, expenses: 320000 },
  ],
  "2023": [
    { month: "January", revenue: 198000, expenses: 155000 },
    { month: "February", revenue: 215000, expenses: 170000 },
    { month: "March", revenue: 234000, expenses: 185000 },
    { month: "April", revenue: 256000, expenses: 200000 },
    { month: "May", revenue: 243000, expenses: 190000 },
    { month: "June", revenue: 278000, expenses: 215000 },
    { month: "July", revenue: 295000, expenses: 230000 },
    { month: "August", revenue: 312000, expenses: 245000 },
    { month: "September", revenue: 289000, expenses: 225000 },
    { month: "October", revenue: 334000, expenses: 260000 },
    { month: "November", revenue: 356000, expenses: 275000 },
    { month: "December", revenue: 389000, expenses: 290000 },
  ],
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function RevenueExpenses() {
  const [selectedYear, setSelectedYear] = useState<keyof typeof chartData>("2024")

  const data = chartData[selectedYear]
  const currentYearData = chartData[selectedYear]
  const totalRevenue = currentYearData.reduce((sum, month) => sum + month.revenue, 0)
  const totalExpenses = currentYearData.reduce((sum, month) => sum + month.expenses, 0)
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = ((netProfit / totalRevenue) * 100).toFixed(1)

  return (
    <Card className="w-full shadow-none">
      <CardHeader className="pb-6">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-md">Revenue & Expenses</CardTitle>
            <CardDescription className="text-sm">Track your financial performance over time</CardDescription>
          </div>
          <Select value={selectedYear} onValueChange={(value) => setSelectedYear(value as keyof typeof chartData)}>
            <SelectTrigger className="w-32 border-slate-300 bg-white/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2024">2024</SelectItem>
              <SelectItem value="2023">2023</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[400px]">
          <LineChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
              stroke="#64748b"
              fontSize={12}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="revenue"
              type="natural"
              stroke="var(--color-revenue)"
              strokeWidth={3}
              dot={{ fill: "var(--color-revenue)", strokeWidth: 2, r: 4 }}
            />
            <Line
              dataKey="expenses"
              type="natural"
              stroke="var(--color-expenses)"
              strokeWidth={3}
              dot={{ fill: "var(--color-expenses)", strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 leading-none font-medium">
          Profit margin trending up by {profitMargin}% this year <TrendingUp className="h-4 w-4" />
        </div>
        <div className="text-muted-foreground leading-none">
          Net profit: ${(netProfit / 1000000).toFixed(1)}M from ${(totalRevenue / 1000000).toFixed(1)}M revenue
        </div>
      </CardFooter>
    </Card>
  )
}
