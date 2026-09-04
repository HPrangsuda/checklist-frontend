import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import {
  FileText, ChevronDown, AlertCircle, ClipboardList,
  CheckCircle2,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { DatePickerField } from '@/components/form/DatePickerField'
import { FileUploadField } from '@/components/form/FileUploadField'
import { ServerSingleSelect } from '@/components/select/server-single-select'
import { sessionStore } from '@/core/lib/store'
import type { ListResponse, MemberListDTO } from '@/core/types/common'

export const Route = createFileRoute('/checklist/maintenance/edit')({
  component: MaintenanceEdit,
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0,
  }),
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceRecord {
  id:                     number
  machineCode:            string
  machineName:            string
  years:                  string
  round:                  number
  dueDate:                string
  planDate:               string
  startDate:              string
  actualDate:             string
  status:                 string
  maintenanceBy:          string
  responsibleMaintenance: string
  note:                   string
  checklistRecordId:      number | null
}

interface ChecklistItem {
  id:                  number
  machineCode:         string
  questionId:          number
  questionDetail:      string
  questionDescription: string
  isChoice:            boolean
  checkStatus:         boolean
  answer:              string
}

interface FileUploadResponse {
  fileName:    string
  fileUrl:     string
  fileType:    string
  fileSize:    number
  uploadedBy?: string | null
}

interface SubmittedChecklistItem {
  id:                  number
  questionDetail:      string
  questionDescription: string
  isChoice:            boolean
  answerChoice:        string
}

interface SubmittedChecklist {
  id:                     number
  machineCode:            string
  machineName:            string
  machineStatus:          string
  maintenanceBy:          string
  responsibleMaintenance: string
  actualDate:             string | null
  submitted:              boolean
  items:                  SubmittedChecklistItem[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHOICE_KEYS = [
  'choice_ready',
  'choice_not_ready_repair',
  'choice_not_ready_under_repair',
  'choice_not_ready_modification',
  'choice_others',
] as const

const MACHINE_STATUS_KEYS = [
  'status_operational',
  'status_non_operational',
  'status_under_maintenance',
] as const

const MACHINE_STATUS_VALUES = ['OPERATIONAL', 'UNDER MAINTENANCE'] as const

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toLocalDateString = (date?: string | Date | null | any): string | null => {
  if (!date) return null
  if (date instanceof Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const str = String(date)
  if (str.includes('GMT') || str.includes('UTC')) {
    const parsed = new Date(str)
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getFullYear()
      const m = String(parsed.getMonth() + 1).padStart(2, '0')
      const d = String(parsed.getDate()).padStart(2, '0')
      return `${y}-${m}-${d}`
    }
  }
  if (str.includes('T')) return str.split('T')[0]
  return str
}

const parseAttachment = (raw: unknown): FileUploadResponse[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw as FileUploadResponse[]
  if (typeof raw === 'string') {
    const trimmed = raw.trim()
    if (!trimmed) return []
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed as FileUploadResponse[]
      } catch { /* fall through */ }
    }
    return trimmed
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .map(name => ({ fileName: name, fileUrl: '', fileType: '', fileSize: 0, uploadedBy: null }))
  }
  return []
}

// ─── Main Component ───────────────────────────────────────────────────────────

function MaintenanceEdit() {
  const { id } = useSearch({ from: '/checklist/maintenance/edit' })
  const { t }  = useTranslation('checklist')

  const [formData, setFormData] = useState<MaintenanceRecord>({
    id: 0, machineCode: '', machineName: '', years: '', round: 0,
    dueDate: '', planDate: '', startDate: '', actualDate: '',
    status: '', maintenanceBy: '', responsibleMaintenance: '', note: '',
    checklistRecordId: null,
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  // ── responsible person ────────────────────────────────────────────────────
  const [responsibleId,         setResponsibleId]         = useState<string>('')
  const [originalResponsibleId, setOriginalResponsibleId] = useState<string>('')
  const [responsibleName,       setResponsibleName]       = useState<string>('')

  // ── files ─────────────────────────────────────────────────────────────────
  // allFiles = existing (from server) + newly uploaded (via /api/files/upload)
  // ทั้งหมดเก็บเป็น FileUploadResponse — อัปโหลดทันทีเมื่อเลือก, ลบทันทีเมื่อกด X
  const [allFiles,     setAllFiles]     = useState<FileUploadResponse[]>([])
  const [isUploading,  setIsUploading]  = useState(false)
  const fileQueueRef = useRef<Set<string>>(new Set())

  // ── checklist (editable template) ────────────────────────────────────────
  const [checklist,               setChecklist]               = useState<ChecklistItem[]>([])
  const [checklistErrors,         setChecklistErrors]         = useState<Record<string, string>>({})
  const [formErrors,              setFormErrors]              = useState<Record<string, string>>({})
  const [selectedStatus,          setSelectedStatus]          = useState('')
  const [maintenanceBy,           setMaintenanceBy]           = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL')
  const [responsibleMaintenance2, setResponsibleMaintenance2] = useState('')

  // ── submitted checklist (read-only) ──────────────────────────────────────
  const [submittedChecklist, setSubmittedChecklist] = useState<SubmittedChecklist | null>(null)

  const formSteps: FormStep[] = [
    { id: 'general', title: t('general'), description: t('maintenance_information'), required: true },
  ]

  useEffect(() => { if (id) fetchData() }, [id])

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      setLoading(true)
      const res  = await api.get<any>(`/api/maintenance/${id}`)
      const data = res?.data ?? res
      setFormData(data)

      const rid = data?.responsibleMaintenance ? String(data.responsibleMaintenance) : ''
      setResponsibleId(rid)
      setOriginalResponsibleId(rid)

      if (rid) {
        try {
          const memberRes = await api.get<any>(`/api/user/${data.responsibleMaintenance}`)
          if (memberRes?.data) {
            const d = memberRes.data
            setResponsibleName([d.firstName, d.lastName].filter(Boolean).join(' ') || rid)
          }
        } catch {
          setResponsibleName(rid)
        }
      }

      // โหลด existing files จาก server เข้า allFiles โดยตรง
      setAllFiles(parseAttachment(data?.attachment))

      await fetchChecklistByMaintenanceId(
        id,
        !!data?.checklistRecordId,
        data?.checklistRecordId ?? undefined,
      )
    } catch {
      toast.error(t('data_fetch_failed'))
    } finally {
      setLoading(false)
    }
  }

  // ─── Checklist fetch ──────────────────────────────────────────────────────

  const fetchChecklistByMaintenanceId = async (
    maintenanceId: number,
    isAlreadySubmitted: boolean,
    checklistRecordId?: number,
  ) => {
    try {
      if (isAlreadySubmitted && checklistRecordId) {
        try {
          const res  = await api.get<any>(`/api/checklist/${checklistRecordId}`)
          const body = res?.data ?? res

          let rawItems: any[] = []
          if (body?.machineChecklist) {
            try {
              rawItems = typeof body.machineChecklist === 'string'
                ? JSON.parse(body.machineChecklist)
                : body.machineChecklist
            } catch { rawItems = [] }
          }

          setSubmittedChecklist({
            id:                     body?.id ?? checklistRecordId,
            machineCode:            body?.machineCode   ?? '',
            machineName:            body?.machineName   ?? '',
            machineStatus:          body?.machineStatus ?? '',
            maintenanceBy:          body?.maintenanceBy ?? '',
            responsibleMaintenance: String(body?.responsibleMaintenance ?? ''),
            actualDate:             body?.actualDate    ?? null,
            submitted:              true,
            items: rawItems.map((item: any) => ({
              id:                  item.id,
              questionDetail:      item.questionDetail ?? '',
              questionDescription: item.questionDetail ?? '',
              isChoice:            item.isChoice ?? true,
              answerChoice:        item.answerChoice ?? item.answer ?? '',
            })),
          })
          return
        } catch (err) {
          console.warn('[MaintenanceEdit] /api/checklist fetch failed, falling back:', err)
          await loadEditableTemplate(maintenanceId, true)
        }
      } else {
        await loadEditableTemplate(maintenanceId, false)
      }
    } catch (err) {
      console.warn('[MaintenanceEdit] fetchChecklistByMaintenanceId failed:', err)
    }
  }

  const loadEditableTemplate = async (maintenanceId: number, asReadOnly: boolean) => {
    try {
      const res  = await api.get<any>(`/api/maintenance-checklist/get/${maintenanceId}`)
      const body = res?.data ?? res
      const rawItems: any[] = body?.checklistItems ?? body?.items ?? []

      if (asReadOnly) {
        setSubmittedChecklist({
          id:                     maintenanceId,
          machineCode:            body?.machineCode   ?? '',
          machineName:            body?.machineName   ?? '',
          machineStatus:          body?.machineStatus ?? body?.status ?? '',
          maintenanceBy:          body?.maintenanceBy ?? '',
          responsibleMaintenance: String(body?.responsibleMaintenance ?? ''),
          actualDate:             body?.actualDate    ?? null,
          submitted:              true,
          items: rawItems.map((item: any) => ({
            id:                  item.id,
            questionDetail:      item.questionDetail ?? item.question?.detail      ?? '',
            questionDescription: item.questionDescription ?? item.question?.description ?? '',
            isChoice:            item.isChoice ?? false,
            answerChoice:        item.answerChoice ?? item.answer ?? item.checkAnswer ?? '',
          })),
        })
      } else {
        setChecklist(rawItems.map((item: any) => ({
          ...item,
          questionDetail:      item.questionDetail ?? item.question?.detail      ?? '',
          questionDescription: item.questionDescription ?? item.question?.description ?? '',
          answer: '',
        })))
      }
    } catch (err) {
      console.warn('[MaintenanceEdit] loadEditableTemplate failed:', err)
    }
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleInputChange = (field: keyof MaintenanceRecord, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }))

  const fetchMembers = async (keyword: string, index: number) => {
    const params: any = { index, size: 100 }
    if (keyword.trim()) params.keyword = keyword.trim()
    const res = await api.get<ListResponse<MemberListDTO>>('/api/user/get/list', { params })
    const all = res.data.map((m: any) => ({
      label:    `${m.firstName} ${m.lastName}`,
      value:    String(m.id || ''),
      fullName: `${m.firstName} ${m.lastName}`,
    }))
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      return { data: all.filter(m => m.label.toLowerCase().includes(kw)), hasMore: false }
    }
    return { data: all, hasMore: false }
  }

  const handleResponsibleChange = (selected: any) => {
    const val = Array.isArray(selected) ? selected[0] : selected
    setResponsibleId(val ? String(val) : '')
    if (val) setFormErrors(prev => { const n = { ...prev }; delete n.responsible; return n })
  }

  // ── File upload: อัปโหลดทันทีเมื่อเลือกไฟล์ ─────────────────────────────

  const uploadFileSingle = async (file: File): Promise<FileUploadResponse | null> => {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await api.post<{ data: FileUploadResponse }>('/api/files/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      return res.data ?? res
    } catch {
      return null
    }
  }

  const handleFilesChange = async (files: File[]) => {
    const realFiles = files.filter(f => f instanceof File)
    if (!realFiles.length || isUploading) return

    // กรองซ้ำด้วย queue ref
    const toUpload = realFiles.filter(f => {
      const key = `${f.name}-${f.size}-${f.lastModified}`
      if (fileQueueRef.current.has(key)) return false
      if (allFiles.some(u => u.fileName === f.name || u.fileName?.includes(f.name))) return false
      fileQueueRef.current.add(key)
      return true
    })
    if (!toUpload.length) return

    setIsUploading(true)
    try {
      const results: FileUploadResponse[] = []
      for (const f of toUpload) {
        const result = await uploadFileSingle(f)
        if (result) results.push(result)
      }
      if (results.length) {
        setAllFiles(prev => [...prev, ...results])
        toast.success(t('files_uploaded')?.replace('{count}', String(results.length)) ?? `อัปโหลดสำเร็จ ${results.length} ไฟล์`)
      }
    } catch {
      toast.error(t('failed_to_upload_files') ?? 'อัปโหลดไฟล์ล้มเหลว')
    } finally {
      toUpload.forEach(f => fileQueueRef.current.delete(`${f.name}-${f.size}-${f.lastModified}`))
      setIsUploading(false)
    }
  }

  // ── File delete: ลบจาก server ทันทีเมื่อกด X ────────────────────────────

  const handleDeleteFile = async (fileId: any) => {
    const idStr = String(fileId)
    const target = allFiles.find(f => f.fileName === idStr || idStr.includes(f.fileName ?? ''))
    if (!target) return

    // ลบออกจาก UI ก่อน (optimistic)
    setAllFiles(prev => prev.filter(f => f.fileName !== target.fileName))

    // ลบจาก server (ถ้า fileUrl มีค่า = เคยอัปโหลดจริง)
    if (target.fileName) {
      try {
        await api.delete(`/api/files/delete/${encodeURIComponent(target.fileName)}`)
      } catch {
        // ไม่ต้อง rollback — ไฟล์อาจลบได้จาก server แต่ response fail
        // หรือเป็น existing file ที่ไม่มี endpoint delete ก็ยังคือ remove จาก attachment ได้
      }
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate required fields
    const fErrs: Record<string, string> = {}
    if (!responsibleId.trim()) fErrs.responsible = t('responsible_required') || 'กรุณาเลือกผู้รับผิดชอบ'
    setFormErrors(fErrs)
    if (Object.keys(fErrs).length) {
      toast.error(t('fill_required_fields') || 'กรุณากรอกข้อมูลที่จำเป็น')
      return
    }

    if (!submittedChecklist) {
      const errs: Record<string, string> = {}
      if (checklist.length > 0 && !selectedStatus) errs.selectedStatus = t('please_select')
      checklist.forEach(item => {
        if (!getAnswer(item).trim()) errs[`item_${item.id}`] = t('field_required')
      })
      if (Object.keys(errs).length) {
        setChecklistErrors(errs)
        toast.error(t('fill_required_fields'))
        return
      }
    }

    setSaving(true)
    try {
      // dedup allFiles → JSON string ส่งใน attachment
      const seen = new Set<string>()
      const deduped = allFiles
        .filter(f => f.fileName && !seen.has(f.fileName) && seen.add(f.fileName))
        .map(f => ({
          fileName:   f.fileName,
          fileUrl:    f.fileUrl    || `/api/files/download/${f.fileName}`,
          fileType:   f.fileType   || '',
          fileSize:   f.fileSize   || 0,
          uploadedBy: f.uploadedBy ?? null,
        }))

      const responsibleChanged  = responsibleId !== originalResponsibleId
      const resolvedResponsible = (responsibleChanged && responsibleId.trim() !== '')
        ? Number(responsibleId)
        : undefined

      const payload: Record<string, unknown> = {
        id:            formData.id,
        dueDate:       toLocalDateString(formData.dueDate),
        planDate:      toLocalDateString(formData.planDate),
        startDate:     toLocalDateString(formData.startDate),
        actualDate:    toLocalDateString(formData.actualDate),
        status:        formData.status        || null,
        maintenanceBy: formData.maintenanceBy || null,
        note:          formData.note          || null,
        // ส่ง attachment เป็น JSON string (ไม่มี multipart files อีกต่อไป)
        attachment:    deduped.length > 0 ? JSON.stringify(deduped) : undefined,
      }
      if (resolvedResponsible !== undefined) payload.responsibleMaintenance = resolvedResponsible

      // ─── PUT แบบ JSON ล้วน (ไม่มี multipart) ─────────────────────────────
      const res = await api.put('/api/maintenance/update', payload, {
        headers: { 'Content-Type': 'application/json' },
      })

      if (!res?.success) {
        toast.error(res?.error ?? res?.message ?? t('data_fetch_failed'))
        return
      }

      if (responsibleChanged) setOriginalResponsibleId(responsibleId)

      // Save checklist only when not yet submitted
      if (!submittedChecklist && checklist.length > 0 && selectedStatus) {
        const session = sessionStore.state.session
        const request = {
          maintenanceRecordId:    formData.id,
          machineCode:            formData.machineCode,
          machineName:            formData.machineName,
          machineStatus:          selectedStatus,
          machineChecklist:       JSON.stringify(
            checklist.map(item => ({
              id:             item.id,
              questionDetail: item.questionDetail ?? 'N/A',
              answerChoice:   getAnswer(item),
              checkStatus:    true,
            }))
          ),
          machineNote:            formData.note,
          userId:                 session?.employeeId ?? '',
          userName:               `${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim(),
          supervisor: '', manager: '',
          jobDetail:              `Maintenance Round ${formData.round}/${formData.years}`,
          actualDate:             toLocalDateString(formData.actualDate)
                                    ?? new Date().toISOString().split('T')[0],
          dueDate:                toLocalDateString(formData.dueDate),
          maintenanceBy,
          responsibleMaintenance: maintenanceBy === 'INTERNAL' ? responsibleMaintenance2 : '',
        }
        const clFd = new FormData()
        clFd.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
        const clRes = await api.post('/api/maintenance-checklist/save', clFd)
        if (!clRes?.success) {
          toast.error(clRes?.message ?? t('data_fetch_failed'))
          return
        }
      }

      toast.success(t('maintenance_updated'))
    } catch {
      toast.error(t('data_fetch_failed'))
    } finally {
      setSaving(false)
    }
  }

  // ─── Checklist helpers ────────────────────────────────────────────────────

  const getAnswer = (item: ChecklistItem) => item.answer ?? ''

  const updateAnswer = (itemId: number, value: string) => {
    setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, answer: value } : item))
    setChecklistErrors(prev => { const n = { ...prev }; delete n[`item_${itemId}`]; return n })
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Skeleton className="h-12 w-64 mb-4" />
      <Skeleton className="h-96 w-full" />
    </div>
  )

  const cancelLink = `/checklist/maintenance/view?id=${id}` as any

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <FormLayout
      backLink={cancelLink}
      title={`${formData.machineName} - ${t('round')} ${formData.round}/${formData.years}`}
      subtitle={formData.machineCode}
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep="general"
      onStepChange={() => {}}
      getStepStatus={() => 'incomplete'}
      isSubmitting={saving}
      isFormValid={true}
      submitText={t('update')}
      cancelLink={cancelLink}
    >
      <div className="px-2 pt-2 space-y-6">

        {/* ── Dates & basic fields ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>{t('due_date')}</Label>
            <DatePickerField id="dueDate" value={formData.dueDate}
              onChange={d => handleInputChange('dueDate', d)} />
          </div>
          <div className="space-y-2">
            <Label>{t('plan_date')}</Label>
            <DatePickerField id="planDate" value={formData.planDate}
              onChange={d => handleInputChange('planDate', d)} />
          </div>
          <div className="space-y-2">
            <Label>{t('start_date')}</Label>
            <DatePickerField id="startDate" value={formData.startDate}
              onChange={d => handleInputChange('startDate', d)} />
          </div>
          <div className="space-y-2">
            <Label>{t('actual_date')}</Label>
            <DatePickerField id="actualDate" value={formData.actualDate}
              onChange={d => handleInputChange('actualDate', d)} />
          </div>

          {/* Maintenance By */}
          <div className="space-y-2">
            <Label>{t('maintenance')}</Label>
            <div className="relative">
              <select value={formData.maintenanceBy}
                onChange={e => handleInputChange('maintenanceBy', e.target.value)}
                className="w-full appearance-none border rounded-lg px-3 py-2.5 pr-9 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-border">
                <option value="">-- {t('please_select')} --</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="EXTERNAL">EXTERNAL</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Responsible Person */}
          <div className="space-y-2">
            <ServerSingleSelect
              key={`resp-${originalResponsibleId || 'empty'}`}
              id="responsibleMaintenance"
              title={t('responsible')}
              label={`${t('responsible')} *`}
              placeholder={t('select_responsible')}
              value={responsibleId}
              initialLabel={responsibleName}
              onChange={handleResponsibleChange}
              fetchOptions={fetchMembers}
              error={formErrors.responsible}
            />
            {formErrors.responsible && (
              <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />{formErrors.responsible}
              </p>
            )}
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label>{t('note')}</Label>
          <Textarea rows={4} value={formData.note || ''}
            onChange={e => handleInputChange('note', e.target.value)}
            placeholder={t('note')} />
        </div>

        {/* ── Checklist ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <ClipboardList className="h-5 w-5 text-primary" />
              {t('checklist_records')}
              {submittedChecklist && (
                <span className="ml-auto flex items-center gap-1 text-xs font-normal text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {t('already_submitted') || 'บันทึกแล้ว'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">

            {submittedChecklist ? (
              /* ── READ-ONLY ───────────────────────────────────────────── */
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('machine_status')}</p>
                    <p className="text-sm font-medium">{submittedChecklist.machineStatus || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('maintenance')}</p>
                    <p className="text-sm font-medium">{submittedChecklist.maintenanceBy || '—'}</p>
                  </div>
                </div>

                {submittedChecklist.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    {t('no_checklist_items')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {submittedChecklist.items.map((item, idx) => {
                      const answer = item.answerChoice?.trim() || ''
                      return (
                        <div key={item.id} className="p-4 rounded-xl border border-border bg-background">
                          <p className="text-sm font-medium leading-snug">
                            {idx + 1}. {item.questionDescription || item.questionDetail || 'N/A'}
                          </p>
                          {item.questionDetail && item.questionDetail !== item.questionDescription && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {item.questionDetail}
                            </p>
                          )}
                          <div className="mt-3">
                            {answer ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                {answer}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                                —
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            ) : (
              /* ── EDITABLE ────────────────────────────────────────────── */
              <>
                <div className="space-y-1.5">
                  <Label>{t('machine_status')} <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <select value={selectedStatus}
                      onChange={e => {
                        setSelectedStatus(e.target.value)
                        setChecklistErrors(p => { const n = { ...p }; delete n.selectedStatus; return n })
                      }}
                      className={`w-full appearance-none border rounded-lg px-3 py-2.5 pr-9 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        checklistErrors.selectedStatus ? 'border-red-400' : 'border-border'
                      }`}>
                      <option value="">-- {t('please_select')} --</option>
                      {MACHINE_STATUS_VALUES.map((value, idx) => (
                        <option key={value} value={value}>{t(MACHINE_STATUS_KEYS[idx])}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                  {checklistErrors.selectedStatus && (
                    <p className="text-red-500 text-xs flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{checklistErrors.selectedStatus}
                    </p>
                  )}
                </div>

                {checklist.length === 0 ? (
                  <p className="text-muted-foreground text-sm text-center py-6">
                    {t('no_checklist_items')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {checklist.map((item, idx) => {
                      const answer   = getAnswer(item)
                      const hasError = !!checklistErrors[`item_${item.id}`]
                      return (
                        <div key={item.id}
                          className={`p-4 rounded-xl border ${hasError ? 'border-red-400 bg-red-50/10' : 'border-border bg-muted/20'}`}>
                          <p className="text-sm mb-0.5">
                            {idx + 1}. {item.questionDescription ?? 'N/A'}{' '}
                            <span className="text-red-500">*</span>
                          </p>
                          {item.questionDetail && (
                            <p className="text-xs text-muted-foreground mb-2">{item.questionDetail}</p>
                          )}
                          {item.isChoice ? (
                            <div className="relative mt-2">
                              <select value={answer} onChange={e => updateAnswer(item.id, e.target.value)}
                                className={`w-full appearance-none border rounded-lg px-3 py-2 pr-8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  hasError ? 'border-red-400' : 'border-border'
                                }`}>
                                <option value="">-- {t('please_select')} --</option>
                                {CHOICE_KEYS.map(key => (
                                  <option key={key} value={t(key)}>{t(key)}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                            </div>
                          ) : (
                            <input type="text" value={answer}
                              onChange={e => updateAnswer(item.id, e.target.value)}
                              className={`w-full mt-2 border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                hasError ? 'border-red-400' : 'border-border'
                              }`} />
                          )}
                          {hasError && (
                            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />{t('field_required')}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

          </CardContent>
        </Card>

        {/* ── Attachments ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              {t('attachments')}
              {isUploading && (
                <span className="ml-auto text-xs font-normal text-muted-foreground animate-pulse">
                  {t('uploading') || 'กำลังอัปโหลด...'}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">

            {/* ใช้ FileUploadField เดียว — ส่ง allFiles map เป็น { name, size, type, url } เหมือน machine */}
            <FileUploadField
              id="attachments"
              maxFiles={10}
              value={allFiles.map(f => ({
                name: f.fileName,
                size: f.fileSize,
                type: f.fileType,
                url:  `${API_BASE}/api/files/download/${encodeURIComponent(f.fileName ?? '')}`,
              })) as unknown as File[]}
              onChange={handleFilesChange}
              onDownloadFile={(f: any) => window.open(f.url ?? f.name, '_blank')}
              onDeleteUploadedFile={(f: any) => handleDeleteFile(f.name ?? f)}
              onFileReject={(f, m) =>
                toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })
              }
            />

          </CardContent>
        </Card>

      </div>
    </FormLayout>
  )
}