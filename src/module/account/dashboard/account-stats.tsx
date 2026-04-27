import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Package, ShoppingCart, Users } from "lucide-react"

const stats = [
    {
        title: "Revenue",
        value: "$124,563",
        change: "+12.5%",
        period: "Total",
        status: "up",
        icon: DollarSign,
        colors: {
            bg: "bg-green-50",
            badge: "bg-green-100 text-green-700",
            dot: "bg-green-400",
            text: "text-green-500",
            icon: "bg-green-100 text-green-600",
        },
    },
    {
        title: "Orders",
        value: "2,847",
        change: "+8.2%",
        period: "Total",
        status: "up",
        icon: ShoppingCart,
        colors: {
            bg: "bg-orange-50",
            badge: "bg-orange-100 text-orange-700",
            dot: "bg-orange-400",
            text: "text-orange-500",
            icon: "bg-orange-100 text-orange-600",
        },
    },
    {
        title: "Customers",
        value: "1,429",
        change: "+15.3%",
        period: "Total",
        status: "up",
        icon: Users,
        colors: {
            bg: "bg-purple-50",
            badge: "bg-purple-100 text-purple-700",
            dot: "bg-purple-400",
            text: "text-purple-500",
            icon: "bg-purple-100 text-purple-600",
        },
    },
    {
        title: "Products",
        value: "342",
        change: "+3.1%",
        period: "Total",
        status: "up",
        icon: Package,
        colors: {
            bg: "bg-red-50",
            badge: "bg-red-100 text-red-700",
            dot: "bg-red-400",
            text: "text-red-500",
            icon: "bg-red-100 text-red-600",
        },
    },
]

export function AccountStats() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
                const IconComponent = stat.icon
                return (
                    <Card key={index} className={`${stat.colors.bg} w-full shadow-none`}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <p className="text-md font-normal text-slate-600">{stat.title}</p>
                                <Badge variant="secondary" className={`text-xs ${stat.colors.badge}`}>
                                    {stat.period}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-2xl font-semibold text-slate-800 mb-1">{stat.value}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1">
                                            <div className={`w-3 h-3 ${stat.colors.dot} rounded-full flex items-center justify-center`}>
                                                <div className="w-1 h-1 bg-white rounded-full" />
                                            </div>
                                            <span className={`text-sm font-medium ${stat.colors.text}`}>{stat.change}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className={`w-10 h-10 ${stat.colors.icon} rounded-full flex items-center justify-center`}>
                                    <IconComponent className={`w-5 h-5 ${stat.colors.text}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    )
}