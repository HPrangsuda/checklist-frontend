import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { useTranslation } from "@/core/contexts/language-context"
import { Calendar, Download, Edit, LogIn, Plus, RefreshCw, Trash, Upload } from "lucide-react"

const actionIcons: Record<string, React.ElementType> = {
    CREATE: Plus,
    UPDATE: Edit,
    SIGNIN: LogIn,
    DELETE: Trash,
    EXPORT: Upload,
    IMPORT: Download,
    SYNC: RefreshCw,
}

interface Activity {
    id: number
    module: string
    action: string
    description: string
    createdBy: string
    createdAt: string
}

export function RecentUserActivity() {
    const { t } = useTranslation();

    const userActivities: Activity[] = [
        {
            id: 1,
            module: "CRM",
            action: "CREATE",
            description: "New customer record created",
            createdBy: "John Doe",
            createdAt: "2 mins ago"
        },
        {
            id: 2,
            module: "HR",
            action: "UPDATE",
            description: "Employee profile updated",
            createdBy: "Sarah Wilson",
            createdAt: "5 mins ago"
        },
        {
            id: 3,
            module: "ADMIN",
            action: "DELETE",
            description: "User permissions removed",
            createdBy: "Mike Johnson",
            createdAt: "8 mins ago"
        },
        {
            id: 4,
            module: "ACCOUNT",
            action: "SIGNIN",
            description: "User logged into system",
            createdBy: "Emma",
            createdAt: "8 mins ago"
        },
        {
            id: 5,
            module: "ADMIN",
            action: "DELETE",
            description: "User permissions removed",
            createdBy: "Mike Johnson",
            createdAt: "8 mins ago"
        }
    ];

    return (
        <Card className="w-full shadow-none">
            <CardHeader>
                <div className="grid gap-1.5">
                    <CardTitle>{t("Recent User Activities")}</CardTitle>
                    <CardDescription>{t("Latest changes and updates performed")}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {userActivities.map((activity, index) => {
                        const ModuleIcon = actionIcons[activity.action] || Calendar;
                        return (
                            <div key={activity.id} className="relative">
                                {index !== userActivities.length - 1 && (
                                    <div className="absolute left-4 top-8 w-px h-16 bg-gray-300" />
                                )}
                                <div className="flex items-start gap-3">
                                    <div className="relative">
                                        <div className="p-2 bg-white border-2 border-red-200 rounded-full">
                                            <ModuleIcon className="h-3 w-3 text-red-600" />
                                        </div>
                                    </div>
                                    <div className="flex-1 bg-white px-3 py-2 rounded-lg border border-gray-200">
                                        <p className="text-sm text-gray-900 mb-1">{activity.description}</p>
                                        <p className="text-xs text-gray-500">
                                            {activity.module} , {activity.createdAt}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}