import { DatePickerField } from '@/components/form/DatePickerField'
import { FileUploadField } from '@/components/form/FileUploadField'
import { SingleSelectField } from '@/components/form/SingleSelectField'
import { TextField } from '@/components/form/TextField'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { ServerSingleSelect } from '@/components/select/server-single-select'
import { useTranslation } from '@/core/contexts/language-context'
import { api } from '@/core/interceptor/api.interceptor'
import type { ListResponse, MemberListDTO } from '@/core/types/common'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { InfoIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/checklist/machine/add')({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>) => ({
    refId: search.refId ? Number(search.refId) : undefined,
  }),
})

interface FileUploadResponse {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy?: string | null
}

interface AttachmentItem {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy: string | null
  category?: string | null
}

// ── FIX: typed ApiResponse เพื่อเช็ค success/error จาก backend ──────────────
interface ApiResponse<T = unknown> {
  code?: string
  success?: boolean
  message?: string
  data?: T
}

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

const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp']
const API_BASE   = import.meta.env.VITE_API_URL ?? ''

// ── FIX: helper — ตรวจสอบว่า response จาก backend สำเร็จจริง ─────────────────
// Backend return HTTP 200 เสมอ แต่แยก success/error ด้วย code หรือ success field
function isApiSuccess(resData: ApiResponse | null | undefined): boolean {
  if (!resData) return false
  // ถ้า backend ใช้ field "success"
  if (typeof resData.success === 'boolean') return resData.success
  // ถ้า backend ใช้ error code prefix (เช่น MS002, MS004 = error, MS001 = success)
  if (resData.code) {
    const errorCodes = ['MS002', 'MS004', 'MS006', 'MS007', 'MS008', 'MS009',
                        'MS010', 'MS011', 'MS012', 'MS013', 'MS014', 'MS016',
                        'MS018', 'MS019', 'MS020', 'MS030', 'MS032', 'MS041']
    return !errorCodes.includes(resData.code)
  }
  // fallback: ถ้าไม่มี code และไม่มี success field ให้ถือว่าสำเร็จ
  return true
}

function getApiErrorMessage(resData: ApiResponse | null | undefined): string {
  if (!resData) return 'Unknown error'
  return resData.message || resData.code || 'Unknown error'
}

function RouteComponent({ data }: any) {
  const navigate  = useNavigate()
  const { refId } = useSearch({ from: '/checklist/machine/add' })
  const { t }     = useTranslation('checklist')

  const [isSubmitting,     setIsSubmitting]     = useState(false)
  const [currentStep,      setCurrentStep]      = useState('general')
  const [errors,           setErrors]           = useState<Record<string, string>>({})
  const [isLoadingRefData, setIsLoadingRefData] = useState(false)

  const [cachedMachineGroups, setCachedMachineGroups] = useState<any[]>([])
  const [cachedMachineTypes,  setCachedMachineTypes]  = useState<any[]>([])
  const [cachedResponsible,   setCachedResponsible]   = useState<any[]>([])
  const [cachedSupervisor,    setCachedSupervisor]    = useState<any[]>([])
  const [cachedManager,       setCachedManager]       = useState<any[]>([])
  const cachedDepartments = useRef<Array<{ value: string; label: string; businessUnit: string }>>([])

  const [newImages,       setNewImages]       = useState<File[]>([])
  const [newInstructions, setNewInstructions] = useState<File[]>([])

  const [uploadedImages,       setUploadedImages]       = useState<FileUploadResponse[]>([])
  const [uploadedInstructions, setUploadedInstructions] = useState<FileUploadResponse[]>([])
  const [uploadedWarranty,     setUploadedWarranty]     = useState<FileUploadResponse[]>([])

  const [isUploadingImages,   setIsUploadingImages]   = useState(false)
  const [isUploadingInstr,    setIsUploadingInstr]    = useState(false)
  const [isUploadingWarranty, setIsUploadingWarranty] = useState(false)

  const [existingImages,       setExistingImages]       = useState<AttachmentItem[]>([])
  const [existingInstructions, setExistingInstructions] = useState<AttachmentItem[]>([])
  const [existingWarranty,     setExistingWarranty]     = useState<AttachmentItem[]>([])

  const [refWarranty, setRefWarranty] = useState<{
    hasWarranty: string; warrantyNote: string; warrantyExpireDate: string; files: AttachmentItem[]
  } | null>(null)

  const imageQueueRef    = useRef<Set<string>>(new Set())
  const instrQueueRef    = useRef<Set<string>>(new Set())
  const warrantyQueueRef = useRef<Set<string>>(new Set())
  const imageTimeoutRef    = useRef<NodeJS.Timeout | null>(null)
  const instrTimeoutRef    = useRef<NodeJS.Timeout | null>(null)
  const warrantyTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const uploadedImagesRef       = useRef<FileUploadResponse[]>([])
  const uploadedInstructionsRef = useRef<FileUploadResponse[]>([])
  const uploadedWarrantyRef     = useRef<FileUploadResponse[]>([])

  useEffect(() => { uploadedImagesRef.current       = uploadedImages },       [uploadedImages])
  useEffect(() => { uploadedInstructionsRef.current = uploadedInstructions }, [uploadedInstructions])
  useEffect(() => { uploadedWarrantyRef.current     = uploadedWarranty },     [uploadedWarranty])

  const formSteps: FormStep[] = [
    { id: 'general',     title: t('general'),    description: t('basic_information'),        required: true  },
    { id: 'maintenance', title: t('maintenance'), description: t('maintenance_information'),  required: false },
    { id: 'calibration', title: t('calibration'), description: t('calibration_information'), required: false },
  ]

  const machineStatusOptions     = [{ name: 'OPERATIONAL' }, { name: 'NON-OPERATIONAL' }, { name: 'UNDER REPAIR' }]
  const maintenanceOptions       = [{ name: '6 MONTH' }, { name: '3 MONTH' }]
  const resetPeriodOptions       = [{ name: 'WEEKLY' }, { name: 'MONTHLY' }, { name: 'EVERY 3 MONTHS' }]
  const resultOptions            = [{ name: 'PASS' }, { name: 'FAIL' }]
  const calibrationStatusOptions = [{ name: 'ON TIME' }, { name: 'OVERDUE' }]
  const yesNoOptions = [
    { value: 'YES', label: t('yes') },
    { value: 'NO',  label: t('no')  },
  ]

  const [formData, setFormData] = useState({
    name: data?.name || '', machineCode: data?.machineCode || '',
    brand: data?.brand || '', model: data?.model || '', serialNumber: data?.serialNumber || '',
    machineGroup: data?.machineGroup || '', machineGroupId: data?.machineGroupId || '',
    machineType: data?.machineType || '', machineTypeId: data?.machineTypeId || '',
    department: data?.department || '', businessUnit: data?.businessUnit || '',
    responsible: data?.responsible || '', responsibleName: data?.responsibleName || '',
    supervisor: data?.supervisor || '', supervisorName: data?.supervisorName || '',
    manager: data?.manager || '', managerName: data?.managerName || '',
    machineStatus: data?.machineStatus || '', resetPeriod: data?.resetPeriod || '',
    certificatePeriod: data?.certificatePeriod || '', registerId: data?.registerId || '',
    registerDate: data?.registerDate || '', maintenancePeriod: data?.maintenancePeriod || '',
    maintenance1: data?.maintenance1 || '', maintenance2: data?.maintenance2 || '',
    maintenance3: data?.maintenance3 || '', maintenance4: data?.maintenance4 || '',
    calibrationDueDate: data?.calibrationDueDate || '', certificateDate: data?.certificateDate || '',
    result: data?.result || '', criteria: data?.criteria || '',
    measuringRange: data?.measuringRange || '', accuracy: data?.accuracy || '',
    calibrationRange: data?.calibrationRange || '', calibrationStatus: data?.calibrationStatus || '',
    hasWarranty: data?.hasWarranty || '', warrantyNote: data?.warrantyNote || '',
    warrantyExpireDate: data?.warrantyExpireDate || '',
  })

  useEffect(() => { if (refId) fetchRegisterData(refId) }, [refId])
  useEffect(() => {
    fetchMachineGroup('')
    fetchResponsible('', 0)
    fetchSupervisor('', 0)
    fetchManager('', 0)
  }, [])
  useEffect(() => {
    const code = buildMachineCode()
    if (code) setFormData(prev => ({ ...prev, machineCode: code }))
  }, [formData.machineGroupId, formData.machineTypeId, formData.department])

  const toStr = (val: any): string => String(val ?? '').trim()

  const getDeptCode = (dept: any): string => {
    if (!dept) return ''
    if (Array.isArray(dept)) return toStr(dept[0])
    return toStr(dept)
  }

  const buildMachineCode = (
    groupId = formData.machineGroupId,
    typeId  = formData.machineTypeId,
    dept    = formData.department,
  ): string => {
    const deptCode = getDeptCode(dept)
    if (groupId && typeId && deptCode) return `${groupId}${typeId}-${deptCode}`
    return formData.machineCode
  }

  const uploadFile = async (file: File): Promise<FileUploadResponse> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post<{ data: FileUploadResponse }>('/api/files/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    return res.data
  }

  const handleFileUpload = async (
    files: File[],
    uploadedRef: React.MutableRefObject<FileUploadResponse[]>,
    setUploaded: React.Dispatch<React.SetStateAction<FileUploadResponse[]>>,
    queueRef: React.MutableRefObject<Set<string>>,
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
  ) => {
    const current  = uploadedRef.current
    const newFiles = files.filter(f => {
      const key = `${f.name}-${f.size}-${f.lastModified}`
      if (queueRef.current.has(key)) return false
      if (current.some(uf => uf.fileName?.includes(f.name))) return false
      queueRef.current.add(key); return true
    })
    if (!newFiles.length) return
    setUploading(true)
    try {
      const results: FileUploadResponse[] = []
      for (const file of newFiles) { try { results.push(await uploadFile(file)) } catch {} }
      if (results.length) { setUploaded(prev => [...prev, ...results]); toast.success(t('files_uploaded').replace('{count}', String(results.length))) }
    } catch { toast.error(t('failed_to_upload_files')) }
    finally { newFiles.forEach(f => queueRef.current.delete(`${f.name}-${f.size}-${f.lastModified}`)); setUploading(false) }
  }

  const handleImagesChange = (files: File[]) => {
    const realFiles = files.filter(f => f instanceof File)
    setNewImages(realFiles)
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current)
    imageTimeoutRef.current = setTimeout(() => {
      if (realFiles?.length && !isUploadingImages) handleFileUpload(realFiles, uploadedImagesRef, setUploadedImages, imageQueueRef, setIsUploadingImages)
    }, 100)
  }

  const handleDeleteImage = async (fileId: any) => {
    const existing = existingImages.find(u => u.fileName === fileId)
    if (existing) { setExistingImages(prev => prev.filter(u => u.fileName !== fileId)); return }
    const f = uploadedImages.find(u => u.fileName === fileId)
    if (!f) return
    try { await api.delete(`/api/files/delete/${f.fileName}`); setUploadedImages(prev => prev.filter(u => u.fileName !== f.fileName)); toast.success(t('file_deleted')) }
    catch { toast.error(t('failed_to_delete_file')) }
  }

  const handleInstructionsChange = (files: File[]) => {
    const realFiles = files.filter(f => f instanceof File)
    setNewInstructions(realFiles)
    if (instrTimeoutRef.current) clearTimeout(instrTimeoutRef.current)
    instrTimeoutRef.current = setTimeout(() => {
      if (realFiles?.length && !isUploadingInstr) handleFileUpload(realFiles, uploadedInstructionsRef, setUploadedInstructions, instrQueueRef, setIsUploadingInstr)
    }, 100)
  }

  const handleDeleteInstruction = async (fileId: any) => {
    const existing = existingInstructions.find(u => u.fileName === fileId)
    if (existing) { setExistingInstructions(prev => prev.filter(u => u.fileName !== fileId)); return }
    const f = uploadedInstructions.find(u => u.fileName === fileId)
    if (!f) return
    try { await api.delete(`/api/files/delete/${f.fileName}`); setUploadedInstructions(prev => prev.filter(u => u.fileName !== f.fileName)); toast.success(t('file_deleted')) }
    catch { toast.error(t('failed_to_delete_file')) }
  }

  const handleWarrantyChange = (files: File[]) => {
    const realFiles = files.filter(f => f instanceof File)
    if (warrantyTimeoutRef.current) clearTimeout(warrantyTimeoutRef.current)
    warrantyTimeoutRef.current = setTimeout(() => {
      if (realFiles?.length && !isUploadingWarranty) handleFileUpload(realFiles, uploadedWarrantyRef, setUploadedWarranty, warrantyQueueRef, setIsUploadingWarranty)
    }, 100)
  }

  const handleDeleteWarranty = async (fileId: any) => {
    const existing = existingWarranty.find(u => u.fileName === fileId)
    if (existing) { setExistingWarranty(prev => prev.filter(u => u.fileName !== fileId)); return }
    const f = uploadedWarranty.find(u => u.fileName === fileId)
    if (!f) return
    try { await api.delete(`/api/files/delete/${f.fileName}`); setUploadedWarranty(prev => prev.filter(u => u.fileName !== f.fileName)); toast.success(t('file_deleted')) }
    catch { toast.error(t('failed_to_delete_file')) }
  }

  const handleWarrantyToggle = (val: string) => {
    handleInputChange('hasWarranty', val)
    if (val === 'NO') { handleInputChange('warrantyNote', ''); handleInputChange('warrantyExpireDate', ''); setUploadedWarranty([]); setExistingWarranty([]) }
  }

  const handleDownloadFile = (file: { name?: string; fileName?: string }) => {
    const name = file?.fileName || file?.name
    if (name) window.open(`${API_BASE}/api/files/download/${name}`, '_blank')
    else toast.error(t('file_not_found'))
  }

  const existingImagesUploaded       = existingImages.map(f => ({ id: f.fileName, name: f.fileName, size: f.fileSize, url: f.fileUrl, type: f.fileType }))
  const existingInstructionsUploaded = existingInstructions.map(f => ({ id: f.fileName, name: f.fileName, size: f.fileSize, url: f.fileUrl, type: f.fileType }))
  const existingWarrantyUploaded     = existingWarranty.map(f => ({ id: f.fileName, name: f.fileName, size: f.fileSize, url: f.fileUrl, type: f.fileType }))

  // ─── Fetch register ────────────────────────────────────────────────────────
  const fetchRegisterData = async (id: number) => {
    try {
      setIsLoadingRefData(true)
      const response = await api.get<any>(`/api/register/${id}`)
      const d = response?.data
      if (!d) return

      let maintenancePeriod = ''
      let maintenance1 = '', maintenance2 = '', maintenance3 = '', maintenance4 = ''
      if (d.maintenance) {
        try {
          const items = typeof d.maintenance === 'string' ? JSON.parse(d.maintenance) : d.maintenance
          if (items?.length >= 4) maintenancePeriod = '3 MONTH'
          else if (items?.length >= 2) maintenancePeriod = '6 MONTH'
          if (items?.[0]?.dueDate) maintenance1 = items[0].dueDate.split('T')[0]
          if (items?.[1]?.dueDate) maintenance2 = items[1].dueDate.split('T')[0]
          if (items?.[2]?.dueDate) maintenance3 = items[2].dueDate.split('T')[0]
          if (items?.[3]?.dueDate) maintenance4 = items[3].dueDate.split('T')[0]
        } catch {}
      }

      let calibrationDueDate = '', certificateDate = ''
      let result = '', criteria = '', measuringRange = '', accuracy = '', calibrationRange = '', calibrationStatus = ''
      if (d.calibration) {
        try {
          const items = typeof d.calibration === 'string' ? JSON.parse(d.calibration) : d.calibration
          const c = items?.[0]
          if (c) {
            calibrationDueDate = c.dueDate?.split('T')[0]         ?? ''
            certificateDate    = c.certificateDate?.split('T')[0] ?? ''
            result = c.results ?? ''; criteria = c.criteria ?? ''; measuringRange = c.measuringRange ?? ''
            accuracy = c.accuracy ?? ''; calibrationRange = c.calibrationRange ?? ''; calibrationStatus = c.calibrationStatus ?? ''
          }
        } catch {}
      }

      if (d.attachment) {
        try {
          const files: AttachmentItem[] = typeof d.attachment === 'string' ? JSON.parse(d.attachment) : d.attachment
          setExistingImages(files.filter(f => IMAGE_EXTS.includes(f.fileType?.toLowerCase() ?? '')))
        } catch {}
      }
      if (d.workInstruction) {
        try {
          const files: AttachmentItem[] = typeof d.workInstruction === 'string' ? JSON.parse(d.workInstruction) : d.workInstruction
          setExistingInstructions(files)
        } catch {}
      }

      let warrantyFileItems: AttachmentItem[] = []
      if (d.warrantyFiles) {
        try { warrantyFileItems = typeof d.warrantyFiles === 'string' ? JSON.parse(d.warrantyFiles) : d.warrantyFiles } catch {}
      }
      if (warrantyFileItems.length) setExistingWarranty(warrantyFileItems)
      if (d.hasWarranty || warrantyFileItems.length) {
        setRefWarranty({ hasWarranty: d.hasWarranty || '', warrantyNote: d.warrantyNote || '', warrantyExpireDate: d.warrantyExpireDate ? d.warrantyExpireDate.split('T')[0] : '', files: warrantyFileItems })
      }

      let businessUnit = ''
      if (d.department) {
        try {
          const deptRes = await api.get<any>('/api/department/get/list', { params: { index: 0, size: 100 } })
          const found = (deptRes?.data || []).find((dept: any) => dept.departmentCode === d.department)
          businessUnit = found?.businessUnit || ''
        } catch {}
      }

      const supId = d.supervisorId ? String(d.supervisorId) : ''
      const mgrId = d.managerId    ? String(d.managerId)    : ''
      let supName = '', mgrName = ''
      if (supId || mgrId) {
        try {
          let supMembers = cachedSupervisor
          if (!supMembers.length) { const r = await fetchSupervisor('', 0); supMembers = r.data }
          let mgrMembers = cachedManager
          if (!mgrMembers.length) { const r = await fetchManager('', 0); mgrMembers = r.data }
          if (supId) supName = supMembers.find(m => String(m.value) === supId)?.fullName ?? ''
          if (mgrId) mgrName = mgrMembers.find(m => String(m.value) === mgrId)?.fullName ?? ''
        } catch {}
      }

      setFormData(prev => ({
        ...prev,
        name: d.machineName || '', brand: d.brand || '', model: d.model || '',
        serialNumber: d.serialNumber || '', department: d.department || '', businessUnit,
        responsible: d.responsibleId || '', responsibleName: d.responsibleName || '',
        supervisor: supId, supervisorName: supName,
        manager: mgrId,   managerName: mgrName,
        registerId: String(id), registerDate: new Date().toISOString().split('T')[0],
        maintenancePeriod, maintenance1, maintenance2, maintenance3, maintenance4,
        calibrationDueDate, certificateDate, result, criteria, measuringRange, accuracy, calibrationRange, calibrationStatus,
        hasWarranty: d.hasWarranty || '', warrantyNote: d.warrantyNote || '',
        warrantyExpireDate: d.warrantyExpireDate ? d.warrantyExpireDate.split('T')[0] : '',
      }))
      toast.success(t('register_data_loaded'))
    } catch { toast.error(t('failed_to_load_register')) }
    finally { setIsLoadingRefData(false) }
  }

  const validateRequiredFields = () => {
    const e: Record<string, string> = {}
    if (!formData.name.trim())             e.name          = t('machine_name_required')
    if (!formData.machineGroupId.trim())   e.machineGroup  = t('machine_group_required')
    if (!formData.machineTypeId.trim())    e.machineType   = t('machine_type_required')
    if (!getDeptCode(formData.department)) e.department    = t('department_required')
    if (!formData.machineStatus.trim())    e.machineStatus = t('machine_status_required')
    if (!formData.resetPeriod.trim())      e.resetPeriod   = t('reset_period_required')
    if (!buildMachineCode())               e.machineCode   = t('machine_code_required')
    // ── FIX: ตรวจ responsible ตรงนี้ด้วย เพื่อไม่ให้ผ่านไปถึง backend แล้ว fail ─
    if (!String(formData.responsible ?? '').trim()) e.responsible = t('responsible_required')
    if (!String(formData.hasWarranty ?? '').trim()) e.hasWarranty = t('has_warranty_required')
    if (formData.hasWarranty === 'YES' && !String(formData.warrantyNote ?? '').trim()) e.warrantyNote = t('warranty_note_required')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const isFormValid = () => {
    const base = !!(
      formData.name.trim() &&
      formData.machineGroupId.trim() &&
      formData.machineTypeId.trim() &&
      getDeptCode(formData.department) &&
      formData.machineStatus.trim() &&
      formData.resetPeriod.trim() &&
      String(formData.responsible ?? '').trim() &&   // ── FIX: เพิ่ม responsible
      String(formData.hasWarranty ?? '').trim()
    )
    if (formData.hasWarranty === 'YES') return base && !!String(formData.warrantyNote ?? '').trim()
    return base
  }

  const getStepStatus = (stepId: string): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId !== 'general') return 'empty'
    const hasErrors = Object.keys(errors).some(k =>
      ['name', 'machineStatus', 'department', 'machineType', 'machineGroup',
       'machineCode', 'resetPeriod', 'responsible', 'hasWarranty', 'warrantyNote'].includes(k))
    if (hasErrors) return 'error'
    return isFormValid() ? 'complete' : 'incomplete'
  }

  const formatDateToISO = (s: string) => {
    if (!s) return null
    try { return new Date(s).toISOString() } catch { return null }
  }

  const buildMachineDTO = () => {
    const deptCode    = getDeptCode(formData.department)
    const machineCode = buildMachineCode()
    const calibrationDTO = formData.calibrationDueDate ? {
      machineName: formData.name, dueDate: formatDateToISO(formData.calibrationDueDate),
      certificateDate: formatDateToISO(formData.certificateDate),
      results: formData.result || null, criteria: formData.criteria || null,
      measuringRange: formData.measuringRange || null, accuracy: formData.accuracy || null,
      calibrationRange: formData.calibrationRange || null, calibrationStatus: formData.calibrationStatus || null,
    } : null
    const rounds = formData.maintenancePeriod === '3 MONTH' ? 4 : formData.maintenancePeriod === '6 MONTH' ? 2 : 0
    const maintenanceList: any[] = []
    for (let i = 1; i <= rounds; i++) {
      const dateValue = (formData as any)[`maintenance${i}`]
      if (!dateValue) continue
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue as Date
      maintenanceList.push({
        machineName: formData.name, years: date.getFullYear().toString(), round: i,
        dueDate: formatDateToISO(date.toISOString()), status: 'On Time',
        planDate: null, resultDate: null, maintenanceBy: null, note: null, attachment: null,
      })
    }
    const allImgFiles      = [...existingImages, ...uploadedImages].map(f => ({ fileName: f.fileName, fileUrl: f.fileUrl, fileType: f.fileType, fileSize: f.fileSize, uploadedBy: (f as any).uploadedBy ?? null }))
    const allInstrFiles    = [...existingInstructions, ...uploadedInstructions].map(f => ({ fileName: f.fileName, fileUrl: f.fileUrl, fileType: f.fileType, fileSize: f.fileSize, uploadedBy: (f as any).uploadedBy ?? null }))
    const allWarrantyFiles = [...existingWarranty, ...uploadedWarranty].map(f => ({ fileName: f.fileName, fileUrl: f.fileUrl, fileType: f.fileType, fileSize: f.fileSize, uploadedBy: (f as any).uploadedBy ?? null, category: 'WARRANTY' }))

    // ── FIX: แปลง responsible เป็น number ก่อนส่ง ─────────────────────────────
    const responsiblePersonId = formData.responsible ? Number(formData.responsible) : null
    const supervisorId        = formData.supervisor  ? Number(formData.supervisor)  : null
    const managerId           = formData.manager     ? Number(formData.manager)     : null

    return {
      machineName: formData.name, machineCode,
      brand: formData.brand || null, model: formData.model || null, serialNumber: formData.serialNumber || null,
      department: deptCode || null, businessUnit: formData.businessUnit || null, isCalibration: !!calibrationDTO,
      responsiblePersonId,                                        // ← Long ไม่ใช่ string
      responsiblePersonName: formData.responsibleName || null,
      supervisorId,                                               // ← Long
      supervisorName: formData.supervisorName || null,
      managerId,                                                  // ← Long
      managerName: formData.managerName || null,
      machineStatus: formData.machineStatus || null, machineGroupId: formData.machineGroupId || null,
      groups: formData.machineGroup || null, machineTypeId: formData.machineTypeId || null,
      machineTypeName: formData.machineType || null, maintenancePeriod: formData.maintenancePeriod || null,
      certificatePeriod: formData.certificatePeriod || null, resetPeriod: formData.resetPeriod || null,
      registerId: formData.registerId || null, registerDate: formatDateToISO(formData.registerDate),
      calibration: calibrationDTO, maintenanceList: maintenanceList.length ? maintenanceList : null,
      image: allImgFiles.length ? JSON.stringify(allImgFiles) : null,
      workInstruction: allInstrFiles.length ? JSON.stringify(allInstrFiles) : null,
      note: refId ? `REF:REGISTER-${refId}` : null,
      hasWarranty: formData.hasWarranty || null,
      warrantyNote: formData.hasWarranty === 'YES' ? (formData.warrantyNote || null) : null,
      warrantyExpireDate: formData.hasWarranty === 'YES' ? formatDateToISO(formData.warrantyExpireDate) : null,
      warrantyFiles: formData.hasWarranty === 'YES' && allWarrantyFiles.length ? JSON.stringify(allWarrantyFiles) : null,
    }
  }

  // ── FIX: handleSubmit เช็ค response จาก backend ก่อนแสดง success ────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateRequiredFields()) {
      setCurrentStep('general')
      toast.error(t('fill_required_fields'))
      return
    }
    setIsSubmitting(true)
    try {
      const response = await api.post<ApiResponse>('/api/machine/create', buildMachineDTO())
      const resData  = response?.data

      // ── เช็คว่า backend ตอบกลับ error จริงหรือไม่ ─────────────────────────
      if (!isApiSuccess(resData)) {
        toast.error(t('failed_to_create_machine'), {
          description: getApiErrorMessage(resData),
        })
        return
      }

      // ── สำเร็จจริง: sync to lark แล้ว navigate ──────────────────────────
      const savedId = (resData as any)?.id ?? (resData as any)?.data?.id
      if (savedId) {
        try { await api.post(`/api/machine/${savedId}/sync-to-lark`) } catch {}
      }
      toast.success(t('machine_created'))
      setTimeout(() => navigate(
        refId
          ? { to: '/checklist/register/view', search: { id: refId } }
          : { to: '/checklist/machine' }
      ), 1000)
    } catch (error: any) {
      // ── HTTP error (4xx / 5xx) ─────────────────────────────────────────────
      const serverMsg = error?.response?.data?.message || error?.response?.data?.code || error?.message
      toast.error(t('failed_to_create_machine'), { description: serverMsg })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) { const e = { ...errors }; delete e[field]; setErrors(e) }
  }

  const fetchMachineGroup = async (keyword: string) => {
    try {
      const params: any = {}
      if (keyword.trim()) params.keyword = keyword.trim()
      const response = await api.get<any>('/api/type/groups/distinct', { params })
      const arr: any[] = Array.isArray(response) ? response : Object.values(response).filter(v => v && typeof v === 'object' && 'machineGroupId' in (v as any))
      const data = arr.filter(i => i?.machineGroupId && i?.machineGroupName?.trim())
        .map(i => ({ label: i.machineGroupName, value: String(i.machineGroupId), id: String(i.machineGroupId) }))
        .sort((a, b) => a.id.localeCompare(b.id))
      setCachedMachineGroups(data)
      return { data, hasMore: false }
    } catch { toast.error(t('data_fetch_failed')); return { data: [], hasMore: false } }
  }

  const fetchMachineTypeByGroup = async (groupId: string) => {
    if (!groupId) return { data: [], hasMore: false }
    try {
      const response = await api.get<any>('/api/type/types/by-group', { params: { machineGroupId: groupId, index: 0, size: 100 } })
      const arr: any[] = Array.isArray(response?.data) ? response.data : []
      const data = arr.filter(i => i?.machineTypeId && i?.machineTypeName?.trim())
        .map(i => ({ label: i.machineTypeName, value: String(i.machineTypeId), id: String(i.machineTypeId), groupId: String(i.machineGroupId) }))
        .sort((a, b) => a.id.localeCompare(b.id))
      setCachedMachineTypes(data)
      return { data, hasMore: false }
    } catch { toast.error(t('data_fetch_failed')); return { data: [], hasMore: false } }
  }

  const fetchMachineType = async (keyword: string, _index: number) => {
    const result = await fetchMachineTypeByGroup(formData.machineGroupId)
    if (keyword.trim()) return { data: result.data.filter(i => i.label.toLowerCase().includes(keyword.toLowerCase())), hasMore: false }
    return result
  }

  const changeMachineGroup = async (val: any) => {
    const value = toStr(val)
    if (!value) { setFormData(prev => ({ ...prev, machineGroup: '', machineGroupId: '', machineType: '', machineTypeId: '', machineCode: '' })); setCachedMachineTypes([]); return }
    let groups = cachedMachineGroups
    if (!groups.length) { const r = await fetchMachineGroup(''); groups = r.data }
    const group = groups.find(g => g.value === value)
    if (group) { setFormData(prev => ({ ...prev, machineGroup: group.label, machineGroupId: group.value, machineType: '', machineTypeId: '', machineCode: '' })); setCachedMachineTypes([]); await fetchMachineTypeByGroup(group.value) }
  }

  const changeMachineType = async (val: any) => {
    const id = toStr(val)
    if (!id) { setFormData(prev => ({ ...prev, machineType: '', machineTypeId: '', machineCode: '' })); return }
    const gid = formData.machineGroupId
    let types = cachedMachineTypes.filter(t => t.groupId === gid)
    if (!types.length) { const r = await fetchMachineTypeByGroup(gid); types = r.data }
    const found = types.find(t => t.value === id)
    if (found) setFormData(prev => ({ ...prev, machineType: found.label, machineTypeId: id }))
    else setFormData(prev => ({ ...prev, machineType: '', machineTypeId: '' }))
  }

  const fetchDepartments = async (keyword: string, index: number) => {
    try {
      const params: any = { index, size: 20 }
      if (keyword.trim()) params.keyword = keyword.trim()
      const r = await api.get<any>('/api/department/get/list', { params })
      const mapped = (r.data || []).map((d: any) => ({ label: d.division ? `${d.department} - ${d.division}` : d.department, value: d.departmentCode, businessUnit: d.businessUnit || '' }))
      cachedDepartments.current = mapped
      return { data: mapped, hasMore: r.hasMore || false }
    } catch { toast.error(t('data_fetch_failed')); return { data: [], hasMore: false } }
  }

  const fetchMembers = async (keyword: string, index: number) => {
    const params: any = { index, size: 100 }
    if (keyword.trim()) params.keyword = keyword.trim()
    const r = await api.get<ListResponse<MemberListDTO>>('/api/user/get/list', { params })
    return r.data.map(m => ({ label: `${m.firstName} ${m.lastName}`, value: String(m.id || ''), fullName: `${m.firstName} ${m.lastName}` }))
  }

  const fetchResponsible = async (kw: string, idx: number) => {
    try { const d = await fetchMembers(kw, idx); setCachedResponsible(d); return { data: d, hasMore: false } }
    catch { toast.error(t('data_fetch_failed')); return { data: [], hasMore: false } }
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
    (val: any) => {
      const value = toStr(val)
      if (!value) { setFormData(prev => ({ ...prev, [field]: '', [nameField]: '' })); return }
      const found = cache.find(r => String(r.value) === value)
      if (found) setFormData(prev => ({ ...prev, [field]: value, [nameField]: found.fullName }))
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
      const supName = supMembers.find(m => String(m.value) === supId)?.fullName ?? ''
      const mgrName = mgrMembers.find(m => String(m.value) === mgrId)?.fullName ?? ''
      setFormData(prev => ({ ...prev, supervisor: supId, supervisorName: supName, manager: mgrId, managerName: mgrName }))
    } catch {}
    if (errors.responsible) { const e = { ...errors }; delete e.responsible; setErrors(e) }
  }

  const renderStepContent = () => {
    if (isLoadingRefData) return (
      <div className="px-2 pt-2 space-y-4">
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      </div>
    )

    switch (currentStep) {
      case 'general': return (
        <div className="px-2 pt-2 space-y-4">
          {refId && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-700 dark:text-blue-200">
                <InfoIcon className="inline mr-2" />
                {t('creating_from_register').replace('{id}', String(refId))}
              </p>
            </div>
          )}

          <TextField id="name" label={t('name')} value={formData.name}
            onChange={v => handleInputChange('name', v)} error={errors.name} required />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField id="machineCode" label={t('machine_code')} value={buildMachineCode()} onChange={() => {}} placeholder={t('auto_generated')} error={errors.machineCode} />
            <TextField id="serialNumber" label={t('serial_number')} value={formData.serialNumber} onChange={v => handleInputChange('serialNumber', v)} />
            <TextField id="brand" label={t('brand')} value={formData.brand} onChange={v => handleInputChange('brand', v)} />
            <TextField id="model" label={t('model')} value={formData.model} onChange={v => handleInputChange('model', v)} />

            <ServerSingleSelect key={`mg-${formData.machineGroupId || 'e'}`}
              id="machineGroup" title="group" label={t('machine_group')}
              placeholder={t('select_machine_group')} value={formData.machineGroupId}
              onChange={changeMachineGroup} fetchOptions={fetchMachineGroup} error={errors.machineGroup} required />

            {formData.machineGroupId ? (
              <ServerSingleSelect key={`mt-${formData.machineGroupId}-${formData.machineTypeId || 'e'}`}
                id="machineType" title="type" label={t('machine_type')}
                placeholder={t('select_machine_type')} value={formData.machineTypeId}
                onChange={changeMachineType} fetchOptions={fetchMachineType} error={errors.machineType} required />
            ) : (
              <div className="flex flex-col gap-2">
                <label className="text-sm text-gray-700">{t('machine_type')} <span className="text-red-500">*</span></label>
                <div className="p-3 bg-gray-50 border border-gray-300 rounded-lg text-gray-500 text-sm">{t('please_select_machine_group')}</div>
              </div>
            )}

            <ServerSingleSelect id="department-select" title="department"
              label={t('select_department')} placeholder={t('select_department')} value={formData.department}
              onChange={(val) => {
                const code = toStr(val)
                const found = cachedDepartments.current.find(d => d.value === code)
                setFormData(prev => ({ ...prev, department: code, businessUnit: found?.businessUnit || prev.businessUnit }))
                if (errors.department) { const e = { ...errors }; delete e.department; setErrors(e) }
              }}
              fetchOptions={fetchDepartments} error={errors.department} required />

            {/* ── FIX: เพิ่ม error และ required ให้ responsible ─────────────── */}
            <ServerSingleSelect key={`resp-${formData.responsible || 'e'}`}
              id="responsible" title="responsible" label={t('responsible')}
              placeholder={t('select_responsible')} value={formData.responsible}
              initialLabel={formData.responsibleName}
              onChange={handleResponsibleChange} fetchOptions={fetchResponsible}
              error={errors.responsible} required />

            <ReadOnlyField label={t('supervisor')} value={formData.supervisorName} />
            <ReadOnlyField label={t('manager')}    value={formData.managerName} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SingleSelectField id="machineStatus" label={t('machine_status')} value={[formData.machineStatus]}
              onChange={v => handleInputChange('machineStatus', v[0] || '')}
              options={machineStatusOptions.map(s => ({ value: s.name, label: s.name }))} error={errors.machineStatus} required />
            <SingleSelectField id="resetPeriod" label={t('reset_period')} value={[formData.resetPeriod]}
              onChange={v => handleInputChange('resetPeriod', v[0] || '')}
              options={resetPeriodOptions.map(r => ({ value: r.name, label: r.name }))} error={errors.resetPeriod} required />
            <TextField id="certificatePeriod" label={t('certificate_period')} value={formData.certificatePeriod} onChange={v => handleInputChange('certificatePeriod', v)} />
            {refId && <TextField id="registerDate" label={t('register_date')} value={formData.registerDate} onChange={() => {}} />}
          </div>

          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <p className="text-sm font-semibold">{t('warranty')}</p>
            <SingleSelectField id="hasWarranty" label={t('has_warranty')} value={[formData.hasWarranty]}
              onChange={v => handleWarrantyToggle(v[0] || '')} options={yesNoOptions} error={errors.hasWarranty} />
            {formData.hasWarranty === 'YES' && (
              <>
                <TextField id="warrantyNote" label={t('warranty_note')} value={formData.warrantyNote}
                  onChange={v => handleInputChange('warrantyNote', v)} error={errors.warrantyNote} required />
                <DatePickerField id="warrantyExpireDate" label={t('warranty_expire_date')} value={formData.warrantyExpireDate} onChange={d => handleInputChange('warrantyExpireDate', d)} />
                <FileUploadField id="warranty-docs" label={t('warranty_documents')} maxFiles={10} value={[]}
                  uploadedFiles={[...existingWarrantyUploaded, ...uploadedWarranty.map(f => ({ id: f.fileName, name: f.fileName, size: f.fileSize, url: f.fileUrl, type: f.fileType }))]}
                  onChange={handleWarrantyChange} onDownloadFile={f => handleDownloadFile(f)} onDeleteUploadedFile={handleDeleteWarranty}
                  onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })} />
              </>
            )}
          </div>

          <FileUploadField id="machine-images" label={t('images')} maxFiles={10} value={newImages}
            uploadedFiles={[...existingImagesUploaded, ...uploadedImages.map(f => ({ id: f.fileName, name: f.fileName, size: f.fileSize, url: f.fileUrl, type: f.fileType }))]}
            onChange={handleImagesChange} onDownloadFile={f => handleDownloadFile(f)} onDeleteUploadedFile={handleDeleteImage}
            onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })} />

          <FileUploadField id="machine-instructions" label={t('work_instructions')} maxFiles={10} value={newInstructions}
            uploadedFiles={[...existingInstructionsUploaded, ...uploadedInstructions.map(f => ({ id: f.fileName, name: f.fileName, size: f.fileSize, url: f.fileUrl, type: f.fileType }))]}
            onChange={handleInstructionsChange} onDownloadFile={f => handleDownloadFile(f)} onDeleteUploadedFile={handleDeleteInstruction}
            onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })} />
        </div>
      )

      case 'maintenance': return (
        <div className="px-2 pt-2 space-y-4">
          <SingleSelectField id="maintenancePeriod" label={t('maintenance_period')} value={[formData.maintenancePeriod]}
            onChange={v => handleInputChange('maintenancePeriod', v[0] || '')}
            options={maintenanceOptions.map(m => ({ value: m.name, label: m.name }))} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <DatePickerField id="maintenance1" label={t('round_1')} value={formData.maintenance1} onChange={d => handleInputChange('maintenance1', d)} />
            <DatePickerField id="maintenance2" label={t('round_2')} value={formData.maintenance2} onChange={d => handleInputChange('maintenance2', d)} />
          </div>
          {formData.maintenancePeriod === '3 MONTH' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <DatePickerField id="maintenance3" label={t('round_3')} value={formData.maintenance3} onChange={d => handleInputChange('maintenance3', d)} />
              <DatePickerField id="maintenance4" label={t('round_4')} value={formData.maintenance4} onChange={d => handleInputChange('maintenance4', d)} />
            </div>
          )}
        </div>
      )

      case 'calibration': return (
        <div className="px-2 pt-2 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePickerField id="calibrationDueDate" label={t('calibration_due_date')} value={formData.calibrationDueDate} onChange={d => handleInputChange('calibrationDueDate', d)} />
            <DatePickerField id="certificateDate"    label={t('certificate_date')}     value={formData.certificateDate}    onChange={d => handleInputChange('certificateDate', d)} />
            <SingleSelectField id="result" label={t('results')} value={[formData.result]}
              onChange={v => handleInputChange('result', v[0] || '')} options={resultOptions.map(r => ({ value: r.name, label: r.name }))} />
            <TextField id="criteria"         label={t('criteria')}          value={formData.criteria}         onChange={v => handleInputChange('criteria', v)} />
            <TextField id="measuringRange"   label={t('measuring_range')}   value={formData.measuringRange}   onChange={v => handleInputChange('measuringRange', v)} />
            <TextField id="calibrationRange" label={t('calibration_range')} value={formData.calibrationRange} onChange={v => handleInputChange('calibrationRange', v)} />
            <TextField id="accuracy"         label={t('accuracy')}          value={formData.accuracy}         onChange={v => handleInputChange('accuracy', v)} />
            <SingleSelectField id="calibrationStatus" label={t('calibration_status')} value={[formData.calibrationStatus]}
              onChange={v => handleInputChange('calibrationStatus', v[0] || '')} options={calibrationStatusOptions.map(cs => ({ value: cs.name, label: cs.name }))} />
          </div>
        </div>
      )

      default: return null
    }
  }

  return (
    <FormLayout
      backLink={refId ? '/checklist/register' : '/checklist/machine'}
      title={refId ? t('add_machine_from_register') : t('add_new_machine')}
      subtitle={refId ? t('creating_machine_linked').replace('{id}', String(refId)) : t('create_new_machine_record')}
      onSubmit={handleSubmit} steps={formSteps} currentStep={currentStep}
      onStepChange={setCurrentStep} getStepStatus={getStepStatus}
      isSubmitting={isSubmitting} isFormValid={isFormValid()}
      submitText={data ? t('update') : t('submit')}
      cancelLink={refId ? '/checklist/register' : '/checklist/machine'}
    >
      {renderStepContent()}
    </FormLayout>
  )
}