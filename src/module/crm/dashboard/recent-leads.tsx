"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Mail } from "lucide-react"

const recentLeads = [
  { name: "John Doe", company: "Acme Inc.", source: "Google Ads", score: 85, status: "Qualified", time: "2h ago" },
  { name: "Jane Smith", company: "TechCorp", source: "LinkedIn", score: 72, status: "New", time: "4h ago" },
  { name: "Michael Lee", company: "InnovateX", source: "Email Campaign", score: 55, status: "Contacted", time: "1d ago" },
]

export function RecentLeads() {
  return (
    <Card className="w-full shadown-none">
      <CardHeader>
        <CardTitle>Recent Leads</CardTitle>
        <CardDescription>Latest leads added to the system</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {recentLeads.map((lead, index) => {
            const heatLabel = lead.score >= 80 ? "Hot" : lead.score >= 60 ? "Warm" : "Cold"
            const heatColor = lead.score >= 80 ? "text-red-500" : lead.score >= 60 ? "text-orange-500" : "text-blue-500"

            return (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:shadow-sm transition">
                {/* Left section: Avatar + Info */}
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="font-semibold text-primary">
                      {lead.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold">{lead.name}</div>
                    <div className="text-sm text-muted-foreground">{lead.company}</div>
                  </div>
                </div>

                {/* Right section: Meta + Actions */}
                <div className="flex items-center gap-4">
                  <Badge variant="outline">{lead.source}</Badge>

                  <div className="text-center">
                    <div className="font-semibold text-sm">Score: {lead.score}</div>
                    <div className={`text-xs ${heatColor}`}>{heatLabel}</div>
                  </div>

                  <Badge
                    variant={
                      lead.status === "New"
                        ? "default"
                        : lead.status === "Qualified"
                        ? "secondary"
                        : "outline"
                    }
                  >
                    {lead.status}
                  </Badge>

                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">{lead.time}</div>
                    <div className="flex gap-1 mt-1">
                      <Button variant="ghost" size="sm">
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Mail className="h-3 w-3" />
                      </Button>
                    </div>
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