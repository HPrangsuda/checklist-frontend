import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTranslation } from "@/core/contexts/language-context"
import { Plus, Edit, LogIn, Trash, Upload, Download, RefreshCw } from "lucide-react"

interface ActionItem {
    name: string,
    action: string
    count: number
    color: string
}

const iconsMap: Record<string, React.ElementType> = {
    CREATE: Plus,
    UPDATE: Edit,
    SIGNIN: LogIn,
    DELETE: Trash,
    EXPORT: Upload,
    IMPORT: Download,
    SYNC: RefreshCw,
}

export default function UserActivityStats() {
    const { t } = useTranslation()

    const actionStats: ActionItem[] = [
        { name: "Create", action: "CREATE", count: 342, color: "bg-green-500" },
        { name: "Update", action: "UPDATE", count: 298, color: "bg-blue-500" },
        { name: "Delete", action: "DELETE", count: 89, color: "bg-red-500" },
        { name: "Import", action: "IMPORT", count: 45, color: "bg-teal-500" },
        { name: "Export", action: "EXPORT", count: 67, color: "bg-orange-500" },
        { name: "Signin", action: "SIGNIN", count: 156, color: "bg-purple-500" }
    ]

    return (
        <Card className="w-full shadow-none">
            <CardHeader>
                <div className="grid gap-1.5">
                    <CardTitle>{t("User Activities Statics")}</CardTitle>
                    <CardDescription>{t("Summary of Key Platform Activities")}</CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-3">
                    {actionStats.slice(0, 6).map((item) => {
                        const IconComponent = iconsMap[item.action]
                        return (
                            <div key={item.action} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                                <div className={`p-2 rounded ${item.color}`}>
                                    {IconComponent && <IconComponent className="h-5 w-5 text-white" />}
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-600">{item.name}</p>
                                    <p className="text-sm font-normal text-gray-900">{item.count}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
