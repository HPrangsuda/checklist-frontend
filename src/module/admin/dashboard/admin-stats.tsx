import { Users, Building2, Activity, ArrowUp, ArrowDown } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const stats = [
  {
    title: "Total Members",
    value: "2,847",
    change: "+12%",
    trend: "up",
    icon: Users,
    description: "vs last month",
    color: "bg-purple-500",
    lightColor: "bg-purple-50",
    darkColor: "bg-purple-950",
  },
  {
    title: "Inactive Members",
    value: "2,847",
    change: "+12%",
    trend: "up",
    icon: Users,
    description: "vs last month",
    color: "bg-red-500",
    lightColor: "bg-red-50",
    darkColor: "bg-red-950",
  },
  {
    title: "Active Sessions",
    value: "1,234",
    change: "+8%",
    trend: "up",
    icon: Activity,
    description: "currently online",
    color: "bg-green-500",
    lightColor: "bg-green-50",
    darkColor: "bg-green-950",
  },
  {
    title: "Departments",
    value: "24",
    change: "+2",
    trend: "up",
    icon: Building2,
    description: "active departments",
    color: "bg-orange-500",
    lightColor: "bg-orange-50",
    darkColor: "bg-orange-950",
  }
]

export function AdminStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon
        const isPositive = stat.trend === "up"
        const TrendIcon = isPositive ? ArrowUp : ArrowDown

        return (
          <Card
            key={index}
            className="relative overflow-hidden w-full shadow-none transition-all duration-300 hover:-translate-y-1">
            <div className={`absolute inset-0 ${stat.lightColor} dark:${stat.darkColor} opacity-50`} />
            <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            <CardContent className="relative px-6 py-1">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color} shadow-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <Badge
                  variant={isPositive ? "default" : "destructive"}
                  className={`px-2 py-1 text-xs font-semibold ${
                    isPositive
                      ? "bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-red-300"
                  }`}>
                  <TrendIcon className="w-3 h-3 mr-1" />
                  {stat.change}
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</h3>
                <div className="text-2xl font-semibold text-foreground">{stat.value}</div>
                <p className="text-sm text-muted-foreground">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
