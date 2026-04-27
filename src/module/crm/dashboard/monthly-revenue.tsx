import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from "@/components/ui/chart"

const chartData = [
  { month: "January", revenue: 186000 },
  { month: "February", revenue: 305000 },
  { month: "March", revenue: 237000 },
  { month: "April", revenue: 173000 },
  { month: "May", revenue: 209000 },
  { month: "June", revenue: 314000 },
  { month: "July", revenue: 287000 },
  { month: "August", revenue: 342000 },
  { month: "September", revenue: 298000 },
  { month: "October", revenue: 365000 },
  { month: "November", revenue: 421000 },
  { month: "December", revenue: 389000 },
]

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

export function MonthlyRevenue() {
  return (
    <Card className="shadow-none w-full">
      <CardHeader>
        <CardTitle>Monthly Revenue</CardTitle>
        <CardDescription>Recent user sessions and activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value) => [
                    `$${(value as number).toLocaleString()}`,
                    "Revenue",
                  ]}
                />
              }
            />
            <Bar
              dataKey="revenue"
              fill="var(--color-revenue)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}