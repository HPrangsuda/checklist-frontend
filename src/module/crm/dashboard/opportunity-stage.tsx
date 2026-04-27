"use client"

import { TrendingUp } from "lucide-react"
import { Pie, PieChart } from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"

const chartData = [
  { stage: "Prospecting", opportunities: 120, fill: "var(--color-prospecting)" },
  { stage: "Qualified", opportunities: 90, fill: "var(--color-qualified)" },
  { stage: "Proposal", opportunities: 75, fill: "var(--color-proposal)" },
  { stage: "Negotiation", opportunities: 60, fill: "var(--color-negotiation)" },
  { stage: "Closed Won", opportunities: 45, fill: "var(--color-closedwon)" },
]

const chartConfig = {
  opportunities: {
    label: "Opportunities",
  },
  prospecting: {
    label: "Prospecting",
    color: "var(--chart-1)",
  },
  qualified: {
    label: "Qualified",
    color: "var(--chart-2)",
  },
  proposal: {
    label: "Proposal",
    color: "var(--chart-3)",
  },
  negotiation: {
    label: "Negotiation",
    color: "var(--chart-4)",
  },
  closedwon: {
    label: "Closed Won",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig

export function OpportunityStage() {
  return (
    <Card className="w-full shadow-none">
      <CardHeader className="items-center pb-0">
        <CardTitle>Opportunity Stages</CardTitle>
        <CardDescription>Sales pipeline breakdown</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="opportunities"
              nameKey="stage"
              stroke="0"
            />
            <ChartLegend
              content={<ChartLegendContent nameKey="stage" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}