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

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileUploadResponse {
  fileName: string
  fileUrl:  string
  fileType: string
  fileSize: number
  uploadedBy?: string | null
}

interface ChecklistQuestion {
  id:          number   // MachineChecklist.id (row id)
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

// ─── Constants ────────────────────────────────────────────────────────────────

const formSteps: FormStep[] = [
  { id: 'general',     title: 'General',     description: 'Basic information',       required: true  },
  { id: 'checklist',   title: 'Checklist',   description: 'Checklist questions',     required: false },
  { id: 'maintenance', title: 'Maintenance', description: 'Maintenance information', required: false },
  { id: 'calibration', title: 'Calibration', description: 'Calibration information', required: false },
]

const machineStatusOptions = [
  { value: 'READY TO USE', label: 'READY TO USE' },
  { value: 'NOT IN USE',   label: 'NOT IN USE'   },
  { value: 'REPAIR',       label: 'REPAIR'       },
]

// ─── ReadOnlyField ────────────────────────────────────────────────────────────

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

// ─── QuestionPicker ───────────────────────────────────────────────────────────

function QuestionPicker({
  onAdd,
  existingQuestionIds,
}: {
  onAdd: (q: QuestionOption) => void
  existingQuestionIds: number[]
}) {
  const [open,    setOpen]    = useState(false)
  const [keyword, setKeyword] = useState('')
  const [items,   setItems]   = useState<QuestionOption[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open) return
    fetchQuestions(keyword)
  }, [open, keyword])

  const fetchQuestions = async (kw: string) => {
    setLoading(true)
    try {
      const params: any = { index: 0, size: 50 }
      if (kw.trim()) params.keyword = kw.trim()
      const res = await api.getInstance().get<any>('/api/question/get/page', { params })
      const list: QuestionOption[] = (res.data?.data ?? []).map((q: any) => ({
        id:          q.id,
        detail:      q.detail,
        description: q.description ?? '',
      }))
      setItems(list)
    } catch {
      toast.error('Failed to fetch questions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-dashed border-primary text-primary hover:bg-primary/5 transition"
      >
        <Plus className="h-4 w-4" /> Add Question
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-[420px] rounded-xl border bg-background shadow-lg overflow-hidden">
          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 border-b">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              autoFocus
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              placeholder="Search question..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </div>
          {/* List */}
          <div className="max-h-64 overflow-y-auto divide-y">
            {loading && (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">Loading...</div>
            )}
            {!loading && items.length === 0 && (
              <div className="px-3 py-3 text-sm text-muted-foreground text-center">No results</div>
            )}
            {!loading && items.map(q => {
              const already = existingQuestionIds.includes(q.id)
              return (
                <button
                  key={q.id}
                  type="button"
                  disabled={already}
                  onClick={() => { if (!already) { onAdd(q); setOpen(false) } }}
                  className={`w-full text-left px-3 py-2.5 transition ${
                    already
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-muted cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{q.detail}</p>
                      {q.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{q.description}</p>
                      )}
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

// ─── Main Component ───────────────────────────────────────────────────────────

function MachineEdit() {
  const navigate        = useNavigate()
  const { machineData } = Route.useLoaderData()
  const { id }          = Route.useSearch()
  const { t }           = useTranslation()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep,  setCurrentStep]  = useState('general')
  const [errors,       setErrors]       = useState<Record<string, string>>({})
  const [isLoading,    setIsLoading]    = useState(true)

  const [cachedResponsible, setCachedResponsible] = useState<any[]>([])
  const [cachedSupervisor,  setCachedSupervisor]  = useState<any[]>([])
  const [cachedManager,     setCachedManager]     = useState<any[]>([])

  // ─── Checklist state ──────────────────────────────────────────────────────
  const [checklists,        setChecklists]        = useState<ChecklistQuestion[]>([])
  const [checklistLoading,  setChecklistLoading]  = useState(false)
  const [deletingIds,       setDeletingIds]        = useState<number[]>([])

  // ─── Maintenance checklist state ────────────────────────────────────────────
  const [maintChecklists,       setMaintChecklists]       = useState<ChecklistQuestion[]>([])
  const [maintChecklistLoading, setMaintChecklistLoading] = useState(false)
  const [maintDeletingIds,      setMaintDeletingIds]      = useState<number[]>([])

  // ─── File upload state ────────────────────────────────────────────────────
  const [uploadedImages,       setUploadedImages]       = useState<FileUploadResponse[]>([])
  const [uploadedInstructions, setUploadedInstructions] = useState<FileUploadResponse[]>([])
  const [isUploadingImages,    setIsUploadingImages]    = useState(false)
  const [isUploadingInstr,     setIsUploadingInstr]     = useState(false)

  const imageQueueRef   = useRef<Set<string>>(new Set())
  const instrQueueRef   = useRef<Set<string>>(new Set())
  const imageTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const instrTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const uploadedImagesRef       = useRef<FileUploadResponse[]>([])
  const uploadedInstructionsRef = useRef<FileUploadResponse[]>([])

  useEffect(() => { uploadedImagesRef.current = uploadedImages },             [uploadedImages])
  useEffect(() => { uploadedInstructionsRef.current = uploadedInstructions }, [uploadedInstructions])

  // ─── Form data ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    name: '', machineCode: '', brand: '', model: '', serialNumber: '',
    machineGroup: '', machineGroupId: '', machineType: '', machineTypeId: '',
    department: '', maintenancePeriod: '',
    maintenance1: '', maintenance2: '', maintenance3: '', maintenance4: '',
    externalCalibration: '', calibrationDueDate: '', certificateDate: '',
    results: '', criteria: '', measuringRange: '', accuracy: '', calibrationRange: '',
    responsible: '', responsibleName: '',
    supervisor: '', supervisorName: '',
    manager: '', managerName: '',
    machineStatus: '', resetPeriod: '', note: '', calibrationStatus: '',
  })

  // ─── Load machine data ────────────────────────────────────────────────────
  useEffect(() => {
    if (!machineData) return
    setIsLoading(true)
    try {
      setUploadedImages(parseFiles(machineData.image))
      setUploadedInstructions(parseFiles(machineData.workInstruction))

      const maintenanceData: Record<string, string> = {}
      const maintList = machineData.maintenanceRecords || machineData.maintenanceList || []
      if (Array.isArray(maintList)) {
        ;[...maintList]
          .sort((a: any, b: any) => (a.round ?? 0) - (b.round ?? 0))
          .forEach((m: any, i: number) => {
            if (m.dueDate) maintenanceData[`maintenance${i + 1}`] = m.dueDate
          })
      }
      const calList = machineData.calibrationRecords || machineData.calibration || []
      const cal = Array.isArray(calList) ? (calList[0] ?? {}) : (calList ?? {})

      setFormData({
        name:              machineData.machineName           || '',
        machineCode:       machineData.machineCode           || '',
        brand:             machineData.brand                 || '',
        model:             machineData.model                 || '',
        serialNumber:      machineData.serialNumber          || '',
        machineGroup:      machineData.machineGroupName      || '',
        machineGroupId:    machineData.machineGroupId        || '',
        machineType:       machineData.machineTypeName       || '',
        machineTypeId:     machineData.machineTypeId         || '',
        department:        machineData.departmentName || machineData.department || '',
        maintenancePeriod: machineData.maintenancePeriod     || '',
        maintenance1:      maintenanceData.maintenance1      || '',
        maintenance2:      maintenanceData.maintenance2      || '',
        maintenance3:      maintenanceData.maintenance3      || '',
        maintenance4:      maintenanceData.maintenance4      || '',
        externalCalibration: cal.externalCalibrationDate     || '',
        calibrationDueDate:  cal.calibrationDueDate || cal.dueDate || '',
        certificateDate:     cal.certificateDate             || '',
        results:             cal.results                     || '',
        criteria:            cal.criteria                    || '',
        measuringRange:      cal.measuringRange              || '',
        accuracy:            cal.accuracy                    || '',
        calibrationRange:    cal.calibrationRange            || '',
        responsible:      machineData.responsiblePersonId   || '',
        responsibleName:  machineData.responsiblePersonName || '',
        supervisor:       machineData.supervisorId          || '',
        supervisorName:   machineData.supervisorName        || '',
        manager:          machineData.managerId             || '',
        managerName:      machineData.managerName           || '',
        machineStatus:    machineData.machineStatus         || '',
        resetPeriod:      machineData.resetPeriod           || '',
        note:             machineData.note                  || '',
        calibrationStatus: cal.calibrationStatus            || '',
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
    if (cachedResponsible.length === 0) fetchResponsible('', 0)
    if (cachedSupervisor.length  === 0) fetchSupervisor('', 0)
    if (cachedManager.length     === 0) fetchManager('', 0)
  }, [isLoading])

  // ─── Load checklist (when tab changes) ───────────────────────────────────
  useEffect(() => {
    if (currentStep === 'checklist' && machineData?.machineCode) {
      fetchChecklist()
    }
    if (currentStep === 'maintenance' && formData.machineCode) {
      fetchMaintChecklist()
    }
  }, [currentStep])

  const fetchChecklist = async () => {
    setChecklistLoading(true)
    try {
      const res = await api.getInstance().get<any>(
        `/api/machine-checklist/by-machine`,
        { params: { machineCode: machineData.machineCode } }
      )
      const list = res.data?.data ?? []
      setChecklists(list.map((item: any) => ({
        id:          item.id,
        questionId:  item.questionId,
        detail:      item.question?.detail      ?? '',
        description: item.question?.description ?? '',
        resetTime:   item.resetTime             ?? '',
        isChoice:    item.isChoice              ?? false,
        checkStatus: item.checkStatus           ?? false,
      })))
    } catch {
      toast.error('Failed to load checklist')
    } finally {
      setChecklistLoading(false)
    }
  }

  // ─── Add question to checklist ────────────────────────────────────────────
  const handleAddQuestion = async (q: QuestionOption) => {
    try {
      await api.getInstance().post('/api/machine-checklist', {
        machineCode: machineData.machineCode,
        questionId:  q.id,
        isChoice:    false,
        checkStatus: false,
        resetTime:   '0 0 0 * * 1',  // default weekly
      })
      toast.success('Question added')
      fetchChecklist()
    } catch (error: any) {
      const msg = error?.response?.data?.detail ?? error?.response?.data?.message ?? 'Failed to add question'
      toast.error(msg)
    }
  }

  // ─── Maintenance checklist fetch ─────────────────────────────────────────
  const fetchMaintChecklist = async () => {
    setMaintChecklistLoading(true)
    try {
      const res = await api.getInstance().get<any>(
        `/api/maintenance-checklist/by-machine`,
        { params: { machineCode: formData.machineCode } }
      )
      const list = Array.isArray(res.data) ? res.data : []
      setMaintChecklists(list.map((item: any) => ({
        id:          item.id,
        questionId:  item.questionId,
        detail:      item.question?.detail      ?? '',
        description: item.question?.description ?? '',
        resetTime:   item.resetTime             ?? '',
        isChoice:    item.isChoice              ?? false,
        checkStatus: item.checkStatus           ?? false,
      })))
    } catch {
      toast.error('Failed to load maintenance checklist')
    } finally {
      setMaintChecklistLoading(false)
    }
  }

  const handleAddMaintQuestion = async (q: QuestionOption) => {
    try {
      await api.getInstance().post('/api/maintenance-checklist', {
        machineCode: formData.machineCode,
        questionId:  q.id,
        isChoice:    false,
        checkStatus: false,
        resetTime:   '0 0 0 * * 1',
      })
      toast.success('Question added')
      fetchMaintChecklist()
    } catch (error: any) {
      const msg = error?.response?.data?.detail ?? error?.response?.data?.message ?? 'Failed to add question'
      toast.error(msg)
    }
  }

  const handleDeleteMaintChecklist = async (rowId: number) => {
    setMaintDeletingIds(prev => [...prev, rowId])
    try {
      await api.getInstance().delete('/api/maintenance-checklist', { data: [rowId] })
      setMaintChecklists(prev => prev.filter(c => c.id !== rowId))
      toast.success('Removed')
    } catch (error: any) {
      const msg = error?.response?.data?.detail ?? error?.response?.data?.message ?? 'Failed to remove'
      toast.error(msg)
    } finally {
      setMaintDeletingIds(prev => prev.filter(i => i !== rowId))
    }
  }

  // ─── Delete checklist item ────────────────────────────────────────────────
  const handleDeleteChecklist = async (rowId: number) => {
    setDeletingIds(prev => [...prev, rowId])
    try {
      await api.getInstance().delete('/api/machine-checklist', { data: [rowId] })
      setChecklists(prev => prev.filter(c => c.id !== rowId))
      toast.success('Removed')
    } catch (error: any) {
      const msg = error?.response?.data?.detail ?? error?.response?.data?.message ?? 'Failed to remove'
      toast.error(msg)
    } finally {
      setDeletingIds(prev => prev.filter(i => i !== rowId))
    }
  }

  // ─── File helpers ─────────────────────────────────────────────────────────
  const parseFiles = (raw?: string | null): FileUploadResponse[] => {
    if (!raw) return []
    if (Array.isArray(raw)) return raw
    try { return JSON.parse(raw) } catch { return [] }
  }

  const uploadFile = async (file: File): Promise<FileUploadResponse> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post<{ data: FileUploadResponse }>('/api/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  const handleFileUpload = async (
    files: File[],
    uploadedRef: React.MutableRefObject<FileUploadResponse[]>,
    setUploaded: React.Dispatch<React.SetStateAction<FileUploadResponse[]>>,
    queueRef: React.MutableRefObject<Set<string>>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    const newFiles = files.filter(f => {
      const key = `${f.name}-${f.size}-${f.lastModified}`
      if (queueRef.current.has(key)) return false
      if (uploadedRef.current.some(uf => uf.fileName.includes(f.name))) return false
      queueRef.current.add(key)
      return true
    })
    if (!newFiles.length) return
    setUploading(true)
    try {
      const results: FileUploadResponse[] = []
      for (const file of newFiles) {
        try { results.push(await uploadFile(file)) } catch {}
      }
      if (results.length) {
        setUploaded(prev => [...prev, ...results])
        toast.success(t('files_uploaded').replace('{count}', String(results.length)))
      }
    } catch {
      toast.error(t('failed_to_upload_files'))
    } finally {
      newFiles.forEach(f => queueRef.current.delete(`${f.name}-${f.size}-${f.lastModified}`))
      setUploading(false)
    }
  }

  const handleImagesChange = (files: File[]) => {
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current)
    imageTimeoutRef.current = setTimeout(() => {
      if (files?.length && !isUploadingImages)
        handleFileUpload(files, uploadedImagesRef, setUploadedImages, imageQueueRef, setIsUploadingImages)
    }, 100)
  }

  const handleInstructionsChange = (files: File[]) => {
    if (instrTimeoutRef.current) clearTimeout(instrTimeoutRef.current)
    instrTimeoutRef.current = setTimeout(() => {
      if (files?.length && !isUploadingInstr)
        handleFileUpload(files, uploadedInstructionsRef, setUploadedInstructions, instrQueueRef, setIsUploadingInstr)
    }, 100)
  }

  const handleDeleteImage = async (fileId: any) => {
    const f = uploadedImages.find(u => u.fileName === fileId || u.fileName.includes(fileId))
    if (!f) return
    try {
      await api.delete(`/api/files/delete/${f.fileName}`)
      setUploadedImages(prev => prev.filter(u => u.fileName !== f.fileName))
      toast.success(t('file_deleted'))
    } catch { toast.error(t('failed_to_delete_file')) }
  }

  const handleDeleteInstruction = async (fileId: any) => {
    const f = uploadedInstructions.find(u => u.fileName === fileId || u.fileName.includes(fileId))
    if (!f) return
    try {
      await api.delete(`/api/files/delete/${f.fileName}`)
      setUploadedInstructions(prev => prev.filter(u => u.fileName !== f.fileName))
      toast.success(t('file_deleted'))
    } catch { toast.error(t('failed_to_delete_file')) }
  }

  const handleDownloadFile = (file: any) => {
    const name = file?.fileName || file?.name
    if (name) window.open(`${import.meta.env.VITE_API_URL}/api/files/download/${name}`, '_blank')
    else toast.error(t('file_not_found'))
  }

  // ─── Validation ───────────────────────────────────────────────────────────
  const validateRequiredFields = () => {
    const e: Record<string, string> = {}
    if (!formData.machineStatus.trim()) e.machineStatus = 'Machine status is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const isFormValid    = () => !!formData.machineStatus
  const getStepStatus  = (stepId: string): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId === 'general') {
      if (errors.machineStatus) return 'error'
      return isFormValid() ? 'complete' : 'incomplete'
    }
    return 'empty'
  }

  // ─── Build DTO ────────────────────────────────────────────────────────────
  const buildMachineDTO = () => {
    const imageJson = uploadedImages.length
      ? JSON.stringify(uploadedImages.map(f => ({ fileName: f.fileName, fileUrl: f.fileUrl, fileType: f.fileType, fileSize: f.fileSize, uploadedBy: f.uploadedBy ?? null })))
      : null
    const instrJson = uploadedInstructions.length
      ? JSON.stringify(uploadedInstructions.map(f => ({ fileName: f.fileName, fileUrl: f.fileUrl, fileType: f.fileType, fileSize: f.fileSize, uploadedBy: f.uploadedBy ?? null })))
      : null
    return {
      id,
      machineName:           formData.name,
      machineCode:           formData.machineCode,
      brand:                 formData.brand           || null,
      model:                 formData.model           || null,
      serialNumber:          formData.serialNumber    || null,
      department:            machineData?.department  || null,
      machineGroupId:        formData.machineGroupId  || null,
      groups:                formData.machineGroup    || null,
      machineTypeId:         formData.machineTypeId   || null,
      machineTypeName:       formData.machineType     || null,
      responsiblePersonId:   formData.responsible     || null,
      responsiblePersonName: formData.responsibleName || null,
      supervisorId:          formData.supervisor      || null,
      supervisorName:        formData.supervisorName  || null,
      managerId:             formData.manager         || null,
      managerName:           formData.managerName     || null,
      machineStatus:         formData.machineStatus   || null,
      resetPeriod:           formData.resetPeriod     || null,
      maintenancePeriod:     formData.maintenancePeriod || null,
      note:                  formData.note            || null,
      image:                 imageJson,
      workInstruction:       instrJson,
    }
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateRequiredFields()) { setCurrentStep('general'); toast.error('Please fill in all required fields'); return }
    setIsSubmitting(true)
    try {
      await api.put('/api/machine/update', buildMachineDTO())
      toast.success('Machine updated successfully!')
      setTimeout(() => navigate({ to: '/checklist/machine' }), 1000)
    } catch (error: any) {
      toast.error('Failed to update machine', { description: error.response?.data?.message || error.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const setField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) { const e = { ...errors }; delete e[field]; setErrors(e) }
  }

  // ─── Fetch helpers ────────────────────────────────────────────────────────
  const fetchMembers = async (keyword: string, index: number) => {
    const params: any = { index, size: 100 }
    if (keyword.trim()) params.keyword = keyword.trim()
    const res = await api.get<ListResponse<MemberListDTO>>('/api/user/get/list', { params })
    return res.data.map((m: any) => ({ label: `${m.firstName} ${m.lastName}`, value: String(m.id || ''), fullName: `${m.firstName} ${m.lastName}` }))
  }

  const fetchResponsible = async (kw: string, idx: number) => {
    try { const d = await fetchMembers(kw, idx); setCachedResponsible(d); return { data: d, hasMore: false } }
    catch { return { data: [], hasMore: false } }
  }
  const fetchSupervisor = async (kw: string, idx: number) => {
    try { const d = await fetchMembers(kw, idx); setCachedSupervisor(d); return { data: d, hasMore: false } }
    catch { return { data: [], hasMore: false } }
  }
  const fetchManager = async (kw: string, idx: number) => {
    try { const d = await fetchMembers(kw, idx); setCachedManager(d); return { data: d, hasMore: false } }
    catch { return { data: [], hasMore: false } }
  }

  const makeMemberChange = (field: string, nameField: string, cache: any[]) =>
    async (selected: any) => {
      const val = Array.isArray(selected) ? selected[0] : selected
      if (!val) { setFormData(prev => ({ ...prev, [field]: '', [nameField]: '' })); return }
      const found = cache.find(r => String(r.value) === String(val))
      if (found) setFormData(prev => ({ ...prev, [field]: val, [nameField]: found.fullName }))
    }

  // ─── Render step content ──────────────────────────────────────────────────
  const renderStepContent = () => {
    if (isLoading) return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading machine data...</p>
      </div>
    )

    switch (currentStep) {

      // ── General ────────────────────────────────────────────────────────────
      case 'general': return (
        <div className="px-2 pt-2 space-y-4">
          <ReadOnlyField label="Name" value={formData.name} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyField label="Machine Code"  value={formData.machineCode} />
            <ReadOnlyField label="Serial Number" value={formData.serialNumber} />
            <ReadOnlyField label="Brand"         value={formData.brand} />
            <ReadOnlyField label="Model"         value={formData.model} />
            <ReadOnlyField label="Group"         value={formData.machineGroup} />
            <ReadOnlyField label="Type"          value={formData.machineType} />
            <ReadOnlyField label="Department"    value={formData.department} />

            <ServerSingleSelect key={`resp-${formData.responsible || 'e'}`}
              id="responsible" title="responsible" label="Responsible"
              placeholder="Select Responsible" value={formData.responsible}
              onChange={makeMemberChange('responsible', 'responsibleName', cachedResponsible)}
              fetchOptions={fetchResponsible} error={errors.responsible} required />

            <ServerSingleSelect key={`sup-${formData.supervisor || 'e'}`}
              id="supervisor" title="supervisor" label="Supervisor"
              placeholder="Select Supervisor" value={formData.supervisor}
              onChange={makeMemberChange('supervisor', 'supervisorName', cachedSupervisor)}
              fetchOptions={fetchSupervisor} />

            <ServerSingleSelect key={`mgr-${formData.manager || 'e'}`}
              id="manager" title="manager" label="Manager"
              placeholder="Select Manager" value={formData.manager}
              onChange={makeMemberChange('manager', 'managerName', cachedManager)}
              fetchOptions={fetchManager} />
          </div>

          <SingleSelectField id="machineStatus" label="Machine Status"
            value={[formData.machineStatus]}
            onChange={v => setField('machineStatus', v[0] || '')}
            options={machineStatusOptions}
            error={errors.machineStatus} required />

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note</label>
            <textarea
              value={formData.note}
              onChange={e => setField('note', e.target.value)}
              rows={3}
              placeholder="Additional notes (optional)"
              className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <FileUploadField
            id="machine-images" label="Images" maxFiles={10}
            value={uploadedImages.map(f => ({ name: f.fileName, size: f.fileSize, type: f.fileType, url: f.fileUrl })) as unknown as File[]}
            onChange={handleImagesChange}
            onDownloadFile={handleDownloadFile}
            onDeleteUploadedFile={handleDeleteImage}
            onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" could not be uploaded` })}
          />

          <FileUploadField
            id="machine-instructions" label="Work Instructions" maxFiles={10}
            value={uploadedInstructions.map(f => ({ name: f.fileName, size: f.fileSize, type: f.fileType, url: f.fileUrl })) as unknown as File[]}
            onChange={handleInstructionsChange}
            onDownloadFile={handleDownloadFile}
            onDeleteUploadedFile={handleDeleteInstruction}
            onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" could not be uploaded` })}
          />
        </div>
      )

      // ── Checklist ──────────────────────────────────────────────────────────
      case 'checklist': return (
        <div className="px-2 pt-2 space-y-4">
          {/* Table */}
          {checklistLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
          ) : checklists.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed">
              No checklist questions yet. Click "Add Question" below to add one.
            </div>
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
                      <td className="px-4 py-3 font-medium">
                        <span className="line-clamp-2">{item.detail}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="line-clamp-2">{item.description || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {item.resetTime || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={deletingIds.includes(item.id)}
                          onClick={() => handleDeleteChecklist(item.id)}
                          className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-muted-foreground transition disabled:opacity-40"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Add button — ชิดซ้ายด้านล่างตาราง */}
          <div className="flex items-center gap-3 pt-1">
            <QuestionPicker
              onAdd={handleAddQuestion}
              existingQuestionIds={checklists.map(c => c.questionId)}
            />
            <p className="text-xs text-muted-foreground">
              {checklists.length} question{checklists.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )

      // ── Maintenance ────────────────────────────────────────────────────────
      case 'maintenance': return (
        <div className="px-2 pt-2 space-y-4">
          <ReadOnlyField label="Maintenance Period" value={formData.maintenancePeriod} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2">
            <ReadOnlyField label="Round 1" value={formData.maintenance1 ? new Date(formData.maintenance1).toLocaleDateString('th-TH') : '-'} />
            <ReadOnlyField label="Round 2" value={formData.maintenance2 ? new Date(formData.maintenance2).toLocaleDateString('th-TH') : '-'} />
            <ReadOnlyField label="Round 3" value={formData.maintenance3 ? new Date(formData.maintenance3).toLocaleDateString('th-TH') : '-'} />
            <ReadOnlyField label="Round 4" value={formData.maintenance4 ? new Date(formData.maintenance4).toLocaleDateString('th-TH') : '-'} />
          </div>
          <hr className="border-t pt-2" />
          {maintChecklistLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading...</div>
          ) : maintChecklists.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed">
              No maintenance checklist questions yet. Click "Add Question" below to add one.
            </div>
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
                      <td className="px-4 py-3 font-medium">
                        <span className="line-clamp-2">{item.detail}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <span className="line-clamp-2">{item.description || '-'}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {item.resetTime || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={maintDeletingIds.includes(item.id)}
                          onClick={() => handleDeleteMaintChecklist(item.id)}
                          className="p-1 rounded hover:bg-red-50 hover:text-red-500 text-muted-foreground transition disabled:opacity-40"
                        >
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
            <QuestionPicker
              onAdd={handleAddMaintQuestion}
              existingQuestionIds={maintChecklists.map(c => c.questionId)}
            />
            <p className="text-xs text-muted-foreground">
              {maintChecklists.length} question{maintChecklists.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )

      // ── Calibration ────────────────────────────────────────────────────────
      case 'calibration': return (
        <div className="px-2 pt-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ReadOnlyField label="External Calibration" value={formData.externalCalibration ? new Date(formData.externalCalibration).toLocaleDateString('th-TH') : '-'} />
            <ReadOnlyField label="Calibration Due Date" value={formData.calibrationDueDate ? new Date(formData.calibrationDueDate).toLocaleDateString('th-TH') : '-'} />
            <ReadOnlyField label="Certificate Date"     value={formData.certificateDate ? new Date(formData.certificateDate).toLocaleDateString('th-TH') : '-'} />
            <ReadOnlyField label="Results"              value={formData.results} />
            <ReadOnlyField label="Criteria"             value={formData.criteria} />
            <ReadOnlyField label="Measuring Range"      value={formData.measuringRange} />
            <ReadOnlyField label="Calibration Range"    value={formData.calibrationRange} />
            <ReadOnlyField label="Accuracy"             value={formData.accuracy} />
            <ReadOnlyField label="Calibration Status"   value={formData.calibrationStatus} />
          </div>
        </div>
      )

      default: return null
    }
  }

  return (
    <FormLayout
      backLink="/checklist/machine"
      title="Edit Machine"
      subtitle={`Edit machine: ${formData.name || formData.machineCode}`}
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText="Update"
      cancelLink="/checklist/machine"
    >
      {renderStepContent()}
    </FormLayout>
  )
}