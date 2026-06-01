import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, FileText, ListCheck } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { getStatusColor } from '@/utils/status.untils'
import { toast } from 'sonner'

export const Route = createFileRoute('/checklist/checklist-records/view')({
  component: ChecklistView,
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0
  })
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: number
  questionDetail: string
  answerChoice: string
  checkStatus: boolean
}

interface MemberInfo {
  id: number
  firstName: string
  lastName: string
  employeeId?: string
  email?: string
}

interface AuditMember {
  id: number
  firstName: string
  lastName: string
  employeeId?: string
  email?: string
}

interface ChecklistFormData {
  id: number
  checkType?: string
  recheck?: string
  machineCode: string
  machineName?: string
  machineStatus?: string
  machineChecklist?: string | ChecklistItem[]
  machineNote?: string
  image?: string
  userName?: string
  supervisor?: MemberInfo | null
  dateSupervisorChecked?: string
  manager?: MemberInfo | null
  dateManagerChecked?: string
  checklistStatus?: string
  reasonNotChecked?: string
  jobDetail?: string
  createdBy?: AuditMember | null
  updatedBy?: AuditMember | null
  createdAt?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fullName = (m?: MemberInfo | null): string => {
  if (!m || typeof m !== 'object') return '-'
  return `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || '-'
}

const formatDate = (dateStr?: string | null): string =>
  dateStr ? new Date(dateStr).toLocaleDateString('en-CA') : '-'

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation('checklist')

  if (!status) return <span>-</span>

  const key   = `status_${status.toLowerCase().replace(/\s+/g, '_')}`
  const label = t(key) !== key ? t(key) : status

  return <Badge className={`${getStatusColor(status)} gap-1 px-3 py-1`}>{label}</Badge>
}

// ─── ChecklistQuestionItem ────────────────────────────────────────────────────

function ChecklistQuestionItem({ item }: { item: ChecklistItem }) {
  return (
    <div className="py-3 px-4 bg-card rounded-lg border border-border/60 hover:border-border transition-colors">
      <p className="text-sm text-foreground mb-2 leading-relaxed">{item.questionDetail}</p>
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(item.answerChoice)}`}>
        {item.answerChoice}
      </span>
    </div>
  )
}

// ─── MachineImage ─────────────────────────────────────────────────────────────

function MachineImage({ fileName }: { fileName: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed,  setFailed]  = useState(false)

  useEffect(() => {
    if (!fileName) return
    let url = ''
    const src = `${API_BASE}/api/files/download/${encodeURIComponent(fileName)}`
    setLoading(true)
    api.getInstance().get(src, { responseType: 'blob' })
      .then((res: any) => { url = URL.createObjectURL(res.data); setBlobUrl(url) })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [fileName])

  if (failed) return (
    <div className="flex items-center gap-3 p-4 rounded-lg bg-accent/40 border border-accent">
      <FileText className="h-5 w-5 text-accent-foreground shrink-0" />
      <p className="text-sm text-foreground font-medium break-all">{fileName}</p>
    </div>
  )
  if (loading) return <div className="w-40 h-40 animate-pulse bg-muted rounded-lg" />
  if (!blobUrl) return null

  return (
    <img
      src={blobUrl}
      alt={fileName}
      className="w-40 h-40 object-cover rounded-lg border border-border shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
      onClick={() => window.open(blobUrl, '_blank')}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ChecklistView() {
  const { id } = useSearch({ from: '/checklist/checklist-records/view' })
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [record,  setRecord]  = useState<ChecklistFormData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (id) fetchData() }, [id])

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>(`/api/checklist/${id}`)
      if (response?.data) {
        const parsed = { ...response.data }
        if (typeof parsed.machineChecklist === 'string') {
          try { parsed.machineChecklist = JSON.parse(parsed.machineChecklist) }
          catch (e) { console.warn('Cannot parse machineChecklist:', e) }
        }
        setRecord(parsed)
      } else {
        toast.error(t('failed_to_load_checklist'))
      }
    } catch {
      toast.error(t('failed_to_load_checklist'))
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <Skeleton className="h-12 w-64 mb-6" />
      <Skeleton className="h-96 w-full" />
    </div>
  )

  if (!record) return (
    <div className="min-h-screen bg-gray-50 dark:bg-background p-6">
      <Card>
        <CardContent className="p-10 text-center">
          <p className="text-muted-foreground mb-6">{t('checklist_record_not_found')}</p>
          <Button onClick={() => router.navigate({ to: '/checklist/checklist-records' })}>
            <ArrowLeft className="mr-2 h-4 w-4" />{t('back_to_list')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )

  const checklistItems = Array.isArray(record.machineChecklist) ? record.machineChecklist : []

  const supervisorValue = record.supervisor
    ? `${fullName(record.supervisor)}${record.dateSupervisorChecked ? ` — ${formatDate(record.dateSupervisorChecked)}` : ''}`
    : '-'

  const managerValue = record.manager
    ? `${fullName(record.manager)}${record.dateManagerChecked ? ` — ${formatDate(record.dateManagerChecked)}` : ''}`
    : '-'

  return (
    <div className="min-h-screen bg-background">

      ── Header ───────────────────────────────────────────────────────────
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost" size="icon"
            onClick={() => router.navigate({ to: '/checklist/checklist-records' })}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{record.machineName}</h1>
              <p className="text-sm text-muted-foreground">{record.machineCode}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">

        {/* ── Checklist Details ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {t('checklist_details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <InfoRow label={t('machine_status')}    value={<StatusBadge status={record.machineStatus} />} />
              <InfoRow label={t('check_status')}      value={<StatusBadge status={record.checklistStatus} />} />
              <InfoRow label={t('created_by')}        value={record.userName ?? '-'} />
              <InfoRow label={t('created_at')}        value={formatDate(record.createdAt)} />
              <InfoRow label={t('supervisor_checked')} value={supervisorValue} />
              <InfoRow label={t('manager_checked')}    value={managerValue} />
              <InfoRow label={t('job_detail')}         value={record.jobDetail ?? '-'} />
              <InfoRow label={t('reason_not_checked')} value={record.reasonNotChecked ?? '-'} />
            </div>

            {record.machineNote && (
              <div className="mt-8 p-4 rounded-lg bg-secondary/40 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('note')}</p>
                <p className="text-foreground whitespace-pre-wrap">{record.machineNote}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Attachments ────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              {t('attachments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {record.image
              ? <MachineImage fileName={record.image} />
              : <p className="text-muted-foreground text-center py-4">{t('no_attachments')}</p>
            }
          </CardContent>
        </Card>

        {/* ── Checklist Items ────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <ListCheck className="h-5 w-5 text-primary" />
              {t('checklist_items')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-0">
            {checklistItems.length > 0 ? (
              <div className="space-y-3 pt-4">
                {checklistItems.map(item => (
                  <ChecklistQuestionItem key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">{t('no_checklist_items')}</div>
            )}
          </CardContent>
        </Card>

      </div> 
    </div>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, className = '' }: {
  label: string
  value?: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="text-base">{value ?? '-'}</div>
    </div>
  )
}