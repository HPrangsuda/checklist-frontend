import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const checklists = [
  { value: "10", stage: "All", percentage: 100 },
  { value: "7", stage: "Complete", percentage: 70 },
  { value: "3", stage: "Pending", percentage: 30 }
]

export function ResponsibleChecklist() {
  return (
    <Card className="shadow-sm w-full">
      <CardHeader>
        <CardTitle className="font-semibold">Responsible Checklists</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklists.map((checklist, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors"
          >
            {/* Left side: Company & Stage */}
            <div className="space-y-1">
              <p className="font-medium">{checklist.stage}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{checklist.value} List</span>
              </div>
            </div>

            {/* Right side: Value & Progress */}
            <div className="text-right">
              <p className="font-bold text-lg">{checklist.percentage}%</p>
              <Progress value={checklist.percentage} className="w-20 h-2" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}