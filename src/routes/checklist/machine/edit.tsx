import { FileUploadField } from '@/components/form/FileUploadField'
import { SingleSelectField } from '@/components/form/SingleSelectField'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { ServerSingleSelect } from '@/components/select/server-single-select'
import { useTranslation } from '@/core/contexts/language-context'
import { api } from '@/core/interceptor/api.interceptor'
import type { ListResponse, MemberListDTO } from '@/core/types/common'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { X, Plus, Search, Check } from 'lucide-react'
import { useAuth } from '@/core/contexts/auth-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileUploadResponse {
  fileName:    string
  fileUrl:     string
  fileType:    string
  fileSize:    number
  uploadedBy?: string | null
}

/**
 * SOFT-DELETE: เพิ่ม _markedForDelete flag ใน state
 * - true  = ผู้ใช้กดลบ → ซ่อนใน UI, รอลบจริงตอน Save
 * - false/undefined = ปกติ
 */
interface FileEntry extends FileUploadResponse {
  _markedForDelete?: boolean
}

interface ChecklistQuestion {
  id:          number
  questionId:  number
  detail:      string
  description: string
  resetTime:   string
  isChoice:    boolean
  checkStatus: boolean
}

interface QuestionOption {
  id:          number
  detail:      string
  description: string
}

type MachineEditSearch = { id: number }

const ACTIVE_STATUSES = ['OPERATIONAL', 'NON-OPERATIONAL', 'UNDER MAINTENANCE'] as const
const isNonActiveStatus = (status: string): boolean =>
  !!status && !(ACTIVE_STATUSES as readonly string[]).includes(status)

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/checklist/machine/edit')({
  component: MachineEdit,
  validateSearch: (search: Record<string, unknown>): MachineEditSearch => ({
    id: Number(search.id) || 0,
  }),
  loaderDeps: ({ search: { id } }) => ({ id }),
  loader: async ({ deps: { id } }) => {
    try {
      const response = await api.get(`/api/machine/${id}`)
      return { machineData: response.data }
    } catch (error) {
      console.error('Error loading machine:', error)
      throw error
    }
  },
})

const formSteps: FormStep[] = [
  { id: 'general',     title: 'General',     description: 'Basic information',       required: true  },
  { id: 'checklist',   title: 'Checklist',   description: 'Checklist questions',     required: false },
  { id: 'maintenance', title: 'Maintenance', description: 'Maintenance information', required: false },
  { id: 'calibration', title: 'Calibration', description: 'Calibration information', required: false },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFiles(raw?: string | null | any[]): FileEntry[] {
  if (!raw) return []
  if (Array.isArray(raw))
    return raw.filter((f): f is FileEntry => !!f && typeof f.fileName === 'string')
  if (typeof raw === 'string') {
    try { return parseFiles(JSON.parse(raw)) } catch { return [] }
  }
  if (typeof raw === 'object' && (raw as any).fileName) return [raw as FileEntry]
  return []
}

function toDisplayUrl(f: FileEntry): string {
  return f.fileUrl || `/api/files/download/${encodeURIComponent(f.fileName)}`
}

/** ไฟล์ที่ยังไม่ถูก mark ลบ — ใช้แสดงใน UI และส่งไป backend */
const activeFiles = (files: FileEntry[]) => files.filter(f => !f._markedForDelete)

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="w-full border border-border rounded-lg px-3 py-2.5 bg-muted/40 text-sm text-muted-foreground min-h-[40px]">
        {value || '-'}
      </div>
    </div>
  )
}

function QuestionPicker({ onAdd, existingQuestionIds }: {
  onAdd: (q: QuestionOption) => void
  existingQuestionIds: number[]
}) {
  const [open, setOpen]       = useState(false)
  const [keyword, setKeyword] = useState('')
  const [items, setItems]     = useState<QuestionOption[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => { if (open) fetchQuestions(keyword) }, [open, keyword])

  const fetchQuestions = async (kw: string) => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { index: 0, size: 50 }
      if (kw.trim()) params.keyword = kw.trim()
      const res = await api.getInstance().get<any>('/api/question/get/page', { params })
      setItems((res.data?.data ?? []).map((q: any) => ({ id: q.id, detail: q.detail, description: q.description ?? '' })))
    } catch { toast.error('Failed to fetch questions') }
    finally { setLoading(false) }
  }

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-dashed border-primary text-primary hover:bg-primary/5 transition">
        <Plus className="h-4 w-4" /> Add Question
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-[420px] rounded-xl border bg-background shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input autoFocus value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="Search question..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="max-h-64 overflow-y-auto divide-y">
            {loading && <div className="px-3 py-3 text-sm text-muted-foreground text-center">Loading...</div>}
            {!loading && items.length === 0 && <div className="px-3 py-3 text-sm text-muted-foreground text-center">No results</div>}
            {!loading && items.map(q => {
              const already = existingQuestionIds.includes(q.id)
              return (
                <button key={q.id} type="button" disabled={already}
                  onClick={() => { if (!already) { onAdd(q); setOpen(false) } }}
                  className={`w-full text-left px-3 py-2.5 transition ${already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{q.detail}</p>
                      {q.description && <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{q.description}</p>}
                    </div>
                    {already && <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function MachineEdit() {
  const navigate        = useNavigate()
  const { machineData } = Route.useLoaderData()
  const { id }          = Route.useSearch()
  const { t }           = useTranslation('checklist')
  const { role }        = useAuth()

  const machineStatusOptions = [
    { value: 'OPERATIONAL',       label: t('status_operational')       },
    { value: 'NON-OPERATIONAL',   label: t('status_non_operational')   },
    { value: 'UNDER MAINTENANCE', label: t('status_under_maintenance') },
    ...(role === 'ADMIN' ? [
      { value: 'CANCELED',  label: t('status_canceled')  },
      { value: 'TRANSFER',  label: t('status_transfer')  },
      { value: 'SCRAPPED',  label: t('status_scrapped')  },
      { value: 'NOT FOUND', label: t('status_not_found') },
    ] : []),
  ]

  // ── State ─────────────────────────────────────────────────────────────────
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep,  setCurrentStep]  = useState('general')
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [isLoading,    setIsLoading]    = useState(true)

  const [cachedResponsible, setCachedResponsible] = useState<any[]>([])
  const [cachedSupervisor,  setCachedSupervisor]  = useState<any[]>([])
  const [cachedManager,     setCachedManager]     = useState<any[]>([])

  const [checklists,            setChecklists]            = useState<ChecklistQuestion[]>([])
  const [checklistLoading,      setChecklistLoading]      = useState(false)
  const [deletingIds,           setDeletingIds]           = useState<number[]>([])
  const [maintChecklists,       setMaintChecklists]       = useState<ChecklistQuestion[]>([])
  const [maintChecklistLoading, setMaintChecklistLoading] = useState(false)
  const [maintDeletingIds,      setMaintDeletingIds]      = useState<number[]>([])

  /**
   * SOFT-DELETE: เก็บไฟล์ทั้งหมดใน state รวมกัน
   * ไฟล์ที่กด "ลบ" จะถูก set _markedForDelete=true แทนการลบทันที
   * ตอน Save: ลบไฟล์ที่ mark แล้วส่ง active files ไปใน DTO
   */
  const [imageFiles, setImageFiles]  = useState<FileEntry[]>([])
  const [instrFiles, setInstrFiles]  = useState<FileEntry[]>([])
  const [isUploadingImages, setIsUploadingImages] = useState(false)
  const [isUploadingInstr,  setIsUploadingInstr]  = useState(false)

  const imageUploadingSet = useRef<Set<string>>(new Set())
  const instrUploadingSet = useRef<Set<string>>(new Set())
  const imageTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const instrTimeoutRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const imageFilesRef     = useRef<FileEntry[]>([])
  const instrFilesRef     = useRef<FileEntry[]>([])
  useEffect(() => { imageFilesRef.current = imageFiles }, [imageFiles])
  useEffect(() => { instrFilesRef.current = instrFiles }, [instrFiles])

  const [formData, setFormData] = useState({
    name: '', machineCode: '', brand: '', model: '', serialNumber: '',
    machineGroup: '', machineGroupId: '', machineType: '', machineTypeId: '',
    department: '', maintenancePeriod: '',
    maintenance1: '', maintenance2: '', maintenance3: '', maintenance4: '',
    externalCalibration: '', calibrationDueDate: '', certificateDate: '',
    results: '', criteria: '', measuringRange: '', accuracy: '', calibrationRange: '',
    responsible: '', responsibleName: '',
    supervisor:  '', supervisorName:  '',
    manager:     '', managerName:     '',
    machineStatus: '', resetPeriod: '', note: '', calibrationStatus: '',
    cancelDate: '', reasonCancel: '',
  })

  // ── Load machine data ─────────────────────────────────────────────────────
  useEffect(() => {
    // reset scroll ทุกครั้งที่โหลดหน้า เพื่อให้ sticky header แสดงถูกต้อง
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    if (!machineData) return
    setIsLoading(true)
    try {
      setImageFiles(parseFiles(machineData.image))
      setInstrFiles(parseFiles(machineData.workInstruction))

      const maintenanceData: Record<string, string> = {}
      const maintList = machineData.maintenanceRecords ?? machineData.maintenanceList ?? []
      if (Array.isArray(maintList)) {
        ;[...maintList]
          .sort((a: any, b: any) => (a.round ?? 0) - (b.round ?? 0))
          .forEach((m: any, i: number) => { if (m.dueDate) maintenanceData[`maintenance${i + 1}`] = m.dueDate })
      }

      const calList = machineData.calibrationRecords ?? machineData.calibration ?? []
      const cal = Array.isArray(calList) ? (calList[0] ?? {}) : (calList ?? {})

      setFormData({
        name:              machineData.machineName           ?? '',
        machineCode:       machineData.machineCode           ?? '',
        brand:             machineData.brand                 ?? '',
        model:             machineData.model                 ?? '',
        serialNumber:      machineData.serialNumber          ?? '',
        machineGroup:      machineData.machineGroupName      ?? '',
        machineGroupId:    machineData.machineGroupId        ?? '',
        machineType:       machineData.machineTypeName       ?? '',
        machineTypeId:     machineData.machineTypeId         ?? '',
        department:        machineData.departmentName ?? machineData.department ?? '',
        maintenancePeriod: machineData.maintenancePeriod     ?? '',
        maintenance1:      maintenanceData.maintenance1      ?? '',
        maintenance2:      maintenanceData.maintenance2      ?? '',
        maintenance3:      maintenanceData.maintenance3      ?? '',
        maintenance4:      maintenanceData.maintenance4      ?? '',
        externalCalibration: cal.externalCalibrationDate     ?? '',
        calibrationDueDate:  cal.calibrationDueDate ?? cal.dueDate ?? '',
        certificateDate:     cal.certificateDate             ?? '',
        results:             cal.results                     ?? '',
        criteria:            cal.criteria                    ?? '',
        measuringRange:      cal.measuringRange              ?? '',
        accuracy:            cal.accuracy                    ?? '',
        calibrationRange:    cal.calibrationRange            ?? '',
        responsible:      String(machineData.responsiblePersonId ?? ''),
        responsibleName:  machineData.responsiblePersonName  ?? '',
        supervisor:       String(machineData.supervisorId    ?? ''),
        supervisorName:   machineData.supervisorName         ?? '',
        manager:          String(machineData.managerId       ?? ''),
        managerName:      machineData.managerName            ?? '',
        machineStatus:    machineData.machineStatus          ?? '',
        resetPeriod:      machineData.resetPeriod            ?? '',
        note:             machineData.note                   ?? '',
        calibrationStatus: cal.calibrationStatus             ?? '',
        cancelDate:       machineData.cancelDate             ?? '',
        reasonCancel:     machineData.reasonCancel           ?? '',
      })
    } catch (e) {
      console.error('Error loading machine data:', e)
      toast.error('Failed to load machine data')
    } finally {
      setIsLoading(false)
    }
  }, [machineData])

  useEffect(() => {
    if (isLoading) return
    const init = async () => {
      if (cachedResponsible.length === 0) await fetchResponsible('', 0)
      let supMembers = cachedSupervisor
      if (!supMembers.length) { const r = await fetchSupervisor('', 0); supMembers = r.data }
      let mgrMembers = cachedManager
      if (!mgrMembers.length) { const r = await fetchManager('', 0); mgrMembers = r.data }
      setFormData(prev => {
        const supName = prev.supervisorName || supMembers.find(m => String(m.value) === prev.supervisor)?.fullName || ''
        const mgrName = prev.managerName    || mgrMembers.find(m => String(m.value) === prev.manager)?.fullName    || ''
        if (supName === prev.supervisorName && mgrName === prev.managerName) return prev
        return { ...prev, supervisorName: supName, managerName: mgrName }
      })
    }
    init()
  }, [isLoading])

  useEffect(() => {
    if (currentStep === 'checklist'   && machineData?.machineCode) fetchChecklist()
    if (currentStep === 'maintenance' && formData.machineCode)     fetchMaintChecklist()
  }, [currentStep])

  // ─── Checklist ─────────────────────────────────────────────────────────────

  const fetchChecklist = async () => {
    setChecklistLoading(true)
    try {
      const res = await api.getInstance().get<any>(`/api/machine-checklist/by-machine`, {
        params: { machineCode: machineData.machineCode },
      })
      setChecklists((res.data?.data ?? []).map((item: any) => ({
        id: item.id, questionId: item.questionId,
        detail: item.question?.detail ?? '', description: item.question?.description ?? '',
        resetTime: item.resetTime ?? '', isChoice: item.isChoice ?? false, checkStatus: item.checkStatus ?? false,
      })))
    } catch { toast.error('Failed to load checklist') }
    finally { setChecklistLoading(false) }
  }

  const handleAddQuestion = async (q: QuestionOption) => {
    try {
      await api.getInstance().post('/api/machine-checklist', {
        machineCode: machineData.machineCode, questionId: q.id, isChoice: false, checkStatus: false, resetTime: '0 0 0 * * 1',
      })
      toast.success('Question added')
      fetchChecklist()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? error?.response?.data?.message ?? 'Failed to add question')
    }
  }

  const handleDeleteChecklist = async (rowId: number) => {
    setDeletingIds(prev => [...prev, rowId])
    try {
      await api.getInstance().delete('/api/machine-checklist', { data: [rowId] })
      setChecklists(prev => prev.filter(c => c.id !== rowId))
      toast.success('Removed')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? error?.response?.data?.message ?? 'Failed to remove')
    } finally {
      setDeletingIds(prev => prev.filter(i => i !== rowId))
    }
  }

  // ─── Maintenance checklist ─────────────────────────────────────────────────

  const fetchMaintChecklist = async () => {
    setMaintChecklistLoading(true)
    try {
      const res = await api.getInstance().get<any>(`/api/maintenance-checklist/by-machine`, {
        params: { machineCode: formData.machineCode },
      })
      const list = Array.isArray(res.data) ? res.data : []
      setMaintChecklists(list.map((item: any) => ({
        id: item.id, questionId: item.questionId,
        detail: item.question?.detail ?? '', description: item.question?.description ?? '',
        resetTime: item.resetTime ?? '', isChoice: item.isChoice ?? false, checkStatus: item.checkStatus ?? false,
      })))
    } catch { toast.error('Failed to load maintenance checklist') }
    finally { setMaintChecklistLoading(false) }
  }

  const handleAddMaintQuestion = async (q: QuestionOption) => {
    try {
      await api.getInstance().post('/api/maintenance-checklist', {
        machineCode: formData.machineCode, questionId: q.id, isChoice: false, checkStatus: false, resetTime: '0 0 0 * * 1',
      })
      toast.success('Question added')
      fetchMaintChecklist()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? error?.response?.data?.message ?? 'Failed to add question')
    }
  }

  const handleDeleteMaintChecklist = async (rowId: number) => {
    setMaintDeletingIds(prev => [...prev, rowId])
    try {
      await api.getInstance().delete('/api/maintenance-checklist', { data: [rowId] })
      setMaintChecklists(prev => prev.filter(c => c.id !== rowId))
      toast.success('Removed')
    } catch (error: any) {
      toast.error(error?.response?.data?.detail ?? error?.response?.data?.message ?? 'Failed to remove')
    } finally {
      setMaintDeletingIds(prev => prev.filter(i => i !== rowId))
    }
  }

  // ─── File upload ───────────────────────────────────────────────────────────

  const uploadSingleFile = async (file: File): Promise<FileEntry> => {
    const fd = new FormData()
    fd.append('file', file)
    const raw = await api.post<any>('/api/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    const dto: FileEntry = raw?.fileName ? raw : raw?.data
    if (!dto?.fileName) throw new Error('Upload response missing fileName')
    return dto
  }

  const handleFileUpload = async (
    files:        File[],
    filesRef:     React.MutableRefObject<FileEntry[]>,
    setFiles:     React.Dispatch<React.SetStateAction<FileEntry[]>>,
    uploadingSet: React.MutableRefObject<Set<string>>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    const newFiles = files.filter(f => {
      const key = `${f.name}|${f.size}|${f.lastModified}`
      if (uploadingSet.current.has(key)) return false
      uploadingSet.current.add(key)
      return true
    })
    if (!newFiles.length) return
    setUploading(true)
    const results: FileEntry[] = []
    try {
      for (const file of newFiles) {
        try { results.push(await uploadSingleFile(file)) }
        catch (err) { console.error('Failed to upload:', file.name, err); toast.error(`Failed to upload: ${file.name}`) }
      }
      if (results.length) {
        setFiles(prev => [...prev, ...results])
        toast.success(t('files_uploaded').replace('{count}', String(results.length)))
      }
    } finally {
      newFiles.forEach(f => uploadingSet.current.delete(`${f.name}|${f.size}|${f.lastModified}`))
      setUploading(false)
    }
  }

  const handleImagesChange = (files: File[]) => {
    // FIX: กรองเฉพาะ File object จริง
    // เงื่อนไข: instanceof File + size > 0 + มี lastModified (property เฉพาะ File จริง)
    // ป้องกัน FileUploadField ส่ง plain object ที่ toUploadedFiles() สร้างมา
    const realFiles = files.filter(f => f instanceof File && f.size > 0 && f.lastModified > 0)
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current)
    imageTimeoutRef.current = setTimeout(() => {
      if (realFiles.length && !isUploadingImages)
        handleFileUpload(realFiles, imageFilesRef, setImageFiles, imageUploadingSet, setIsUploadingImages)
    }, 100)
  }

  const handleInstructionsChange = (files: File[]) => {
    const realFiles = files.filter(f => f instanceof File && f.size > 0 && f.lastModified > 0)
    if (instrTimeoutRef.current) clearTimeout(instrTimeoutRef.current)
    instrTimeoutRef.current = setTimeout(() => {
      if (realFiles.length && !isUploadingInstr)
        handleFileUpload(realFiles, instrFilesRef, setInstrFiles, instrUploadingSet, setIsUploadingInstr)
    }, 100)
  }

  /**
   * SOFT-DELETE: mark ไฟล์ว่าจะลบ แต่ยังไม่ลบจริง
   * ไฟล์จะหายออกจาก UI ทันที (activeFiles filter) แต่ยังอยู่ใน state
   * จะลบจากดิสก์ + อัปเดต DB พร้อมกันตอน handleSubmit
   */
  const markForDelete = (
    fileId:   string,
    setFiles: React.Dispatch<React.SetStateAction<FileEntry[]>>,
  ) => {
    setFiles(prev => prev.map(f =>
      f.fileName === fileId ? { ...f, _markedForDelete: true } : f
    ))
  }

  const handleDeleteImage       = (fileId: string) => markForDelete(fileId, setImageFiles)
  const handleDeleteInstruction = (fileId: string) => markForDelete(fileId, setInstrFiles)

  const handleDownloadFile = (file: any) => {
    const fileName = file?.fileName ?? file?.name
    if (!fileName) { toast.error(t('file_not_found')); return }
    const url = file?.fileUrl || `/api/files/download/${encodeURIComponent(fileName)}`
    window.open(`${import.meta.env.VITE_API_URL}${url}`, '_blank')
  }

  // ─── FileUploadField value mapper ─────────────────────────────────────────

  /**
   * FIX: แปลง FileEntry[] → format สำหรับ prop "uploadedFiles" ของ FileUploadField
   * - ส่งผ่าน uploadedFiles (ไฟล์ที่ upload แล้ว) ไม่ใช่ value (ไฟล์ใหม่ที่กำลัง drop)
   * - id = fileName เพื่อให้ onDeleteUploadedFile ได้รับ fileName ตรงๆ
   */
  const toUploadedFiles = (files: FileEntry[]) =>
    activeFiles(files).map(f => ({
      id:   f.fileName,
      name: f.fileName,
      size: f.fileSize,
      type: f.fileType,
      url:  toDisplayUrl(f),
    }))

  // ─── Form validation ───────────────────────────────────────────────────────

  const validateRequiredFields = () => {
    const e: Record<string, string> = {}
    if (!formData.machineStatus.trim()) e.machineStatus = t('machine_status_required')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const isFormValid   = () => !!formData.machineStatus
  const getStepStatus = (stepId: string): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId === 'general') {
      if (errors.machineStatus) return 'error'
      return isFormValid() ? 'complete' : 'incomplete'
    }
    return 'empty'
  }

  // ─── Build DTO ─────────────────────────────────────────────────────────────

  const buildMachineDTO = (resolvedImages: FileEntry[], resolvedInstrs: FileEntry[]) => {
    /**
     * FIX: ส่ง empty string แทน null เมื่อไม่มีไฟล์
     * เหตุผล: backend ใช้ addIfNotNull() ซึ่งจะ skip field ถ้า value เป็น null
     *         ทำให้ DB ไม่อัปเดตเมื่อลบไฟล์ทั้งหมด
     *         การส่ง "" บอก backend ให้เขียนทับค่าเดิมใน DB ด้วย null/empty
     */
    const toFileJson = (files: FileEntry[]): string =>
      files.length
        ? JSON.stringify(files.map(f => ({
            fileName: f.fileName, fileUrl: f.fileUrl ?? toDisplayUrl(f),
            fileType: f.fileType, fileSize: f.fileSize, uploadedBy: f.uploadedBy ?? null,
          })))
        : ''  // empty string = "ล้างไฟล์ทั้งหมด" — backend จะเขียน null ลง DB

    const nonActive  = isNonActiveStatus(formData.machineStatus)
    const cancelDate = nonActive ? new Date().toISOString() : null

    return {
      id,
      machineName:           formData.name,
      machineCode:           formData.machineCode,
      brand:                 formData.brand          || null,
      model:                 formData.model          || null,
      serialNumber:          formData.serialNumber   || null,
      department:            machineData?.department || null,
      machineGroupId:        formData.machineGroupId || null,
      groups:                formData.machineGroup   || null,
      machineTypeId:         formData.machineTypeId  || null,
      machineTypeName:       formData.machineType    || null,
      responsiblePersonId:   formData.responsible  ? Number(formData.responsible)  : null,
      supervisorId:          formData.supervisor   ? Number(formData.supervisor)   : null,
      managerId:             formData.manager      ? Number(formData.manager)      : null,
      responsiblePersonName: formData.responsibleName || null,
      supervisorName:        formData.supervisorName  || null,
      managerName:           formData.managerName     || null,
      machineStatus:         formData.machineStatus   || null,
      checkStatus:           nonActive ? 'OUT OF SERVICE' : undefined,
      cancelDate,
      reasonCancel:          nonActive ? (formData.reasonCancel || null) : null,
      resetPeriod:           formData.resetPeriod       || null,
      maintenancePeriod:     formData.maintenancePeriod || null,
      note:                  formData.note              || null,
      // ส่งเฉพาะ active files (ที่ไม่ถูก mark ลบ) ไปบันทึกใน DB
      image:           toFileJson(resolvedImages),
      workInstruction: toFileJson(resolvedInstrs),
    }
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateRequiredFields()) {
      setCurrentStep('general')
      toast.error(t('fill_required_fields'))
      return
    }
    setIsSubmitting(true)
    try {
      // 1. แยกไฟล์ที่จะลบออกจากไฟล์ที่จะเก็บ
      const imagesToDelete = imageFiles.filter(f => f._markedForDelete)
      const instrsToDelete = instrFiles.filter(f => f._markedForDelete)
      const activeImages   = activeFiles(imageFiles)
      const activeInstrs   = activeFiles(instrFiles)

      // 2. ลบไฟล์จากดิสก์ทั้งหมดพร้อมกัน (parallel)
      //    ถ้าลบไม่สำเร็จก็ log ไว้แต่ไม่ block การ save
      const deleteResults = await Promise.allSettled([
        ...imagesToDelete.map(f =>
          api.delete(`/api/files/delete/${encodeURIComponent(f.fileName)}`)
            .catch(err => console.warn('Failed to delete image from disk:', f.fileName, err))
        ),
        ...instrsToDelete.map(f =>
          api.delete(`/api/files/delete/${encodeURIComponent(f.fileName)}`)
            .catch(err => console.warn('Failed to delete instruction from disk:', f.fileName, err))
        ),
      ])

      const failedDeletes = deleteResults.filter(r => r.status === 'rejected').length
      if (failedDeletes > 0) {
        console.warn(`${failedDeletes} file(s) could not be deleted from disk`)
      }

      // 3. PUT machine — ส่งเฉพาะ active files ใน DTO
      //    DB จะได้รับ JSON ที่ไม่มีไฟล์ที่ถูก mark ลบแล้ว
      await api.put('/api/machine/update', buildMachineDTO(activeImages, activeInstrs))

      // 4. Sync to Lark
      await api.post(`/api/machine/${id}/sync-to-lark`)

      toast.success(t('machine_updated'))
      setTimeout(() => navigate({ to: '/checklist/machine' }), 1000)
    } catch (error: any) {
      toast.error(t('failed_to_update_machine'), {
        description: error.response?.data?.message || error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Field helpers ─────────────────────────────────────────────────────────

  const setField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) { const e = { ...errors }; delete e[field]; setErrors(e) }
  }

  // ─── Member fetch ──────────────────────────────────────────────────────────

  const fetchMembers = async (keyword: string, index: number) => {
    const params: Record<string, unknown> = { index, size: 100 }
    if (keyword.trim()) params.keyword = keyword.trim()
    const res = await api.get<ListResponse<MemberListDTO>>('/api/user/get/list', { params })
    const all = res.data.map((m: any) => ({
      label: `${m.firstName} ${m.lastName}`, value: String(m.id || ''), fullName: `${m.firstName} ${m.lastName}`,
    }))
    if (keyword.trim()) { const kw = keyword.trim().toLowerCase(); return all.filter(m => m.label.toLowerCase().includes(kw)) }
    return all
  }

  const fetchResponsible = async (kw: string, idx: number) => {
    try { const d = await fetchMembers(kw, idx); if (!kw) setCachedResponsible(d); return { data: d, hasMore: false } }
    catch { return { data: [], hasMore: false } }
  }
  const fetchSupervisor = async (kw: string, idx: number) => {
    try { const d = await fetchMembers(kw, idx); if (!kw) setCachedSupervisor(d); return { data: d, hasMore: false } }
    catch { return { data: [], hasMore: false } }
  }
  const fetchManager = async (kw: string, idx: number) => {
    try { const d = await fetchMembers(kw, idx); if (!kw) setCachedManager(d); return { data: d, hasMore: false } }
    catch { return { data: [], hasMore: false } }
  }

  const handleResponsibleChange = async (selected: any) => {
    const val = Array.isArray(selected) ? selected[0] : selected
    if (!val) {
      setFormData(prev => ({ ...prev, responsible: '', responsibleName: '', supervisor: '', supervisorName: '', manager: '', managerName: '' }))
      return
    }
    const found = cachedResponsible.find(r => String(r.value) === String(val))
    setFormData(prev => ({ ...prev, responsible: val, responsibleName: found?.fullName ?? prev.responsibleName, supervisor: '', supervisorName: '', manager: '', managerName: '' }))
    try {
      const res    = await api.get<any>(`/api/user/${val}`)
      const member = res.data
      const supId  = member.supervisor ? String(member.supervisor) : ''
      const mgrId  = member.manager    ? String(member.manager)    : ''
      let supMembers = cachedSupervisor
      if (!supMembers.length) { const r = await fetchSupervisor('', 0); supMembers = r.data }
      let mgrMembers = cachedManager
      if (!mgrMembers.length) { const r = await fetchManager('', 0); mgrMembers = r.data }
      setFormData(prev => ({
        ...prev,
        supervisor: supId, supervisorName: supMembers.find(m => String(m.value) === supId)?.fullName ?? '',
        manager:    mgrId, managerName:    mgrMembers.find(m => String(m.value) === mgrId)?.fullName ?? '',
      }))
    } catch {}
  }

  // ─── Step content ──────────────────────────────────────────────────────────

  const renderStepContent = () => {
    if (isLoading)
      return <div className="flex items-center justify-center h-64"><p className="text-muted-foreground">{t('loading')}</p></div>

    switch (currentStep) {
      case 'general':
        return (
          <div className="px-2 pt-2 space-y-4">
            <ReadOnlyField label={t('name')} value={formData.name} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadOnlyField label={t('machine_code')}  value={formData.machineCode} />
              <ReadOnlyField label={t('serial_number')} value={formData.serialNumber} />
              <ReadOnlyField label={t('brand')}         value={formData.brand} />
              <ReadOnlyField label={t('model')}         value={formData.model} />
              <ReadOnlyField label={t('machine_group')} value={formData.machineGroup} />
              <ReadOnlyField label={t('machine_type')}  value={formData.machineType} />
              <ReadOnlyField label={t('department')}    value={formData.department} />
              <ServerSingleSelect
                key={`resp-${formData.responsible || 'e'}`}
                id="responsible" title={t('responsible')} label={t('responsible')}
                placeholder={t('select_responsible')} value={formData.responsible}
                initialLabel={formData.responsibleName} onChange={handleResponsibleChange}
                fetchOptions={fetchResponsible} error={errors.responsible} required />
              <ReadOnlyField label={t('supervisor')} value={formData.supervisorName} />
              <ReadOnlyField label={t('manager')}    value={formData.managerName} />
            </div>

            <SingleSelectField
              key={`status-${formData.machineStatus || 'empty'}`}
              id="machineStatus" label={t('machine_status')}
              value={formData.machineStatus ? [formData.machineStatus] : []}
              onChange={v => setField('machineStatus', v[0] || '')}
              options={machineStatusOptions} error={errors.machineStatus} required />

            {isNonActiveStatus(formData.machineStatus) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('reason_cancel') || 'เหตุผล'}</label>
                <input type="text" value={formData.reasonCancel}
                  onChange={e => setField('reasonCancel', e.target.value)}
                  placeholder={t('reason_cancel_placeholder') || 'ระบุเหตุผล...'}
                  className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('note')}</label>
              <textarea value={formData.note} onChange={e => setField('note', e.target.value)}
                rows={3} placeholder={t('note')}
                className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>

            <FileUploadField id="machine-images" label={t('images')} maxFiles={10}
              value={[]}
              uploadedFiles={toUploadedFiles(imageFiles)}
              onChange={handleImagesChange}
              onDownloadFile={handleDownloadFile}
              onDeleteUploadedFile={handleDeleteImage}
              onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })} />

            <FileUploadField id="machine-instructions" label={t('work_instructions')} maxFiles={10}
              value={[]}
              uploadedFiles={toUploadedFiles(instrFiles)}
              onChange={handleInstructionsChange}
              onDownloadFile={handleDownloadFile}
              onDeleteUploadedFile={handleDeleteInstruction}
              onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })} />
          </div>
        )

      case 'checklist':
        return (
          <div className="px-2 pt-2 space-y-4">
            {checklistLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">{t('loading')}</div>
            ) : checklists.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed">{t('no_result')}</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Detail</th>
                      <th className="text-left px-4 py-3 font-medium w-[25%]">Description</th>
                      <th className="text-left px-4 py-3 font-medium w-[16%]">Reset Time</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {checklists.map(item => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium"><span className="line-clamp-2">{item.detail}</span></td>
                        <td className="px-4 py-3 text-muted-foreground"><span className="line-clamp-2">{item.description || '-'}</span></td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.resetTime || '-'}</td>
                        <td className="px-4 py-3">
                          <button type="button" disabled={deletingIds.includes(item.id)}
                            onClick={() => handleDeleteChecklist(item.id)}
                            className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-muted-foreground transition disabled:opacity-40">
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <QuestionPicker onAdd={handleAddQuestion} existingQuestionIds={checklists.map(c => c.questionId)} />
              <p className="text-xs text-muted-foreground">{checklists.length} question{checklists.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )

      case 'maintenance':
        return (
          <div className="px-2 pt-2 space-y-4">
            <ReadOnlyField label={t('maintenance_period')} value={formData.maintenancePeriod} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
              <ReadOnlyField label={t('round_1')} value={formData.maintenance1 ? new Date(formData.maintenance1).toLocaleDateString('th-TH') : '-'} />
              <ReadOnlyField label={t('round_2')} value={formData.maintenance2 ? new Date(formData.maintenance2).toLocaleDateString('th-TH') : '-'} />
              <ReadOnlyField label={t('round_3')} value={formData.maintenance3 ? new Date(formData.maintenance3).toLocaleDateString('th-TH') : '-'} />
              <ReadOnlyField label={t('round_4')} value={formData.maintenance4 ? new Date(formData.maintenance4).toLocaleDateString('th-TH') : '-'} />
            </div>
            <hr className="border-t pt-2" />
            {maintChecklistLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">{t('loading')}</div>
            ) : maintChecklists.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed">{t('no_result')}</div>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium">Detail</th>
                      <th className="text-left px-4 py-3 font-medium w-[25%]">Description</th>
                      <th className="text-left px-4 py-3 font-medium w-[16%]">Reset Time</th>
                      <th className="px-4 py-3 w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {maintChecklists.map(item => (
                      <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium"><span className="line-clamp-2">{item.detail}</span></td>
                        <td className="px-4 py-3 text-muted-foreground"><span className="line-clamp-2">{item.description || '-'}</span></td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{item.resetTime || '-'}</td>
                        <td className="px-4 py-3">
                          <button type="button" disabled={maintDeletingIds.includes(item.id)}
                            onClick={() => handleDeleteMaintChecklist(item.id)}
                            className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-muted-foreground transition disabled:opacity-40">
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center gap-3 pt-1">
              <QuestionPicker onAdd={handleAddMaintQuestion} existingQuestionIds={maintChecklists.map(c => c.questionId)} />
              <p className="text-xs text-muted-foreground">{maintChecklists.length} question{maintChecklists.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        )

      case 'calibration':
        return (
          <div className="px-2 pt-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ReadOnlyField label={t('external_calibration_date')} value={formData.externalCalibration ? new Date(formData.externalCalibration).toLocaleDateString('th-TH') : '-'} />
              <ReadOnlyField label={t('calibration_due_date')}      value={formData.calibrationDueDate  ? new Date(formData.calibrationDueDate).toLocaleDateString('th-TH')  : '-'} />
              <ReadOnlyField label={t('certificate_date')}          value={formData.certificateDate     ? new Date(formData.certificateDate).toLocaleDateString('th-TH')     : '-'} />
              <ReadOnlyField label={t('results')}            value={formData.results} />
              <ReadOnlyField label={t('criteria')}           value={formData.criteria} />
              <ReadOnlyField label={t('measuring_range')}    value={formData.measuringRange} />
              <ReadOnlyField label={t('calibration_range')}  value={formData.calibrationRange} />
              <ReadOnlyField label={t('accuracy')}           value={formData.accuracy} />
              <ReadOnlyField label={t('calibration_status')} value={formData.calibrationStatus} />
            </div>
          </div>
        )

      default: return null
    }
  }

  return (
    <FormLayout
      backLink="/checklist/machine"
      title={t('edit_machine')}
      subtitle={`${t('edit_machine')}: ${formData.name || formData.machineCode}`}
      onSubmit={handleSubmit} steps={formSteps} currentStep={currentStep}
      onStepChange={setCurrentStep} getStepStatus={getStepStatus}
      isSubmitting={isSubmitting} isFormValid={isFormValid()}
      submitText={t('update')} cancelLink="/checklist/machine">
      {renderStepContent()}
    </FormLayout>
  )
}