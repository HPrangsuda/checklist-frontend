import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Edit3, FileText, Wrench } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { MaintenanceTbl } from '@/module/checklist/maintenance/history-table'

export const Route = createFileRoute('/checklist/maintenance/view')({
  component: MaintenanceView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: Number(search.id) || 0
    }
  }
})

interface MaintenanceRecord {
  id: number;
  machineCode: string;
  machineName: string;
  years: string;
  round: number;
  dueDate: string;
  planDate: string;
  startDate: string;
  actualDate: string;
  status: string;
  maintenanceBy: string;
  responsibleMaintenance: string;
  note: string;
  attachment: string;
}

const getStatusColor = (status?: string) => {
    const s = (status || '').toLowerCase();
    switch (s) {
      case 'ready to use':
      case 'completed':
      case 'ใช้งานได้':
      case 'ดำเนินการเสร็จสิ้น':
        return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100';
      case 'repair':
      case 'pending':
      case 'overdue':
      case 'กำลังซ่อม':
      case 'รอดำเนินการ':
        return 'bg-red-100 text-red-600 dark:text-red-100';
      case 'not in use':
      case 'pending manager':
      case 'scheduled':
      case 'ไม่ใช้งาน':
      case 'รอผู้จัดการตรวจสอบ':
        return 'bg-yellow-100 text-yellow-600 dark:text-yellow-100';
      case 'pending supervisor':
      case 'completed (late)':
      case 'รอหัวหน้างานตรวจสอบ':
        return 'bg-orange-100 text-orange-600 dark:text-orange-100';
      case 'in progress':
        return 'bg-blue-100 text-blue-600 dark:text-blue-100';
      default:
        return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100';
    }
  };

function MaintenanceView() {
  const { id } = useSearch({ from: '/checklist/maintenance/view' });
  const [record, setMaintenance] = useState<MaintenanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [] = useState("general");
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchMaintenanceDetail();
    }
  }, [id]);

  const fetchMaintenanceDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>(`/api/maintenance/${id}`);
      
      if (response) {
        setMaintenance(response.data || response);
      } else {
        toast.error(t("Failed to load maintenance details"));
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t("Failed to load maintenance details"));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.navigate({ to: '/checklist/maintenance' });
  };

  const handleEdit = () => {
    router.navigate({ to: '/checklist/maintenance/edit', search: { id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground mb-4">
              Maintenance not found
            </p>
            <Button onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to List
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Wrench className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{record.machineName}</h1>
                <p className="text-sm text-muted-foreground">{record.machineCode}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleEdit}>
              <Edit3 className="h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Maintenance Details */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <Wrench className="h-5 w-5 text-primary" />Maintenance Details {record.years} - Round {record.round}
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(record.status)}>
                  {record.status}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              <InfoRow label="Maintenance Duedate" value={record.dueDate} />
              <InfoRow label="Planned Date" value={record.planDate} />
              <InfoRow label="Start Date" value={record.startDate} />
              <InfoRow label="Actual Date" value={record.actualDate} />
              <InfoRow label="Maintenance By" value={record.maintenanceBy} />
              <InfoRow label="Responsible Person" value={record.responsibleMaintenance} />
              <InfoRow label="Notes" value={record.note} className="md:col-span-2 lg:col-span-2" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
          
          </CardContent>
        </Card>
        <MaintenanceTbl machineCode={record.machineCode} />
      </div>
    </div>
  );
}

// Helper component
function InfoRow({ 
  label, 
  value, 
  className = "" 
}: { 
  label: string; 
  value?: string | number | null; 
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base mt-1">{value || "-"}</p>
    </div>
  );
}