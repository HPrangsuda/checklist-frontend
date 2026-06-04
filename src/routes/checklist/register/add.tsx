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
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/checklist/register/add')({
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

function RouteComponent({ data }: any) {
  const navigate  = useNavigate()
  const { refId } = useSearch({ from: '/checklist/register/add' })
  const { t }     = useTranslation('checklist')

  const [isSubmitting,     setIsSubmitting]     = useState(false)
  const [currentStep,      setCurrentStep]      = useState('general')
  const [errors,           setErrors]           = useState<Record<string, string>>({})
  const [isLoadingRefData, setIsLoadingRefData] = useState(false)

  const [cachedResponsible, setCachedResponsible] = useState<any[]>([])
  const [cachedSupervisor,  setCachedSupervisor]  = useState<any[]>([])
  const [cachedManager,     setCachedManager]     = useState<any[]>([])
  const cachedDepartments = useRef<Array<{ value: string; label: string; businessUnit: string }>>([])

  // ── file states: แยก 3 bucket ────────────────────────────────────────────
  const [uploadedImages,       setUploadedImages]       = useState<FileUploadResponse[]>([])
  const [uploadedInstructions, setUploadedInstructions] = useState<FileUploadResponse[]>([])
  const [uploadedWarranty,     setUploadedWarranty]     = useState<FileUploadResponse[]>([])

  const [isUploadingImages,   setIsUploadingImages]   = useState(false)
  const [isUploadingInstr,    setIsUploadingInstr]    = useState(false)
  const [isUploadingWarranty, setIsUploadingWarranty] = useState(false)

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

  const maintenanceOptions       = [{ name: '6 MONTH' }, { name: '3 MONTH' }]
  const resultOptions            = [{ name: 'PASS' }, { name: 'FAIL' }]
  const calibrationStatusOptions = [{ name: 'ON TIME' }, { name: 'OVERDUE' }]
  const yesNoOptions = [
    { value: 'YES', label: t('yes') },
    { value: 'NO',  label: t('no')  },
  ]

  const [formData, setFormData] = useState({
    name:                data?.name                || '',
    brand:               data?.brand               || '',
    model:               data?.model               || '',
    serialNumber:        data?.serialNumber        || '',
    department:          data?.department          || '',
    businessUnit:        data?.businessUnit        || '',
    responsible:         data?.responsible         || '',
    responsibleName:     data?.responsibleName     || '',
    supervisor:          data?.supervisor          || '',
    supervisorName:      data?.supervisorName      || '',
    manager:             data?.manager             || '',
    managerName:         data?.managerName         || '',
    maintenancePeriod:   data?.maintenancePeriod   || '',
    maintenance1:        data?.maintenance1        || '',
    maintenance2:        data?.maintenance2        || '',
    maintenance3:        data?.maintenance3        || '',
    maintenance4:        data?.maintenance4        || '',
    externalCalibration: data?.externalCalibration || '',
    calibrationDueDate:  data?.calibrationDueDate  || '',
    certificateDate:     data?.certificateDate     || '',
    result:              data?.result              || '',
    criteria:            data?.criteria            || '',
    measuringRange:      data?.measuringRange      || '',
    accuracy:            data?.accuracy            || '',
    calibrationRange:    data?.calibrationRange    || '',
    calibrationStatus:   data?.calibrationStatus   || '',
    price:               data?.price               || '',
    quantity:            data?.quantity            || '',
    watt:                data?.watt                || '',
    horsePower:          data?.horsePower          || '',
    note:                data?.note                || '',
    // ── warranty ────────────────────────────────────────────────────────────
    hasWarranty:        data?.hasWarranty        || '',
    warrantyNote:       data?.warrantyNote       || '',
    warrantyExpireDate: data?.warrantyExpireDate || '',
  })

  useEffect(() => { if (refId) fetchRegisterData(refId) }, [refId])
  useEffect(() => {
    fetchResponsible('', 0)
    fetchSupervisor('', 0)
    fetchManager('', 0)
  }, [])

  const toStr = (val: any): string => String(val ?? '').trim()

  const getDeptCode = (dept: any): string => {
    if (!dept) return ''
    if (Array.isArray(dept)) return toStr(dept[0])
    return toStr(dept)
  }

  // ─── File upload core ──────────────────────────────────────────────────────
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
    const current = uploadedRef.current
    const newFiles = files.filter(f => {
      const key = `${f.name}-${f.size}-${f.lastModified}`
      if (queueRef.current.has(key)) return false
      if (current.some(uf => uf.fileName.includes(f.name))) return false
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

  // ─── Image handlers ────────────────────────────────────────────────────────
  const handleImagesChange = (files: File[]) => {
    if (imageTimeoutRef.current) clearTimeout(imageTimeoutRef.current)
    imageTimeoutRef.current = setTimeout(() => {
      if (files?.length && !isUploadingImages)
        handleFileUpload(files, uploadedImagesRef, setUploadedImages, imageQueueRef, setIsUploadingImages)
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

  // ─── Instruction handlers ──────────────────────────────────────────────────
  const handleInstructionsChange = (files: File[]) => {
    if (instrTimeoutRef.current) clearTimeout(instrTimeoutRef.current)
    instrTimeoutRef.current = setTimeout(() => {
      if (files?.length && !isUploadingInstr)
        handleFileUpload(files, uploadedInstructionsRef, setUploadedInstructions, instrQueueRef, setIsUploadingInstr)
    }, 100)
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

  // ─── Warranty handlers ─────────────────────────────────────────────────────
  const handleWarrantyChange = (files: File[]) => {
    if (warrantyTimeoutRef.current) clearTimeout(warrantyTimeoutRef.current)
    warrantyTimeoutRef.current = setTimeout(() => {
      if (files?.length && !isUploadingWarranty)
        handleFileUpload(files, uploadedWarrantyRef, setUploadedWarranty, warrantyQueueRef, setIsUploadingWarranty)
    }, 100)
  }

  const handleDeleteWarranty = async (fileId: any) => {
    const f = uploadedWarranty.find(u => u.fileName === fileId || u.fileName.includes(fileId))
    if (!f) return
    try {
      await api.delete(`/api/files/delete/${f.fileName}`)
      setUploadedWarranty(prev => prev.filter(u => u.fileName !== f.fileName))
      toast.success(t('file_deleted'))
    } catch { toast.error(t('failed_to_delete_file')) }
  }

  const handleWarrantyToggle = (val: string) => {
    handleInputChange('hasWarranty', val)
    if (val === 'NO') {
      handleInputChange('warrantyNote', '')
      handleInputChange('warrantyExpireDate', '')
      setUploadedWarranty([])
    }
  }

  const handleDownloadFile = (file: any) => {
    const name = file?.fileName || file?.name
    if (name) window.open(`${import.meta.env.VITE_API_URL}/api/files/download/${name}`, '_blank')
    else toast.error(t('file_not_found'))
  }

  // ─── Fetch register ────────────────────────────────────────────────────────
  const fetchRegisterData = async (id: number) => {
    try {
      setIsLoadingRefData(true)
      const response = await api.get<any>(`/api/register/${id}`)
      const d = response?.data
      if (!d) return
      let businessUnit = ''
      if (d.department) {
        try {
          const deptRes = await api.get<any>('/api/department/get/list', { params: { index: 0, size: 100 } })
          const found = (deptRes?.data || []).find((dept: any) => dept.departmentCode === d.department)
          businessUnit = found?.businessUnit || ''
        } catch {}
      }
      setFormData(prev => ({
        ...prev,
        name:         d.machineName  || '',
        brand:        d.brand        || '',
        model:        d.model        || '',
        serialNumber: d.serialNumber || '',
        price:        d.price        ? String(d.price)      : '',
        quantity:     d.quantity     ? String(d.quantity)   : '',
        watt:         d.watt         ? String(d.watt)       : '',
        horsePower:   d.horsePower   ? String(d.horsePower) : '',
        note:         d.note         || '',
        department:   d.department   || '',
        businessUnit,
        responsible:     d.responsibleId   || '',
        responsibleName: d.responsibleName || '',
        supervisor:      d.supervisorId    || '',
        supervisorName:  d.supervisorName  || '',
        manager:         d.managerId       || '',
        managerName:     d.managerName     || '',
        hasWarranty:        d.hasWarranty        || '',
        warrantyNote:       d.warrantyNote       || '',
        warrantyExpireDate: d.warrantyExpireDate
          ? d.warrantyExpireDate.split('T')[0] : '',
      }))
      toast.success(t('register_data_loaded'))
    } catch {
      toast.error(t('failed_to_load_register'))
    } finally {
      setIsLoadingRefData(false)
    }
  }

  // ─── Validation ────────────────────────────────────────────────────────────
  const validateRequiredFields = () => {
    const e: Record<string, string> = {}
    if (!String(formData.name         ?? '').trim()) e.name         = t('machine_name_required')
    if (!getDeptCode(formData.department))            e.department   = t('department_required')
    if (!String(formData.responsible  ?? '').trim()) e.responsible  = t('responsible_required')
    if (!String(formData.quantity     ?? '').trim()) e.quantity     = t('quantity_required')
    if (!String(formData.serialNumber ?? '').trim()) e.serialNumber = t('serial_number_required')
    if (!String(formData.hasWarranty  ?? '').trim()) e.hasWarranty  = t('has_warranty_required')
    if (formData.hasWarranty === 'YES' && !String(formData.warrantyNote ?? '').trim()) {
      e.warrantyNote = t('warranty_note_required')
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const isFormValid = () => {
    const base = !!(
      String(formData.name         ?? '').trim() &&
      getDeptCode(formData.department)            &&
      String(formData.responsible  ?? '').trim() &&
      String(formData.quantity     ?? '').trim() &&
      String(formData.serialNumber ?? '').trim() &&
      String(formData.hasWarranty  ?? '').trim()
    )
    if (formData.hasWarranty === 'YES') {
      return base && !!String(formData.warrantyNote ?? '').trim()
    }
    return base
  }

  const getStepStatus = (stepId: string): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId !== 'general') return 'empty'
    const hasErrors = Object.keys(errors).some(k =>
      ['name', 'department', 'responsible', 'quantity', 'serialNumber',
       'hasWarranty', 'warrantyNote'].includes(k)
    )
    if (hasErrors) return 'error'
    return isFormValid() ? 'complete' : 'incomplete'
  }

  // ─── Build DTO ─────────────────────────────────────────────────────────────
  const formatDateToISO = (s: string) => {
    if (!s) return null
    try {
      const date = new Date(s)
      const offset = 7 * 60
      const local = new Date(date.getTime() - (date.getTimezoneOffset() + offset) * -60000)
      return local.toISOString()
    } catch { return null }
  }

  const buildRegisterDTO = () => {
    const attachments = uploadedImages.map(f => ({
      fileName: f.fileName, fileUrl: f.fileUrl,
      fileType: f.fileType, fileSize: f.fileSize,
      uploadedBy: f.uploadedBy ?? null,
    }))
    const workInstructions = uploadedInstructions.map(f => ({
      fileName: f.fileName, fileUrl: f.fileUrl,
      fileType: f.fileType, fileSize: f.fileSize,
      uploadedBy: f.uploadedBy ?? null,
    }))
    const warrantyFiles = uploadedWarranty.map(f => ({
      fileName: f.fileName, fileUrl: f.fileUrl,
      fileType: f.fileType, fileSize: f.fileSize,
      uploadedBy: f.uploadedBy ?? null,
      category: 'WARRANTY',
    }))

    const calibration = formData.calibrationDueDate ? [{
      externalCalibrationDate: formatDateToISO(formData.externalCalibration),
      dueDate:           formatDateToISO(formData.calibrationDueDate),
      certificateDate:   formatDateToISO(formData.certificateDate),
      results:           formData.result           || null,
      criteria:          formData.criteria         || null,
      measuringRange:    formData.measuringRange    || null,
      accuracy:          formData.accuracy          || null,
      calibrationRange:  formData.calibrationRange  || null,
      calibrationStatus: formData.calibrationStatus || null,
    }] : null

    const rounds = formData.maintenancePeriod === '3 MONTH' ? 4
                 : formData.maintenancePeriod === '6 MONTH' ? 2 : 0
    const maintenance: any[] = []
    for (let i = 1; i <= rounds; i++) {
      const dateValue = (formData as any)[`maintenance${i}`]
      if (!dateValue) continue
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue as Date
      maintenance.push({
        years: date.getFullYear().toString(), round: i,
        dueDate: formatDateToISO(date.toISOString()), status: 'On Time',
        planDate: null, resultDate: null, maintenanceBy: null, note: null, attachment: null,
      })
    }

    return {
      machineName:      formData.name,
      brand:            formData.brand        || null,
      model:            formData.model        || null,
      serialNumber:     formData.serialNumber || null,
      price:            formData.price        ? Number(formData.price)      : null,
      quantity:         formData.quantity     ? Number(formData.quantity)   : null,
      watt:             formData.watt         ? Number(formData.watt)       : null,
      horsePower:       formData.horsePower   ? Number(formData.horsePower) : null,
      department:       getDeptCode(formData.department) || null,
      responsibleId:    formData.responsible  || null,
      supervisorId:     formData.supervisor   || null,
      managerId:        formData.manager      || null,
      note:             formData.note         || null,
      attachments:      attachments.length     ? attachments     : null,
      workInstructions: workInstructions.length ? workInstructions : null,
      warrantyFiles:    formData.hasWarranty === 'YES' && warrantyFiles.length
                          ? warrantyFiles : null,
      maintenance:      maintenance.length     ? maintenance     : null,
      calibration,
      hasWarranty:        formData.hasWarranty || null,
      warrantyNote:       formData.hasWarranty === 'YES' ? (formData.warrantyNote       || null) : null,
      warrantyExpireDate: formData.hasWarranty === 'YES' ? formatDateToISO(formData.warrantyExpireDate) : null,
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
      await api.post('/api/register/create', buildRegisterDTO())
      toast.success(t('register_created'))
      setTimeout(() => navigate({ to: '/checklist/register' }), 1000)
    } catch (error: any) {
      toast.error(t('failed_to_create_register'), {
        description: error.response?.data?.message || error.message,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) { const e = { ...errors }; delete e[field]; setErrors(e) }
  }

  // ─── Fetch department ──────────────────────────────────────────────────────
  const fetchDepartments = async (keyword: string, index: number) => {
    try {
      const params: any = { index, size: 20 }
      if (keyword.trim()) params.keyword = keyword.trim()
      const r = await api.get<any>('/api/department/get/list', { params })
      const mapped = (r.data || []).map((d: any) => ({
        label:        d.division ? `${d.department} - ${d.division}` : d.department,
        value:        d.departmentCode,
        businessUnit: d.businessUnit || '',
      }))
      cachedDepartments.current = mapped
      return { data: mapped, hasMore: r.hasMore || false }
    } catch {
      toast.error(t('data_fetch_failed'))
      return { data: [], hasMore: false }
    }
  }

  // ─── Fetch members ─────────────────────────────────────────────────────────
  const fetchMembers = async (keyword: string, index: number) => {
    const params: any = { index, size: 100 }
    if (keyword.trim()) params.keyword = keyword.trim()
    const r = await api.get<ListResponse<MemberListDTO>>('/api/user/get/list', { params })
    const all = r.data.map(m => ({
      label:    `${m.firstName} ${m.lastName}`,
      value:    String(m.id || ''),
      fullName: `${m.firstName} ${m.lastName}`,
    }))
    if (keyword.trim()) {
      const kw = keyword.trim().toLowerCase()
      return all.filter(m => m.label.toLowerCase().includes(kw))
    }
    return all
  }

  const fetchResponsible = async (kw: string, idx: number) => {
    try {
      const d = await fetchMembers(kw, idx)
      if (!kw) setCachedResponsible(d)
      return { data: d, hasMore: false }
    } catch { toast.error(t('data_fetch_failed')); return { data: [], hasMore: false } }
  }
  const fetchSupervisor = async (kw: string, idx: number) => {
    try {
      const d = await fetchMembers(kw, idx)
      if (!kw) setCachedSupervisor(d)
      return { data: d, hasMore: false }
    } catch { return { data: [], hasMore: false } }
  }
  const fetchManager = async (kw: string, idx: number) => {
    try {
      const d = await fetchMembers(kw, idx)
      if (!kw) setCachedManager(d)
      return { data: d, hasMore: false }
    } catch { return { data: [], hasMore: false } }
  }

  // ─── Responsible change — auto-fill supervisor & manager จาก API ──────────
  const handleResponsibleChange = async (selected: any) => {
    const val = Array.isArray(selected) ? selected[0] : selected
    if (!val) {
      setFormData(prev => ({
        ...prev,
        responsible:     '',
        responsibleName: '',
        supervisor:      '',
        supervisorName:  '',
        manager:         '',
        managerName:     '',
      }))
      return
    }

    const found = cachedResponsible.find(r => String(r.value) === String(val))
    setFormData(prev => ({
      ...prev,
      responsible:     val,
      responsibleName: found?.fullName ?? prev.responsibleName,
      supervisor:      '',
      supervisorName:  '',
      manager:         '',
      managerName:     '',
    }))

    // ── ดึง supervisor/manager จาก user API ──────────────────────────────
    try {
      const res    = await api.get<any>(`/api/user/${val}`)
      const member = res.data
      setFormData(prev => ({
        ...prev,
        supervisor:     member.supervisor ? String(member.supervisor) : '',
        supervisorName: member.supervisorName ?? '',
        manager:        member.manager    ? String(member.manager)    : '',
        managerName:    member.managerName    ?? '',
      }))
    } catch {}

    if (errors.responsible) {
      const e = { ...errors }; delete e.responsible; setErrors(e)
    }
  }

  const makeMemberChange = (field: string, nameField: string, cache: any[]) =>
    async (selected: any) => {
      const val = Array.isArray(selected) ? selected[0] : selected
      if (!val) { setFormData(prev => ({ ...prev, [field]: '', [nameField]: '' })); return }
      const found = cache.find(r => String(r.value) === String(val))
      if (found) setFormData(prev => ({ ...prev, [field]: val, [nameField]: found.fullName }))
    }

  // ─── Render ────────────────────────────────────────────────────────────────
  const renderStepContent = () => {
    if (isLoadingRefData) return (
      <div className="px-2 pt-2 space-y-4">
        <div className="text-center py-12 text-muted-foreground">{t('loading')}</div>
      </div>
    )

    switch (currentStep) {
      case 'general': return (
        <div className="px-2 pt-2 space-y-4">
          <TextField id="name" label={t('name')} value={formData.name}
            onChange={v => handleInputChange('name', v)} error={errors.name} required />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField id="serialNumber" label={t('serial_number')} value={formData.serialNumber}
              onChange={v => handleInputChange('serialNumber', v)} error={errors.serialNumber} required />
            <TextField id="brand" label={t('brand')} value={formData.brand}
              onChange={v => handleInputChange('brand', v)} />
            <TextField id="model" label={t('model')} value={formData.model}
              onChange={v => handleInputChange('model', v)} />
            <TextField id="price" label={t('price')} value={formData.price} type="number"
              onChange={v => handleInputChange('price', v)} />
            <TextField id="quantity" label={t('quantity')} value={formData.quantity} type="number"
              onChange={v => handleInputChange('quantity', v)} error={errors.quantity} required />
            <TextField id="watt" label={t('watt')} value={formData.watt} type="number"
              onChange={v => handleInputChange('watt', v)} />
            <TextField id="horsePower" label={t('horse_power')} value={formData.horsePower} type="number"
              onChange={v => handleInputChange('horsePower', v)} />

            <ServerSingleSelect id="department-select" title="department"
              label={t('select_department')} placeholder={t('select_department')}
              value={formData.department}
              onChange={(val) => {
                const code = toStr(val)
                const found = cachedDepartments.current.find(d => d.value === code)
                setFormData(prev => ({ ...prev, department: code, businessUnit: found?.businessUnit || prev.businessUnit }))
                if (errors.department) { const e = { ...errors }; delete e.department; setErrors(e) }
              }}
              fetchOptions={fetchDepartments} error={errors.department} required />

            {/* ── responsible: เลือกแล้ว auto-fill supervisor/manager ─────── */}
            <ServerSingleSelect
              key={`resp-${formData.responsible || 'e'}`}
              id="responsible" title="responsible" label={t('responsible')}
              placeholder={t('select_responsible')} value={formData.responsible}
              initialLabel={formData.responsibleName}
              onChange={handleResponsibleChange}
              fetchOptions={fetchResponsible} error={errors.responsible} required />

            {/* ── supervisor: ถูก auto-fill แต่แก้ได้ ───────────────────── */}
            <ServerSingleSelect
              key={`sup-${formData.supervisor || 'e'}`}
              id="supervisor" title="supervisor" label={t('supervisor')}
              placeholder={t('select_supervisor')} value={formData.supervisor}
              initialLabel={formData.supervisorName}
              onChange={makeMemberChange('supervisor', 'supervisorName', cachedSupervisor)}
              fetchOptions={fetchSupervisor} />

            {/* ── manager: ถูก auto-fill แต่แก้ได้ ─────────────────────── */}
            <ServerSingleSelect
              key={`mgr-${formData.manager || 'e'}`}
              id="manager" title="manager" label={t('manager')}
              placeholder={t('select_manager')} value={formData.manager}
              initialLabel={formData.managerName}
              onChange={makeMemberChange('manager', 'managerName', cachedManager)}
              fetchOptions={fetchManager} />
          </div>

          <TextField id="note" label={t('note')} value={formData.note}
            onChange={v => handleInputChange('note', v)} />

          {/* ─── Warranty Section ──────────────────────────────────────────── */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <p className="text-sm font-semibold">{t('warranty')}</p>

            <SingleSelectField id="hasWarranty" label={t('has_warranty')}
              value={[formData.hasWarranty]}
              onChange={v => handleWarrantyToggle(v[0] || '')}
              options={yesNoOptions}
              error={errors.hasWarranty} />

            {formData.hasWarranty === 'YES' && (
              <>
                <TextField id="warrantyNote" label={t('warranty_note')}
                  value={formData.warrantyNote}
                  onChange={v => handleInputChange('warrantyNote', v)}
                  error={errors.warrantyNote} required />

                <DatePickerField id="warrantyExpireDate" label={t('warranty_expire_date')}
                  value={formData.warrantyExpireDate}
                  onChange={d => handleInputChange('warrantyExpireDate', d)} />

                <FileUploadField id="warranty-docs" label={t('warranty_documents')} maxFiles={10}
                  value={uploadedWarranty.map(f => ({
                    name: f.fileName, size: f.fileSize,
                    type: f.fileType, url: f.fileUrl,
                  })) as unknown as File[]}
                  onChange={handleWarrantyChange}
                  onDownloadFile={handleDownloadFile}
                  onDeleteUploadedFile={handleDeleteWarranty}
                  onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })} />
              </>
            )}
          </div>

          {/* ─── Images ───────────────────────────────────────────────────── */}
          <FileUploadField id="register-images" label={t('images')} maxFiles={10}
            value={uploadedImages.map(f => ({
              name: f.fileName, size: f.fileSize,
              type: f.fileType, url: f.fileUrl,
            })) as unknown as File[]}
            onChange={handleImagesChange}
            onDownloadFile={handleDownloadFile}
            onDeleteUploadedFile={handleDeleteImage}
            onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })} />

          {/* ─── Work Instructions ─────────────────────────────────────────── */}
          <FileUploadField id="register-instructions" label={t('work_instructions')} maxFiles={10}
            value={uploadedInstructions.map(f => ({
              name: f.fileName, size: f.fileSize,
              type: f.fileType, url: f.fileUrl,
            })) as unknown as File[]}
            onChange={handleInstructionsChange}
            onDownloadFile={handleDownloadFile}
            onDeleteUploadedFile={handleDeleteInstruction}
            onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })} />
        </div>
      )

      case 'maintenance': return (
        <div className="px-2 pt-2 space-y-4">
          <SingleSelectField id="maintenancePeriod" label={t('maintenance_period')}
            value={[formData.maintenancePeriod]}
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
            <DatePickerField id="externalCalibration" label={t('external_calibration')} value={formData.externalCalibration} onChange={d => handleInputChange('externalCalibration', d)} />
            <DatePickerField id="calibrationDueDate"  label={t('calibration_due_date')} value={formData.calibrationDueDate}  onChange={d => handleInputChange('calibrationDueDate', d)} />
            <DatePickerField id="certificateDate"     label={t('certificate_date')}      value={formData.certificateDate}     onChange={d => handleInputChange('certificateDate', d)} />
            <SingleSelectField id="result" label={t('results')} value={[formData.result]}
              onChange={v => handleInputChange('result', v[0] || '')}
              options={resultOptions.map(r => ({ value: r.name, label: r.name }))} />
            <TextField id="criteria"         label={t('criteria')}          value={formData.criteria}         onChange={v => handleInputChange('criteria', v)} />
            <TextField id="measuringRange"   label={t('measuring_range')}   value={formData.measuringRange}   onChange={v => handleInputChange('measuringRange', v)} />
            <TextField id="calibrationRange" label={t('calibration_range')} value={formData.calibrationRange} onChange={v => handleInputChange('calibrationRange', v)} />
            <TextField id="accuracy"         label={t('accuracy')}          value={formData.accuracy}         onChange={v => handleInputChange('accuracy', v)} />
            <SingleSelectField id="calibrationStatus" label={t('calibration_status')} value={[formData.calibrationStatus]}
              onChange={v => handleInputChange('calibrationStatus', v[0] || '')}
              options={calibrationStatusOptions.map(cs => ({ value: cs.name, label: cs.name }))} />
          </div>
        </div>
      )

      default: return null
    }
  }

  return (
    <FormLayout
      backLink="/checklist/register"
      title={t('register_new_machine')}
      subtitle={t('register_new_machine_subtitle')}
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText={t('submit')}
      cancelLink="/checklist/register"
    >
      {renderStepContent()}
    </FormLayout>
  )
}