import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { createFileRoute, useSearch } from '@tanstack/react-router'
import { FileText, ChevronDown, AlertCircle, ClipboardList } from 'lucide-react'
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

// ─── Constants ────────────────────────────────────────────────────────────────

const CHOICES = [
  'Ready to use',
  'Not ready (Waiting for repair)',
  'Not ready (Under repair)',
  'Not ready (Equipment modification)',
  'Others',
]
const MACHINE_STATUSES = ['OPERATIONAL', 'NON-OPERATIONAL', 'UNDER REPAIR']
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

// ─── Main Component ───────────────────────────────────────────────────────────

function MaintenanceEdit() {
  const { id } = useSearch({ from: '/checklist/maintenance/edit' })
  const { t }  = useTranslation('checklist')

  const [formData, setFormData] = useState<MaintenanceRecord>({
    id: 0, machineCode: '', machineName: '', years: '', round: 0,
    dueDate: '', planDate: '', startDate: '', actualDate: '',
    status: '', maintenanceBy: '', responsibleMaintenance: '', note: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)

  // ── responsible person ────────────────────────────────────────────────────
  const [responsibleId,   setResponsibleId]   = useState<string>('')
  const [responsibleName, setResponsibleName] = useState<string>('')

  // ── existing uploaded files ───────────────────────────────────────────────
  const [existingFiles, setExistingFiles] = useState<FileUploadResponse[]>([])

  // ── new file upload queue ─────────────────────────────────────────────────
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResponse[]>([])
  const [isUploading,   setIsUploading]   = useState(false)
  const fileQueueRef   = useRef<Set<string>>(new Set())
  const fileTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const uploadedRef    = useRef<FileUploadResponse[]>([])
  useEffect(() => { uploadedRef.current = uploadedFiles }, [uploadedFiles])

  // ── checklist ─────────────────────────────────────────────────────────────
  const [checklist,               setChecklist]               = useState<ChecklistItem[]>([])
  const [checklistErrors,         setChecklistErrors]         = useState<Record<string, string>>({})
  const [selectedStatus,          setSelectedStatus]          = useState('')
  const [maintenanceBy,           setMaintenanceBy]           = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL')
  const [responsibleMaintenance2, setResponsibleMaintenance2] = useState('')
  const [isSubmittingChecklist,   setIsSubmittingChecklist]   = useState(false)

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

      // ดึงชื่อ responsible person
      if (data?.responsibleMaintenance) {
        setResponsibleId(String(data.responsibleMaintenance))
        try {
          const memberRes = await api.get<any>(`/api/user/${data.responsibleMaintenance}`)
          if (memberRes?.data) {
            setResponsibleName(`${memberRes.data.firstName} ${memberRes.data.lastName}`)
          }
        } catch {
          setResponsibleName(String(data.responsibleMaintenance))
        }
      }

      // parse existing attachments
      if (data?.attachment) {
        try {
          const parsed = typeof data.attachment === 'string'
            ? JSON.parse(data.attachment) : data.attachment
          if (Array.isArray(parsed)) setExistingFiles(parsed)
        } catch {}
      }

      const clRes  = await api.get<any>(`/api/maintenance-checklist/get/${id}`)
      const clData = clRes?.data ?? clRes
      setChecklist((clData?.checklistItems ?? []).map((item: any) => ({
        ...item,
        questionDetail:      item.question?.detail      ?? '',
        questionDescription: item.question?.description ?? '',
        answer: '',
      })))
    } catch {
      toast.error(t('data_fetch_failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof MaintenanceRecord, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // ─── Fetch members ────────────────────────────────────────────────────────

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
    if (!val) {
      setResponsibleId('')
      setResponsibleName('')
      setFormData(prev => ({ ...prev, responsibleMaintenance: '' }))
      return
    }
    setResponsibleId(String(val))
    setFormData(prev => ({ ...prev, responsibleMaintenance: String(val) }))
  }

  // ─── File upload ──────────────────────────────────────────────────────────

  const uploadFile = async (file: File): Promise<FileUploadResponse> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post<{ data: FileUploadResponse }>('/api/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  // onChange จาก FileUploadField — รับ File[] ใหม่ที่ยังไม่ได้ upload
  const handleFilesChange = (files: File[]) => {
    const realFiles = files.filter(f => f instanceof File)
    if (!realFiles.length) return
    if (fileTimeoutRef.current) clearTimeout(fileTimeoutRef.current)
    fileTimeoutRef.current = setTimeout(async () => {
      if (isUploading) return
      const current  = uploadedRef.current
      const toUpload = realFiles.filter(f => {
        const key = `${f.name}-${f.size}-${f.lastModified}`
        if (fileQueueRef.current.has(key)) return false
        if (current.some(u => u.fileName?.includes(f.name))) return false
        fileQueueRef.current.add(key)
        return true
      })
      if (!toUpload.length) return
      setIsUploading(true)
      try {
        const results: FileUploadResponse[] = []
        for (const f of toUpload) { try { results.push(await uploadFile(f)) } catch {} }
        if (results.length) {
          setUploadedFiles(prev => [...prev, ...results])
          toast.success(t('files_uploaded').replace('{count}', String(results.length)))
        }
      } catch { toast.error(t('failed_to_upload_files')) }
      finally {
        toUpload.forEach(f => fileQueueRef.current.delete(`${f.name}-${f.size}-${f.lastModified}`))
        setIsUploading(false)
      }
    }, 100)
  }

  // ลบไฟล์ — รับ fileId (fileName)
  const handleDeleteFile = async (fileId: any) => {
    const idStr = String(fileId)

    // ถ้าเป็น existing file
    const existingFile = existingFiles.find(u => u.fileName === idStr || idStr.includes(u.fileName))
    if (existingFile) {
      setExistingFiles(prev => prev.filter(u => u.fileName !== existingFile.fileName))
      return
    }

    // ถ้าเป็น newly uploaded file
    const newFile = uploadedFiles.find(u => u.fileName === idStr || idStr.includes(u.fileName))
    if (!newFile) return
    try {
      await api.delete(`/api/files/delete/${newFile.fileName}`)
      setUploadedFiles(prev => prev.filter(u => u.fileName !== newFile.fileName))
      toast.success(t('file_deleted'))
    } catch { toast.error(t('failed_to_delete_file')) }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const allFiles = [...existingFiles, ...uploadedFiles].map(f => ({
        fileName: f.fileName, fileUrl: f.fileUrl, fileType: f.fileType,
        fileSize: f.fileSize, uploadedBy: f.uploadedBy ?? null,
      }))
      const payload = {
        id:                     formData.id,
        dueDate:                toLocalDateString(formData.dueDate),
        planDate:               toLocalDateString(formData.planDate),
        startDate:              toLocalDateString(formData.startDate),
        actualDate:             toLocalDateString(formData.actualDate),
        status:                 formData.status        || null,
        maintenanceBy:          formData.maintenanceBy || null,
        responsibleMaintenance: responsibleId          || null,
        note:                   formData.note          || null,
        attachment:             allFiles.length ? JSON.stringify(allFiles) : null,
      }
      const fd = new FormData()
      fd.append('request', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
      const res = await api.put('/api/maintenance/update', fd)
      if (!res?.success) {
        toast.error(res?.error ?? res?.message ?? t('data_fetch_failed'))
        return
      }
      toast.success(t('maintenance_updated') ?? 'Updated')
    } catch { toast.error(t('data_fetch_failed')) }
    finally { setSaving(false) }
  }

  // ─── Checklist ────────────────────────────────────────────────────────────

  const getAnswer        = (item: ChecklistItem) => item.answer ?? ''
  const isChecklistValid = () => !!(selectedStatus && checklist.every(item => getAnswer(item).trim()))

  const updateAnswer = (itemId: number, value: string) => {
    setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, answer: value } : item))
    setChecklistErrors(prev => { const n = { ...prev }; delete n[`item_${itemId}`]; return n })
  }

  const handleChecklistSubmit = async () => {
    const errs: Record<string, string> = {}
    if (!selectedStatus) errs.selectedStatus = t('please_select') ?? 'Required'
    checklist.forEach(item => {
      if (!getAnswer(item).trim()) errs[`item_${item.id}`] = t('field_required') ?? 'Required'
    })
    if (Object.keys(errs).length) {
      setChecklistErrors(errs)
      toast.error(t('fill_required_fields'))
      return
    }
    setIsSubmittingChecklist(true)
    try {
      const session = sessionStore.state.session
      const request = {
        maintenanceRecordId:    formData.id,
        machineCode:            formData.machineCode,
        machineName:            formData.machineName,
        machineStatus:          selectedStatus,
        machineChecklist:       JSON.stringify(checklist.map(item => ({
          id: item.id, questionDetail: item.questionDetail ?? 'N/A',
          answerChoice: getAnswer(item), checkStatus: true,
        }))),
        machineNote:            formData.note,
        userId:                 session?.employeeId ?? '',
        userName:               `${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim(),
        supervisor: '', manager: '',
        jobDetail:              `Maintenance Round ${formData.round}/${formData.years}`,
        actualDate:             toLocalDateString(formData.actualDate) ?? new Date().toISOString().split('T')[0],
        dueDate:                toLocalDateString(formData.dueDate),
        maintenanceBy,
        responsibleMaintenance: maintenanceBy === 'INTERNAL' ? responsibleMaintenance2 : '',
      }
      const fd = new FormData()
      fd.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
      const response = await api.post('/api/maintenance-checklist/save', fd)
      if (!response.success) { toast.error(response.message ?? t('data_fetch_failed')); return }
      toast.success(t('maintenance_updated') ?? 'Updated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? error?.message ?? t('data_fetch_failed'))
    } finally { setIsSubmittingChecklist(false) }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Skeleton className="h-12 w-64 mb-4" />
      <Skeleton className="h-96 w-full" />
    </div>
  )

  const cancelLink = `/checklist/maintenance/view?id=${id}` as any

  // ── ทุก file รวมกันเพื่อแสดงใน FileUploadField ───────────────────────────
  const allDisplayFiles = [
    ...existingFiles.map(f => ({
      name: f.fileName,
      size: f.fileSize,
      type: f.fileType,
      url:  `${API_BASE}/api/files/download/${encodeURIComponent(f.fileName)}`,
    })),
    ...uploadedFiles.map(f => ({
      name: f.fileName,
      size: f.fileSize,
      type: f.fileType,
      url:  `${API_BASE}/api/files/download/${encodeURIComponent(f.fileName)}`,
    })),
  ] as unknown as File[]

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
            <Label>{t('result_date')}</Label>
            <DatePickerField id="startDate" value={formData.startDate}
              onChange={d => handleInputChange('startDate', d)} />
          </div>
          <div className="space-y-2">
            <Label>{t('external_calibration_date')}</Label>
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
                <option value="">-- {t('please_select') ?? 'Select'} --</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="EXTERNAL">EXTERNAL</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Responsible Person */}
          <div className="space-y-2">
            <ServerSingleSelect
              key={`resp-${responsibleId || 'empty'}`}
              id="responsibleMaintenance"
              title={t('responsible')}
              label={t('responsible')}
              placeholder={t('select_responsible')}
              value={responsibleId}
              initialLabel={responsibleName}
              onChange={handleResponsibleChange}
              fetchOptions={fetchMembers}
            />
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
              <ClipboardList className="h-5 w-5 text-primary" />{t('checklist_records')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">

            {/* Machine Status */}
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
                  <option value="">-- {t('please_select') ?? 'Select'} --</option>
                  {MACHINE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              </div>
              {checklistErrors.selectedStatus && (
                <p className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />{checklistErrors.selectedStatus}
                </p>
              )}
            </div>

            {/* Maintenance By (checklist section) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>{t('maintenance')}</Label>
                <div className="relative">
                  <select value={maintenanceBy}
                    onChange={e => setMaintenanceBy(e.target.value as 'INTERNAL' | 'EXTERNAL')}
                    className="w-full appearance-none border rounded-lg px-3 py-2.5 pr-9 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 border-border">
                    <option value="INTERNAL">INTERNAL</option>
                    <option value="EXTERNAL">EXTERNAL</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                </div>
              </div>
              {maintenanceBy === 'INTERNAL' && (
                <div className="space-y-1.5">
                  <ServerSingleSelect
                    id="responsibleMaintenance2"
                    title={t('responsible')}
                    label={t('responsible')}
                    placeholder={t('select_responsible')}
                    value={responsibleMaintenance2}
                    onChange={(v: any) => setResponsibleMaintenance2(Array.isArray(v) ? v[0] : v)}
                    fetchOptions={fetchMembers}
                  />
                </div>
              )}
            </div>

            {/* Checklist Items */}
            {checklist.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">{t('no_checklist_items')}</p>
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
                            <option value="">-- {t('please_select') ?? 'Select'} --</option>
                            {CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
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
                          <AlertCircle className="w-3 h-3" />{t('field_required') ?? 'Required'}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="button" onClick={handleChecklistSubmit}
                disabled={isSubmittingChecklist || !isChecklistValid()}>
                <ClipboardList className="h-4 w-4 mr-2" />
                {isSubmittingChecklist ? t('loading') : t('submit')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Attachments ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 font-semibold">
              <FileText className="h-5 w-5 text-primary" />{t('attachments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <FileUploadField
              id="attachments"
              maxFiles={10}
              value={allDisplayFiles}
              onChange={handleFilesChange}
              onDownloadFile={(file: any) =>
                window.open(file.url ?? `${API_BASE}/api/files/download/${file.name}`, '_blank')
              }
              onDeleteUploadedFile={handleDeleteFile}
              onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })}
            />
          </CardContent>
        </Card>

      </div>
    </FormLayout>
  )
}