import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2 } from "lucide-react"

const departmentData = [
  { name: "Engineering", monthlyUsers: 45, totalUsers: 120, growth: 12 },
  { name: "Marketing", monthlyUsers: 32, totalUsers: 85, growth: 8 },
  { name: "Sales", monthlyUsers: 28, totalUsers: 75, growth: -3 },
  { name: "HR", monthlyUsers: 15, totalUsers: 40, growth: 5 },
  { name: "Finance", monthlyUsers: 22, totalUsers: 55, growth: 15 },
]

export function DepartmentSession() {
  return (
    <Card className="w-full shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Department Overview</CardTitle>
        <CardDescription>Recent activity and user growth by department</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {departmentData.map((dept) => (
            <div
              key={dept.name}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {/* Left: Icon and Name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-normal text-base">{dept.name}</h3>
                  <p className="text-xs text-muted-foreground">Department Session</p>
                </div>
              </div>

              {/* Right: Stats */}
              <div className="flex items-center gap-4">
                <div className="text-center border-blue-300/30">
                  <div className="text-md font-normal text-primary">{dept.monthlyUsers}</div>
                  <div className="text-xs text-muted-foreground">This Month</div>
                </div>

                <div className="text-center">
                  <div className="text-md font-normal text-foreground">{dept.totalUsers}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}