import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle, MessageSquare } from "lucide-react";

export function RecentActivity() {
  const recentActivities = [
    {
      id: 1,
      type: "task",
      user: "John Doe",
      time: "2h ago",
      description: "Completed the monthly sales report",
      status: "completed",
    },
    {
      id: 2,
      type: "message",
      user: "Jane Smith",
      time: "4h ago",
      description: "Sent a message to the design team",
      status: "pending",
    },
    {
      id: 3,
      type: "alert",
      user: "Mike Johnson",
      time: "1 day ago",
      description: "Server CPU usage exceeded 80%",
      status: "completed",
    },
    {
      id: 4,
      type: "update",
      user: "Anna Lee",
      time: "2 days ago",
      description: "Updated the project roadmap",
      status: "pending",
    },
  ];

  const getActivityColor = (type: string) => {
    switch (type) {
      case "task":
        return "bg-green-100 text-green-600";
      case "message":
        return "bg-blue-100 text-blue-600";
      case "alert":
        return "bg-red-100 text-red-600";
      case "update":
        return "bg-yellow-100 text-yellow-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "task":
        return <CheckCircle className="w-4 h-4" />;
      case "message":
        return <MessageSquare className="w-4 h-4" />;
      case "alert":
        return <AlertCircle className="w-4 h-4" />;
      case "update":
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <CardDescription>Latest team activities and updates</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3">
              <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{activity.user}</p>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
                <p className="text-sm text-muted-foreground">{activity.description}</p>
                <Badge
                  variant={activity.status === "completed" ? "secondary" : "outline"}
                  className="text-xs"
                >
                  {activity.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
