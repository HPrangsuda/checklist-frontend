import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { useTranslation } from "@/core/contexts/language-context"
import { CheckCircle, Clock, XCircle, Coffee } from "lucide-react"

interface AttendanceStat {
    label: string
    value: string
    icon: React.ElementType
    bgColor: string
    textColor: string
}

export default function AttendanceStats() {
    const { t } = useTranslation();
    
    const stats: AttendanceStat[] = [
        { label: t("On Time"), value: "0%", icon: CheckCircle, bgColor: "bg-green-50", textColor: "text-green-600" },
        { label: t("Late"), value: "0%", icon: Clock, bgColor: "bg-yellow-50", textColor: "text-yellow-600" },
        { label: t("Absent"), value: "0%", icon: XCircle, bgColor: "bg-red-50", textColor: "text-red-600" },
        { label: t("Avg Hours"), value: "0.0h", icon: Coffee, bgColor: "bg-blue-50", textColor: "text-blue-600" },
    ];

    return (
        <Card className="w-full shadow-none">
            <CardHeader>
                <div className="grid gap-1.5">
                    <CardTitle>{t("Attendance Statistics")}</CardTitle>
                    <CardDescription>{t("Overview of employee attendance this month")}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {stats.map((stat, index) => {
                        const Icon = stat.icon
                        return (
                            <div key={index}
                                className={`text-center p-4 rounded-lg ${stat.bgColor}`}>
                                <Icon className={`w-5 h-5 mx-auto mb-2 ${stat.textColor}`} />
                                <div className={`text-md font-normal ${stat.textColor}`}>
                                    {stat.value}
                                </div>
                                <div className="text-sm text-gray-600">{stat.label}</div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
