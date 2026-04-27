import { DollarSign, Target, Users, TrendingUp, Calendar, ArrowUpIcon, ArrowDownIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

const metrics = [
  {
    title: "Total Revenue",
    value: "$328,000",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Opportunities",
    value: "142",
    change: "+8.2%",
    trend: "up",
    icon: Target,
  },
  {
    title: "Leads",
    value: "196",
    change: "-3.1%",
    trend: "down",
    icon: Users,
  },
  {
    title: "Conversion Rate",
    value: "24.8%",
    change: "+2.3%",
    trend: "up",
    icon: TrendingUp,
  }
]

export function CrmStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          const isPositive = metric.trend === "up"
          return (
            <Card
              key={index}
              className="shadow-none transition-all duration-500 hover:-translate-y-2">
              <CardContent className="px-8 py-4 relative">
                <div className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center">
                  <Icon className="h-6 w-6 text-chart-1" />
                </div>

                {/* Title and value */}
                <div className="pr-16">
                  <h3 className="text-md font-normal mb-3">{metric.title}</h3>
                  <p className="text-xl font-bold text-card-foreground mb-4">{metric.value}</p>

                  {/* Change badge */}
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                      isPositive ? "bg-chart-2/10 text-chart-2" : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpIcon className="h-3 w-3" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3" />
                    )}
                    {metric.change}
                  </div>
                </div>

                {/* Bottom gradient bar */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-chart-1 to-chart-2 rounded-b-lg"></div>
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}
