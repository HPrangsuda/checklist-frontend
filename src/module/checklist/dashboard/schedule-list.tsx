import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, PencilRuler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { api } from "@/core/interceptor/api.interceptor";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/core/contexts/language-context";
import { getStatusColor } from "@/utils/status.untils";

const cn = (...classes: (string | undefined | null | false)[]): string =>
  classes.filter(Boolean).join(" ");

type TaskType = "maintenance" | "calibration";

interface SoonDTO {
  id: number;
  machineCode: string;
  machineName: string;
  type: TaskType;
  dueDate: string;
  assignee: string;
}

function getDaysUntil(dateString: string): number {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function ScheduleList() {
  const { t } = useTranslation('checklist');
  const navigate = useNavigate();
  const [scheduleItems, setScheduleItems] = useState<SoonDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const typeConfig = {
    maintenance: {
      label: t('maintenance'),
      icon: Wrench,
      status: 'operational',
      to: "/checklist/maintenance/view",
    },
    calibration: {
      label: t('calibration'),
      icon: PencilRuler,
      status: 'under maintenance',
      to: "/checklist/calibration/view",
    },
  };

  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/dashboard/get/soon");
        const items = response?.data ?? response;
        if (Array.isArray(items)) {
          setScheduleItems(items);
        } else if (response?.success && Array.isArray(response.data)) {
          setScheduleItems(response.data);
        } else {
          setScheduleItems([]);
        }
      } catch {
        toast.error(t('error_loading_schedule'));
        setScheduleItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchScheduleData();
  }, []);

  const displayItems = scheduleItems.slice(0, 5);

  return (
    <Card className="shadow-sm border-dashboard-border overflow-hidden">
      <CardHeader className="border-b border-dashboard-border">
        <CardTitle className="font-semibold">{t('coming_soon')}</CardTitle>
        <CardDescription>{t('upcoming_maintenance_calibration_30_days')}</CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <p>{t('no_upcoming_tasks')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayItems.map((item, index) => {
              const typeInfo = typeConfig[item.type];
              const TypeIcon = typeInfo.icon;
              const daysUntil = getDaysUntil(item.dueDate);

              return (
                <div
                  key={`${item.machineCode}-${item.type}-${index}`}
                  onClick={() => navigate({ to: typeInfo.to as any, search: { id: item.id } as any })}
                  className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-all duration-200 cursor-pointer min-w-0"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("shrink-0 p-2 rounded-lg bg-background", getStatusColor(typeInfo.status))}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.machineName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.machineCode} : {item.assignee || t('unassigned')}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      <Badge className={cn("text-xs px-2 py-0.5 whitespace-nowrap", getStatusColor(typeInfo.status))}>
                        {typeInfo.label}
                      </Badge>
                      <span className={cn(
                        "text-xs font-medium whitespace-nowrap",
                        daysUntil <= 7  ? "text-red-600" :
                        daysUntil <= 14 ? "text-orange-600" :
                        "text-muted-foreground"
                      )}>
                        {daysUntil <= 0 ? (
                          <Badge className={cn("text-xs px-2 py-0.5", getStatusColor('canceled'))}>
                            {t('overdue')}
                          </Badge>
                        ) : daysUntil === 1 ? (
                          t('due_tomorrow')
                        ) : (
                          t('due_in_days').replace('{days}', String(daysUntil))
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}