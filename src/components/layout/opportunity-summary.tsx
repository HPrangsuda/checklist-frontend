import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, BarChart3, Calendar } from "lucide-react"

export interface Opportunity {
  currency: string
  amount: number
  qutotationNo: string
  conditionTerm: string
  priority: string
  department: string
  closeAt: Date
  followAt: Date
  probability: number
  stage: string
}

interface OpportunitySummaryProps {
  opportunity: Opportunity
}

export const OpportunitySummary: React.FC<OpportunitySummaryProps> = ({ opportunity }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Amount Card */}
      <Card className="overflow-hidden shadow-none transition-shadow pb-0 pt-0">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-green-500/90 to-green-600/80 p-4 text-white">
            <h3 className="text-sm font-medium text-white/90 mb-1">Amount</h3>
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              <span className="text-2xl font-bold">
                {opportunity.currency} {opportunity.amount.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="p-4 bg-white">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Quotation No.</span>
              <span className="font-medium">{opportunity.qutotationNo}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Terms</span>
              <span className="font-medium">{opportunity.conditionTerm}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stage Card */}
      <Card className="overflow-hidden shadow-none transition-shadow pb-0 pt-0">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-blue-500/90 to-blue-600/80 p-4 text-white">
            <h3 className="text-sm font-medium text-white/90 mb-1">Stage</h3>
            <div className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2" />
              <span className="text-xl font-bold">{opportunity.stage}</span>
            </div>
          </div>
          <div className="p-4 bg-white">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Priority</span>
              <div className="flex items-center gap-1">
                <span
                  className={`h-2 w-2 rounded-full ${
                    opportunity.priority.toLowerCase() === "high"
                      ? "bg-red-500"
                      : opportunity.priority.toLowerCase() === "medium"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                  }`}
                ></span>
                <span className="font-medium">{opportunity.priority}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Department</span>
              <span className="font-medium">{opportunity.department}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Due Date Card */}
      <Card className="overflow-hidden shadow-none transition-shadow pb-0 pt-0">
        <CardContent className="p-0">
          <div className="bg-gradient-to-r from-purple-500/90 to-purple-600/80 p-4 text-white">
            <h3 className="text-sm font-medium text-white/90 mb-1">Due Date</h3>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              <span className="text-xl font-bold">
                {opportunity.closeAt.toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="p-4 bg-white">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Follow-up</span>
              <span className="font-medium">
                {opportunity.followAt.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-muted-foreground">Probability</span>
              <span className="font-medium">{opportunity.probability}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}