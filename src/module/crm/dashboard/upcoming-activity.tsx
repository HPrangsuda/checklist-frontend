import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle, AlertCircle, MessageSquare, ClipboardList } from "lucide-react";

export function UpcomingActivity() {
  const upcomingTasks = [
    {
      id: 1,
      type: "task",
      title: "Prepare Q3 Sales Report",
      assignee: "John Doe",
      priority: "High",
      dueDate: "Aug 20, 2025",
    },
    {
      id: 2,
      type: "meeting",
      title: "Team Stand-up Meeting",
      assignee: "Jane Smith",
      priority: "Medium",
      dueDate: "Aug 21, 2025",
    },
    {
      id: 3,
      type: "alert",
      title: "Server Maintenance",
      assignee: "IT Department",
      priority: "Critical",
      dueDate: "Aug 22, 2025",
    },
    {
      id: 4,
      type: "update",
      title: "Update Product Roadmap",
      assignee: "Anna Lee",
      priority: "Low",
      dueDate: "Aug 25, 2025",
    },
  ];

  const getActivityColor = (type: string) => {
    switch (type) {
      case "task":
        return "bg-green-100 text-green-600";
      case "meeting":
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
      case "meeting":
        return <MessageSquare className="w-4 h-4" />;
      case "alert":
        return <AlertCircle className="w-4 h-4" />;
      case "update":
        return <ClipboardList className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "destructive";
      case "High":
        return "secondary";
      case "Medium":
        return "outline";
      case "Low":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <Card className="w-full shadow-none">
      <CardHeader>
        <CardTitle>Upcoming Tasks</CardTitle>
        <CardDescription>Scheduled tasks and follow-ups</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingTasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getActivityColor(task.type)}`}>
                  {getActivityIcon(task.type)}
                </div>
                <div>
                  <div className="font-medium text-sm">{task.title}</div>
                  <div className="text-xs text-muted-foreground">{task.assignee}</div>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={getPriorityColor(task.priority)} className="mb-1">
                  {task.priority}
                </Badge>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {task.dueDate}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}