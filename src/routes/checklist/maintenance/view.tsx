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
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0,
  }),
})

// ─── Types — ตรงกับ MaintenanceResponseDTO ───────────────────────────────────

interface MaintenanceRecord {
  id:                     number
  machineCode:            string
  machineName:            string
  years:                  string
  round:                  number
  dueDate?:               string
  planDate?:              string
  startDate?:             string
  actualDate?:            string
  status?:                string
  maintenanceBy?:         string
  responsibleMaintenance?: string
  note?:                  string
  attachment?:            string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL ?? ''

const formatDate = (date?: string | null) => {
  if (!date) return '-'
  try { return new Date(date).toLocaleDateString('th-TH') }
  catch { return date }
}

const getStatusColor = (status?: string) => {
  switch ((status || '').toLowerCase()) {
    case 'operational': case 'completed':
      return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'
    case 'under repair': case 'pending': case 'overdue':
      return 'bg-red-100 text-red-600 dark:text-red-100'
    case 'non-operational': case 'pending manager': case 'scheduled':
      return 'bg-yellow-100 text-yellow-600 dark:text-yellow-100'
    case 'pending supervisor': case 'completed (late)':
      return 'bg-orange-100 text-orange-600 dark:text-orange-100'
    case 'in progress':
      return 'bg-blue-100 text-blue-600 dark:text-blue-100'
    default:
      return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
  }
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  className = '',
}: {
  label: string
  value?: string | number | null
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base mt-1">{value || '-'}</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function MaintenanceView() {
  const { id }  = useSearch({ from: '/checklist/maintenance/view' })
  const { t }   = useTranslation('checklist')
  const router  = useRouter()

  const [record,  setRecord]  = useState<MaintenanceRecord | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchDetail() }, [id])

  const [responsibleName, setResponsibleName] = useState<string>('')
  
  const fetchDetail = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>(`/api/maintenance/${id}`)
      if (response?.data) {
        setRecord(response.data)

        if (response.data.responsibleMaintenance) {
          try {
            const memberRes = await api.get<any>(`/api/user/${response.data.responsibleMaintenance}`)
            if (memberRes?.data) {
              setResponsibleName(`${memberRes.data.firstName} ${memberRes.data.lastName}`)
            }
          } catch {
            setResponsibleName(response.data.responsibleMaintenance) 
          }
        }
      } else {
        toast.error('Failed to load maintenance details')
      }
    } catch {
      toast.error('Failed to load maintenance details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Skeleton className="h-12 w-64 mb-4" />
      <Skeleton className="h-96 w-full" />
    </div>
  )

  if (!record) return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Maintenance not found</p>
          <Button onClick={() => router.navigate({ to: '/checklist/maintenance' })}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('back_to_list')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon"
              onClick={() => router.navigate({ to: '/checklist/maintenance' })}>
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
          <Button variant="outline" size="sm" className="gap-2"
            onClick={() => router.navigate({ to: '/checklist/maintenance/edit', search: { id } })}>
            <Edit3 className="h-4 w-4" />{t('edit')}
          </Button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Maintenance Details */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-3 font-semibold">
              <Wrench className="h-5 w-5 text-primary" />
              {t('maintenance_records')} {record.years} — {t('round')} {record.round}
              {record.status && (
                <Badge className={getStatusColor(record.status)}>
                  {record.status}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoRow label={t('due_date')}    value={formatDate(record.dueDate)} />
              <InfoRow label={t('plan_date')}   value={formatDate(record.planDate)} />
              <InfoRow label={t('result_date')} value={formatDate(record.startDate)} />
              <InfoRow label={t('result_date')} value={formatDate(record.actualDate)} />
              <InfoRow label={t('responsible_by')} value={record.maintenanceBy} />
              <InfoRow label={t('responsible')} value={responsibleName} />
              <InfoRow label={t('note')}        value={record.note} className="md:col-span-2" />
            </div>
          </CardContent>
        </Card>

        {/* Attachment */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              {t('attachments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {record.attachment ? (
              <a
                href={`${API_BASE}/api/files/download/${record.attachment}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <FileText className="h-4 w-4" />
                {record.attachment}
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">-</p>
            )}
          </CardContent>
        </Card>

        {/* Maintenance History */}
        <MaintenanceTbl machineCode={record.machineCode} />

      </div>
    </div>
  )
}