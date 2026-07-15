import { FormLayout } from '@/components/layout/form-layout'
import { FileUploadField } from '@/components/form/FileUploadField'
import { sessionStore } from '@/core/lib/store'
import api from '@/services/api'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown, AlertCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/checklist/maintenance/add')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id ?? 0),
  }),
  component: RouteComponent,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceDetail {
  id:             number
  machineCode:    string
  machineName:    string
  years:          string
  round:          number
  dueDate:        string
  planDate:       string
  maintenanceType: string
  status:         string
  checklistItems: ChecklistItem[]
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

const MACHINE_STATUSES = ['OPERATIONAL', 'NON-OPERATIONAL', 'UNDER MAINTENANCE']
const CHOICES = [
  'Ready to use',
  'Not ready (Waiting for repair)',
  'Not ready (Under repair)',
  'Not ready (Equipment modification)',
  'Others',
]

const API_BASE = import.meta.env.VITE_API_URL ?? ''

// ─── Component ────────────────────────────────────────────────────────────────

function RouteComponent() {
  const navigate   = useNavigate()
  const { id }     = useSearch({ from: '/checklist/maintenance/add' })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [detail,       setDetail]       = useState<MaintenanceDetail | null>(null)
  const [checklist,    setChecklist]    = useState<ChecklistItem[]>([])

  const [selectedStatus,         setSelectedStatus]         = useState('')
  const [maintenanceBy,          setMaintenanceBy]          = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL')
  const [responsibleMaintenance, setResponsibleMaintenance] = useState('')
  const [actualDate,             setActualDate]             = useState(new Date().toISOString().split('T')[0])
  const [note,                   setNote]                   = useState('')

  // ── files: อัปโหลดทันที เก็บ metadata ────────────────────────────────────
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResponse[]>([])
  const [isUploading,   setIsUploading]   = useState(false)
  const fileQueueRef = useRef<Set<string>>(new Set())

  useEffect(() => { if (id) loadDetail(id) }, [id])

  // ─── Load detail ──────────────────────────────────────────────────────────

  const loadDetail = async (recordId: number) => {
    try {
      const response = await api.get<any>(`/api/maintenance-record/get/${recordId}`)
      const data = response?.data ?? response
      setDetail(data)
      setChecklist(
        (data.checklistItems ?? []).map((item: any) => ({ ...item, answer: '' }))
      )
    } catch {
      toast.error('Failed to load maintenance record')
    }
  }

  // ─── Checklist helpers ────────────────────────────────────────────────────

  const getAnswer = (item: ChecklistItem) => item.answer ?? ''

  const updateAnswer = (itemId: number, value: string) => {
    setChecklist(prev => prev.map(item => item.id === itemId ? { ...item, answer: value } : item))
    setErrors(prev => { const n = { ...prev }; delete n[`item_${itemId}`]; return n })
  }

  const isFormValid = () =>
    !!(detail && selectedStatus && actualDate &&
       checklist.every(item => getAnswer(item).trim() !== ''))

  // ─── File upload: อัปโหลดทันทีเมื่อเลือกไฟล์ ─────────────────────────────

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

    const toUpload = realFiles.filter(f => {
      const key = `${f.name}-${f.size}-${f.lastModified}`
      if (fileQueueRef.current.has(key)) return false
      if (uploadedFiles.some(u => u.fileName === f.name || u.fileName?.includes(f.name))) return false
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
        setUploadedFiles(prev => [...prev, ...results])
        toast.success(`อัปโหลดสำเร็จ ${results.length} ไฟล์`)
      }
    } catch {
      toast.error('อัปโหลดไฟล์ล้มเหลว')
    } finally {
      toUpload.forEach(f => fileQueueRef.current.delete(`${f.name}-${f.size}-${f.lastModified}`))
      setIsUploading(false)
    }
  }

  // ─── File delete: ลบจาก server ทันทีเมื่อกด X ────────────────────────────

  const handleDeleteFile = async (fileId: any) => {
    const idStr  = String(fileId)
    const target = uploadedFiles.find(
      f => f.fileName === idStr || idStr.includes(f.fileName ?? '')
    )
    if (!target) return

    // ลบออกจาก UI ก่อน (optimistic)
    setUploadedFiles(prev => prev.filter(f => f.fileName !== target.fileName))

    if (target.fileName) {
      try {
        await api.delete(`/api/files/delete/${encodeURIComponent(target.fileName)}`)
      } catch {
        // silent — UI already updated
      }
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    if (!detail)        { toast.error('No maintenance record loaded'); return }
    if (!selectedStatus) newErrors.selectedStatus = 'Please select machine status'
    if (!actualDate)     newErrors.actualDate     = 'Please select actual date'
    checklist.forEach(item => {
      if (!getAnswer(item).trim()) newErrors[`item_${item.id}`] = 'This field is required'
    })
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const session = sessionStore.state.session

      // dedup + build attachment JSON
      const seen = new Set<string>()
      const attachmentFiles = uploadedFiles
        .filter(f => f.fileName && !seen.has(f.fileName) && seen.add(f.fileName))
        .map(f => ({
          fileName:   f.fileName,
          fileUrl:    f.fileUrl    || `/api/files/download/${f.fileName}`,
          fileType:   f.fileType   || '',
          fileSize:   f.fileSize   || 0,
          uploadedBy: f.uploadedBy ?? null,
        }))

      const request = {
        maintenanceRecordId:    detail.id,
        machineCode:            detail.machineCode,
        machineName:            detail.machineName,
        machineStatus:          selectedStatus,
        machineChecklist:       JSON.stringify(
          checklist.map(item => ({
            id:             item.id,
            questionDetail: item.questionDetail ?? 'N/A',
            answerChoice:   getAnswer(item),
            checkStatus:    true,
          }))
        ),
        machineNote:            note,
        userId:                 session?.employeeId ?? '',
        userName:               `${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim(),
        supervisor:             '',
        manager:                '',
        jobDetail:              `Maintenance Round ${detail.round}/${detail.years}`,
        actualDate,
        dueDate:                detail.dueDate,
        maintenanceBy,
        responsibleMaintenance: maintenanceBy === 'INTERNAL' ? responsibleMaintenance : '',
        // ส่ง attachment เป็น JSON string (ไฟล์อัปโหลดไปแล้ว)
        attachment:             attachmentFiles.length > 0
                                  ? JSON.stringify(attachmentFiles)
                                  : null,
      }

      // ─── POST แบบ JSON ล้วน ────────────────────────────────────────────
      const response = await api.post<{ success: boolean; message?: string }>(
        '/api/maintenance-record/create',
        request,
        { headers: { 'Content-Type': 'application/json' } }
      )

      if (!response.success) {
        toast.error(response.message ?? 'Failed to save')
        return
      }

      toast.success('Maintenance record saved successfully')
      setTimeout(() => navigate({ to: '/checklist/maintenance' }), 1000)
    } catch (error: any) {
      const message = error?.response?.data?.message ?? error?.message ?? 'Failed to save'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (!detail) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <FormLayout
      backLink="/checklist/maintenance"
      title="Maintenance Record"
      subtitle={`${detail.machineCode} — ${detail.machineName} | Round ${detail.round}/${detail.years}`}
      onSubmit={handleSubmit}
      steps={[{ id: 'form', title: 'Maintenance', description: 'Fill in maintenance details', required: true }]}
      currentStep="form"
      onStepChange={() => {}}
      getStepStatus={() => isFormValid() ? 'complete' : 'incomplete'}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText="Save"
      cancelLink="/checklist/maintenance"
    >
      <div className="px-2 pt-2 space-y-4">

        {/* Machine Status */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Machine Status <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={e => {
                setSelectedStatus(e.target.value)
                setErrors(p => { const n = { ...p }; delete n.selectedStatus; return n })
              }}
              className={`w-full appearance-none border rounded-lg px-3 py-2.5 pr-9 bg-background text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500
                ${errors.selectedStatus ? 'border-red-400' : 'border-border'}`}
            >
              <option value="">Please select</option>
              {MACHINE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {errors.selectedStatus && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.selectedStatus}
            </p>
          )}
        </div>

        {/* Actual Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Actual Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={actualDate}
            onChange={e => {
              setActualDate(e.target.value)
              setErrors(p => { const n = { ...p }; delete n.actualDate; return n })
            }}
            className={`w-full border rounded-lg px-3 py-2.5 bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500
              ${errors.actualDate ? 'border-red-400' : 'border-border'}`}
          />
          {errors.actualDate && (
            <p className="text-red-500 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {errors.actualDate}
            </p>
          )}
        </div>

        {/* Maintenance By */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">
            Maintenance By <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {(['INTERNAL', 'EXTERNAL'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setMaintenanceBy(type)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition
                  ${maintenanceBy === type
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-border bg-background'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Responsible (INTERNAL only) */}
        {maintenanceBy === 'INTERNAL' && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Responsible Employee ID</label>
            <input
              type="text"
              value={responsibleMaintenance}
              onChange={e => setResponsibleMaintenance(e.target.value)}
              placeholder="e.g. AIT0001"
              className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Checklist */}
        {checklist.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No checklist items</p>
        ) : (
          <div className="space-y-3">
            {checklist.map((item, idx) => {
              const answer   = getAnswer(item)
              const hasError = !!errors[`item_${item.id}`]
              return (
                <div key={item.id}
                  className={`p-4 rounded-xl border
                    ${hasError ? 'border-red-400 bg-red-50/10' : 'border-border bg-muted/20'}`}>
                  <p className="text-sm mb-0.5">
                    {idx + 1}. {item.questionDescription ?? 'N/A'}{' '}
                    <span className="text-red-500">*</span>
                  </p>
                  {item.questionDetail && (
                    <p className="text-xs text-muted-foreground mb-2">{item.questionDetail}</p>
                  )}
                  {item.isChoice ? (
                    <div className="relative mt-2">
                      <select
                        value={answer}
                        onChange={e => updateAnswer(item.id, e.target.value)}
                        className={`w-full appearance-none border rounded-lg px-3 py-2 pr-8 bg-background text-sm
                          focus:outline-none focus:ring-2 focus:ring-blue-500
                          ${hasError ? 'border-red-400' : 'border-border'}`}
                      >
                        <option value="">Please select</option>
                        {CHOICES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={answer}
                      onChange={e => updateAnswer(item.id, e.target.value)}
                      placeholder="Please specify"
                      className={`w-full mt-2 border rounded-lg px-3 py-2 bg-background text-sm
                        focus:outline-none focus:ring-2 focus:ring-blue-500
                        ${hasError ? 'border-red-400' : 'border-border'}`}
                    />
                  )}
                  {hasError && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> This field is required
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Note */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            placeholder="Additional notes (optional)"
            className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm
              focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Attachment */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">
            Attachment
            {isUploading && (
              <span className="ml-2 text-xs text-muted-foreground animate-pulse">กำลังอัปโหลด...</span>
            )}
          </label>

          {/* ใช้ FileUploadField เดียว — ส่ง uploadedFiles map เป็น { name, size, type, url } เหมือน machine */}
          <FileUploadField
            id="attachments"
            maxFiles={10}
            value={uploadedFiles.map(f => ({
              name: f.fileName,
              size: f.fileSize,
              type: f.fileType,
              url:  `${API_BASE}/api/files/download/${encodeURIComponent(f.fileName ?? '')}`,
            })) as unknown as File[]}
            onChange={handleFilesChange}
            onDownloadFile={(f: any) => window.open(f.url ?? f.name, '_blank')}
            onDeleteUploadedFile={(f: any) => handleDeleteFile(f.name ?? f)}
            onFileReject={(f, m) =>
              toast.error(m, { description: `"${f.name}" could not be uploaded` })
            }
          />
        </div>

      </div>
    </FormLayout>
  )
}