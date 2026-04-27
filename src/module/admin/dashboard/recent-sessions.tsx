import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Clock, Monitor, Smartphone, MoreHorizontal, Timer, Clock1 } from "lucide-react"

type User = {
  name: string
  email: string
  avatar: string
}

type Session = {
  id: number
  user: User
  device: string
  deviceType: "desktop" | "mobile" | "tablet"
  browser: string
  location: string
  department: string
  startTime: string
  isActive: boolean
  refreshCount: number
}

export function RecentSessions({ detailed = false }: { detailed?: boolean }) {
  const sessions: Session[] = [
    {
      id: 1,
      user: { name: "John Doe", email: "john@company.com", avatar: "/placeholder.svg?height=32&width=32" },
      device: "MacBook Pro",
      deviceType: "desktop",
      browser: "Chrome",
      location: "New York, US",
      department: "Engineering",
      startTime: "2 hours ago",
      isActive: true,
      refreshCount: 5,
    },
    {
      id: 2,
      user: { name: "Sarah Wilson", email: "sarah@company.com", avatar: "/placeholder.svg?height=32&width=32" },
      device: "iPhone 15",
      deviceType: "mobile",
      browser: "Safari",
      location: "London, UK",
      department: "Marketing",
      startTime: "4 hours ago",
      isActive: true,
      refreshCount: 12,
    },
    {
      id: 3,
      user: { name: "Mike Chen", email: "mike@company.com", avatar: "/placeholder.svg?height=32&width=32" },
      device: "Windows PC",
      deviceType: "desktop",
      browser: "Edge",
      location: "Tokyo, JP",
      department: "Sales",
      startTime: "6 hours ago",
      isActive: false,
      refreshCount: 3,
    },
    {
      id: 4,
      user: { name: "Emma Davis", email: "emma@company.com", avatar: "/placeholder.svg?height=32&width=32" },
      device: "iPad Pro",
      deviceType: "tablet",
      browser: "Safari",
      location: "Sydney, AU",
      department: "HR",
      startTime: "8 hours ago",
      isActive: true,
      refreshCount: 8,
    },
    {
      id: 5,
      user: { name: "Emma Davis", email: "emma@company.com", avatar: "/placeholder.svg?height=32&width=32" },
      device: "iPad Pro",
      deviceType: "tablet",
      browser: "Safari",
      location: "Sydney, AU",
      department: "HR",
      startTime: "8 hours ago",
      isActive: true,
      refreshCount: 8,
    }
  ]

  const getDeviceIcon = (deviceType: Session["deviceType"]) => {
    switch (deviceType) {
      case "mobile":
      case "tablet":
        return <Smartphone className="w-4 h-4" />
      default:
        return <Monitor className="w-4 h-4" />
    }
  }

  return (
    <Card className="w-full shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">Latest Sessions</CardTitle>
        <CardDescription>Recent user sessions and activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={session.user.avatar || "/placeholder.svg"} alt={session.user.name} />
                    <AvatarFallback>
                      {session.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  {/* Status dot */}
                  <span
                    className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full border-2 border-background ${
                      session.isActive ? "bg-green-500" : "bg-gray-400"
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{session.user.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      {getDeviceIcon(session.deviceType)}
                      <span>{session.device}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock1 className="w-3 h-3" />
                      <span>{session.startTime}</span>
                    </div>
                    {detailed && (
                      <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        <span>{session.refreshCount} refreshes</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {session.department}
                </Badge>
                {detailed && (
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
