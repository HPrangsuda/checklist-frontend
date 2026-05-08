import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, FileText, ListCheck, ChevronDown } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'

export const Route = createFileRoute('/checklist/checklist-records/edit')({
  component: ChecklistEdit,
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
  userId?: string
  userName?: string
  supervisor?: string
  dateSupervisorChecked?: string
  manager?: string
  dateManagerChecked?: string
  checklistStatus?: string
  reasonNotChecked?: string
  jobDetail?: string
}

interface CurrentUser {
  userId: string
  userName: string
  memberId: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REASON_NOT_CHECKED_OPTIONS = [
  { value: '',                                   labelKey: 'please_select' },
  { value: 'Leave',                              labelKey: 'reason_leave' },
  { value: 'Shift Work',                         labelKey: 'reason_shift' },
  { value: 'Working Offsite',                    labelKey: 'reason_offsite' },
  { value: 'Under Maintenance',                  labelKey: 'reason_under_maintenance' },
  { value: 'Tool Used Offsite',                  labelKey: 'reason_tool_offsite' },
  { value: 'Responsible Person Did Not Perform', labelKey: 'reason_not_performed' },
]

// map ค่าเก่า (ไทย / placeholder) → English value
const REASON_TO_EN: Record<string, string> = {
  'NO ACTION TAKEN':             '',
  'ลางาน':                      'LEAVE',
  'เข้ากะ':                     'SHIFT WORK',
  'ทำงานนอกสถานที่':            'WORKING OFFSITE',
  'อยู่ระหว่างซ่อมบำรุง':       'UNDER MAINTENANCE',
  'เครื่องมือใช้งานนอกสถานที่': 'TOOL USED OFFSITE',
  'ผู้รับผิดชอบไม่ดำเนินการ':   'RESPONSIBLE PERSON DID NOT PERFORM',
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  const { t } = useTranslation('checklist')

  const statusColor: Record<string, string> = {
    'OPERATIONAL':        'bg-emerald-100 text-emerald-600 dark:text-emerald-100',
    'UNDER REPAIR':       'bg-red-100 text-red-600 dark:text-red-100',
    'NON-OPERATIONAL':    'bg-yellow-100 text-yellow-600 dark:text-yellow-100',
    'COMPLETED':          'bg-emerald-100 text-emerald-600 dark:text-emerald-100',
    'PENDING':            'bg-yellow-100 text-yellow-600 dark:text-yellow-100',
    'PENDING MANAGER':    'bg-yellow-100 text-yellow-600 dark:text-yellow-100',
    'PENDING SUPERVISOR': 'bg-orange-100 text-orange-600 dark:text-orange-100',
  }

  const color = statusColor[status || ''] || 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
  const key   = `status_${(status || '').toLowerCase().replace(/\s+/g, '_')}`
  const label = t(key) !== key ? t(key) : (status || t('unknown'))

  return <Badge className={`${color} gap-1 px-3 py-1`}>{label}</Badge>
}

// ─── ChecklistQuestionItem ────────────────────────────────────────────────────

function ChecklistQuestionItem({ item }: { item: ChecklistItem }) {
  const getAnswerStyle = (answer: string) => {
    if (answer.includes('OPERATIONAL')) return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'
    if (answer.includes('NON-OPERATIONAL'))   return 'bg-red-100 text-red-800 border-red-300'
    return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
  }

  return (
    <div className="py-3 px-4 bg-card rounded-lg border border-border/60 hover:border-border transition-colors">
      <p className="text-sm text-foreground mb-2 leading-relaxed">{item.questionDetail}</p>
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getAnswerStyle(item.answerChoice)}`}>
        {item.answerChoice}
      </span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function ChecklistEdit() {
  const { id } = useSearch({ from: '/checklist/checklist-records/edit' })
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [record, setRecord]                 = useState<ChecklistFormData | null>(null)
  const [loading, setLoading]               = useState(true)
  const [approving, setApproving]           = useState(false)
  const [currentUser, setCurrentUser]       = useState<CurrentUser | null>(null)
  const [selectedReason, setSelectedReason] = useState<string>('')

  useEffect(() => {
    if (id) fetchData()
    fetchCurrentUser()
  }, [id])

  useEffect(() => {
    const raw = record?.reasonNotChecked ?? ''
    // ถ้ามีใน map ให้แปลง ถ้าไม่มีให้ใช้ค่าเดิม (กรณีเป็น EN อยู่แล้ว)
    setSelectedReason(raw in REASON_TO_EN ? REASON_TO_EN[raw] : raw)
  }, [record?.reasonNotChecked])

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get<{ data: CurrentUser }>('/api/auth/me')
      setCurrentUser(res?.data ?? null)
    } catch {
      // ignore
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>(`/api/checklist/${id}`)
      if (response?.data) {
        let parsed = response.data
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

  const handleApprove = async () => {
    if (!record?.id) return

    if (showReasonSelect && !selectedReason) {
      toast.error(t('please_select_reason'))
      return
    }

    try {
      setApproving(true)
      await api.put('/api/checklist/update', {
        id: record.id,
        reasonNotChecked: selectedReason,
      })

      if (record.machineCode) {
        const machineRes = await api.get<any>(`/api/machine/machine-code/${record.machineCode}`)
        const machineId = machineRes?.data?.id ?? machineRes?.id
        if (machineId) await api.post(`/api/machine/${machineId}/sync-to-lark`)
      }

      toast.success(t('checklist_approved'))
      router.navigate({ to: '/checklist/checklist-records' })
    } catch {
      toast.error(t('failed_to_approve_checklist'))
    } finally {
      setApproving(false)
    }
  }

  const formatDate = (dateStr?: string) =>
    dateStr ? new Date(dateStr).toLocaleDateString('en-GB', { year: '2-digit', month: '2-digit', day: '2-digit' }) : ''

  const showReasonSelect = !!(record?.reasonNotChecked)

  const canApprove = record && currentUser && (
    (record.checklistStatus === 'PENDING SUPERVISOR' && String(currentUser.memberId) === record.supervisor) ||
    (record.checklistStatus === 'PENDING MANAGER'    && String(currentUser.memberId) === record.manager)
  ) && (!showReasonSelect || !!selectedReason)

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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.navigate({ to: '/checklist/checklist-records' })} className="hover:bg-accent">
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

        {/* Checklist Details */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {t('checklist_details')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
              <InfoRow label={t('machine_status')} value={<StatusBadge status={record.machineStatus} />} />
              <InfoRow label={t('check_status')}   value={<StatusBadge status={record.checklistStatus} />} />
              <InfoRow label={t('created_by')}     value={record.userName ?? '-'} />
              <InfoRow label={t('created_at')}     value="-" />
              <InfoRow
                label={t('supervisor_checked')}
                value={record.supervisor ? `${record.supervisor}${record.dateSupervisorChecked ? ` - ${formatDate(record.dateSupervisorChecked)}` : ''}` : '-'}
              />
              <InfoRow
                label={t('manager_checked')}
                value={record.manager ? `${record.manager}${record.dateManagerChecked ? ` - ${formatDate(record.dateManagerChecked)}` : ''}` : '-'}
              />
              <InfoRow label={t('job_detail')} value={record.jobDetail ?? '-'} />

              {showReasonSelect ? (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{t('reason_not_checked')}</p>
                  <div className="relative">
                    <select
                      value={selectedReason}
                      onChange={e => setSelectedReason(e.target.value)}
                      className="w-full appearance-none border border-border rounded-lg px-3 py-2 pr-9 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
                    >
                      {REASON_NOT_CHECKED_OPTIONS.map(r => (
                        <option key={r.value} value={r.value} disabled={r.value === ''}>
                          {t(r.labelKey)}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              ) : (
                <InfoRow label={t('reason_not_checked')} value={record.reasonNotChecked ?? '-'} />
              )}
            </div>

            {record.machineNote && (
              <div className="mt-8 p-4 rounded-lg bg-secondary/40 border border-border/50">
                <p className="text-sm font-medium text-muted-foreground mb-2">{t('note')}</p>
                <p className="text-foreground whitespace-pre-wrap">{record.machineNote}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              {t('attachments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {record.image ? (
              <div className="p-4 rounded-lg bg-accent/40 border border-accent flex items-center gap-3">
                <FileText className="h-5 w-5 text-accent-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('attachment')}</p>
                  <p className="text-foreground font-medium">{record.image}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">{t('no_attachments')}</p>
            )}
          </CardContent>
        </Card>

        {/* Checklist Items */}
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
                {checklistItems.map(item => <ChecklistQuestionItem key={item.id} item={item} />)}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">{t('no_checklist_items')}</div>
            )}

            <div className="mt-8 flex justify-end gap-3 border-t pt-6">
              {record && currentUser && (
                <Button
                  onClick={handleApprove}
                  disabled={!canApprove || approving}
                  className="min-w-[140px]"
                >
                  {approving ? t('approving') : t('approve')}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

// ─── InfoRow ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, className = '' }: { label: string; value?: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
      <div className="text-base">{value ?? '-'}</div>
    </div>
  )
}