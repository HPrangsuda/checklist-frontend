import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Edit3, FileText, PencilRuler } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { CalibrationTbl } from '@/module/checklist/calibration/history-table'

export const Route = createFileRoute('/checklist/calibration/view')({
  component: CalibrationView,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      id: Number(search.id) || 0
    }
  }
})

interface CalibrationRecord {
  id: number;
  machineCode: string;
  machineName: string;
  years: number;
  dueDate?: string;
  startDate?: string;
  certificateDate?: string;
  results?: string;
  criteria?: string;
  measuringRange?: string;
  accuracy?: string;
  calibrationRange?: string;
  calibrationStatus?: string;
  attachment?: string;
  note?: string;
  permissibleCapacity?: string;
  comment?: string;
  resolution?: string;
  maxUncertainty?: string;
  mpe?: string;
  checkMpe?: string;
  checkResolution?: string;
  checkResult?: string;
  reasonNotPass?: string;
}

const getStatusColor = (status?: string) => {
  const s = (status || '').toLowerCase();
  switch (s) {
    case 'operational':
    case 'completed':
    case 'pass':
    case 'ใช้งานได้':
    case 'ดำเนินการเสร็จสิ้น':
      return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100';
    case 'repair':
    case 'pending':
    case 'overdue':
    case 'not pass':
    case 'กำลังซ่อม':
    case 'รอดำเนินการ':
      return 'bg-red-100 text-red-600 dark:text-red-100';
    case 'non-operational':
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

function CalibrationView() {
  const { id } = useSearch({ from: '/checklist/calibration/view' });
  const [record, setCalibration] = useState<CalibrationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [] = useState("general");
  const { t } = useTranslation();
  const router = useRouter();

  useEffect(() => {
    if (id) {
      fetchCalibrationDetail();
    }
  }, [id]);

  const fetchCalibrationDetail = async () => {
    try {
      setLoading(true);
      const response = await api.get<any>(`/api/calibration/${id}`);
      
      if (response) {
        setCalibration(response.data || response);
      } else {
        toast.error(t("Failed to load calibration details"));
      }
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error(t("Failed to load calibration details"));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.navigate({ to: '/checklist/calibration' });
  };

  const handleEdit = () => {
    router.navigate({ to: '/checklist/calibration/edit', search: { id } });
  };

  const handleDelete = () => {
    console.log("Delete clicked!", id);
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
              Calibration not found
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
                <PencilRuler className="h-6 w-6 text-red-700" />
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
        {/* Calibration Details */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <PencilRuler className="h-5 w-5 text-primary" />Calibration Details {record.years ? `-  ${record.years}` : ""}
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(record.calibrationStatus)}>
                  {record.calibrationStatus}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getStatusColor(record.results)}>
                  {record.results}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoRow label="Duedate" value={record.dueDate} />
              <InfoRow label="Start Date" value={record.startDate} />
              <InfoRow label="Certificate Date" value={record.certificateDate} />
              <InfoRow label="Criteria" value={record.criteria} />
              <InfoRow label="Accuracy" value={record.accuracy} />
              <InfoRow label="Measuring Range" value={record.measuringRange} />
              <InfoRow label="Calibration Range" value={record.calibrationRange} />
              <InfoRow label="Resolution" value={record.resolution} />
              <InfoRow label="MPE" value={record.mpe} />
              <InfoRow label="Max Uncertainty" value={record.maxUncertainty} />
              <InfoRow label="Permissible Capacity" value={record.permissibleCapacity} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 pt-6 gap-4">
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">Note</p>
                <p className="text-foreground">{record.note || "-"}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">Comment</p>
                <p className="text-foreground">{record.comment || "-"}</p>
              </div>
              <div className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">Reason Not Pass</p>
                <p className="text-foreground">{record.reasonNotPass || "-"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check Results */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Check Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2 pb-2">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
              <InfoRow label="Check MPE" value={record.checkMpe} />
              <InfoRow label="Check Resolution" value={record.checkResolution} />
              <InfoRow label="Check Result" value={record.checkResult} />
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
            {record.attachment && (
              <div className="mt-4 p-4 rounded-lg bg-accent/50 border border-accent flex items-center gap-3">
                <FileText className="h-5 w-5 text-accent-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Attachment</p>
                  <p className="text-foreground font-medium">{record.attachment}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <CalibrationTbl machineCode={record.machineCode} />
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