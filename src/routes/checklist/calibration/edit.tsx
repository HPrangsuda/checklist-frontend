import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Save, X, PencilRuler, FileText, Gauge } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { DatePickerField } from '@/components/form/DatePickerField'
import { FileUploadField } from '@/components/form/FileUploadField'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/core/contexts/auth-context'
import { cn } from '@/core/lib/utils'

export const Route = createFileRoute('/checklist/calibration/edit')({
  component: CalibrationEdit,
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0
  })
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileUploadResponse {
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedBy?: string | null
}

interface CalibrationFormData {
  id: number
  machineCode: string
  machineName?: string
  years?: string
  dueDate?: string
  startDate?: string
  certificateDate?: string
  mpe?: string
  internalMpe?: string
  maxRepeatability?: string
  resolution?: string
  minCapacity?: string
  maxCapacity?: string
  mpeRefer?: string
  calibrationBy?: string
  result?: string
  correctionFactor?: string
  measurementRange?: string
  remark?: string
}

type SpecField = 'mpe' | 'internalMpe' | 'maxRepeatability' | 'measurementRange' | 'resolution'
  | 'minCapacity' | 'maxCapacity' | 'correctionFactor'

// ─── Helpers ──────────────────────────────────────────────────────────────────

type CalStatus = 'On Time' | 'Overdue' | 'Pending'

const STATUS_LABEL_KEY: Record<CalStatus, string> = {
  'On Time': 'status_on_time',
  Overdue:   'status_overdue',
  Pending:   'status_pending',
}

const STATUS_BADGE_CLASS: Record<CalStatus, string> = {
  'On Time': 'bg-emerald-100 text-emerald-600 dark:text-emerald-100',
  Overdue:   'bg-red-100 text-red-600 dark:text-red-100',
  Pending:   'bg-zinc-100 text-zinc-600 dark:text-zinc-100',
}

/** ผลการสอบเทียบ — value ที่เก็บใน DB */
const RESULT_OPTIONS: { value: string; labelKey: string }[] = [
  { value: 'Pass ISO17025', labelKey: 'status_pass_iso17025' },
  { value: 'Pass ISO9001',  labelKey: 'status_pass_iso9001' },
  { value: 'Not Pass',      labelKey: 'status_not_pass' },
]

/** ค่าที่เก็บใน DB (value) ตรงกับ backend CalibrationService.MPE_REFER_STANDARD */
const MPE_REFER_STANDARD = 'Standard'
const MPE_REFER_OPTIONS: { value: string; labelKey: string }[] = [
  { value: MPE_REFER_STANDARD,  labelKey: 'mpe_refer_standard' },
  { value: 'Procedure',         labelKey: 'mpe_refer_procedure' },
  { value: 'Resolution (3-5x)', labelKey: 'mpe_refer_resolution' },
  { value: 'Manual',            labelKey: 'mpe_refer_manual' },
]

/** Date -> 'YYYY-MM-DD' ตามเวลาท้องถิ่น (toISOString จะเลื่อนถอย 1 วันในเวลาไทย) */
const toDateStr = (d?: Date | null) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : ''

/** 'YYYY-MM-DD' -> Date เวลาท้องถิ่น 00:00 */
const parseDateStr = (s?: string | null) => {
  if (!s) return null
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return y && m && d ? new Date(y, m - 1, d) : null
}

/** ทันเวลา/เลยกำหนด จาก due date + certificate date (เกณฑ์เดียวกับ backend) */
const computeCalibrationStatus = (due?: string | null, cert?: string | null): CalStatus | null => {
  const dd = due?.slice(0, 10), cc = cert?.slice(0, 10)
  if (!dd) return null
  if (cc) return cc <= dd ? 'On Time' : 'Overdue'
  return dd < toDateStr(new Date()) ? 'Overdue' : 'Pending'
}

/** JSON string ของไฟล์ -> array (ข้อความเก่าที่ไม่ใช่ JSON จะได้ []) */
const parseAttachments = (raw?: string | null): FileUploadResponse[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

const numToStr = (v: unknown) => (v === null || v === undefined ? '' : String(v))

/** response จาก API -> state ของฟอร์ม */
const toFormData = (data: any): CalibrationFormData => ({
  id:               data.id,
  machineCode:      data.machineCode ?? '',
  machineName:      data.machineName ?? '',
  years:            numToStr(data.years),
  dueDate:          data.dueDate ?? '',
  startDate:        data.startDate ?? '',
  certificateDate:  data.certificateDate ?? '',
  mpe:              data.mpe ?? '',
  internalMpe:      data.internalMpe ?? '',
  maxRepeatability: data.maxRepeatability ?? '',
  resolution:       data.resolution ?? '',
  minCapacity:      data.minCapacity ?? '',
  maxCapacity:      data.maxCapacity ?? '',
  mpeRefer:         data.mpeRefer ?? '',
  calibrationBy:    data.calibrationBy ?? '',
  result:           data.result ?? '',
  correctionFactor: data.correctionFactor ?? '',
  measurementRange: data.measurementRange ?? '',
  remark:           data.remark ?? '',
})

/** คืน error key ถ้าวันที่ไม่สอดคล้องกัน */
const validateDates = (f: CalibrationFormData): string | null => {
  const start = f.startDate?.slice(0, 10)
  const cert  = f.certificateDate?.slice(0, 10)
  if (cert && !start)                 return 'start_date_required_with_certificate'
  if (start && cert && start > cert)  return 'start_date_after_certificate'
  return null
}

/** ทุกช่องเป็นข้อความอิสระ — รองรับทศนิยม, ±, หน่วย (เช่น "±0.05 mm") */
const SPEC_FIELDS: { id: SpecField; labelKey: string }[] = [
  { id: 'mpe',              labelKey: 'mpe' },
  { id: 'internalMpe',      labelKey: 'internal_mpe' },
  { id: 'maxRepeatability', labelKey: 'max_repeatability' },
  { id: 'measurementRange', labelKey: 'measurement_range' },
  { id: 'resolution',       labelKey: 'resolution' },
  { id: 'minCapacity',      labelKey: 'min_capacity' },
  { id: 'maxCapacity',      labelKey: 'max_capacity' },
  { id: 'correctionFactor', labelKey: 'correction_factor' },
]

// ─── useFileUploads (ใช้ทั้ง Attachment และ Refer Standard) ───────────────────

function useFileUploads(t: (k: string) => string) {
  const [newFiles,      setNewFiles]      = useState<File[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<FileUploadResponse[]>([])
  const [isUploading,   setIsUploading]   = useState(false)

  const uploadedRef  = useRef<FileUploadResponse[]>([])
  const queueRef     = useRef<Set<string>>(new Set())
  const timeoutRef   = useRef<NodeJS.Timeout | null>(null)
  const uploadingRef = useRef(false)

  useEffect(() => { uploadedRef.current = uploadedFiles }, [uploadedFiles])

  const reset = (files: FileUploadResponse[]) => {
    uploadedRef.current = files
    setUploadedFiles(files)
  }

  const uploadFile = async (file: File): Promise<FileUploadResponse> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post<{ data: FileUploadResponse }>('/api/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  const fileKey = (f: File) => `${f.name}-${f.size}-${f.lastModified}`

  const handleFilesChange = (files: File[]) => {
    const realFiles = files.filter(f => f instanceof File)
    setNewFiles(realFiles)

    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    timeoutRef.current = setTimeout(() => {
      if (!realFiles.length || uploadingRef.current) return

      const current  = uploadedRef.current
      const toUpload = realFiles.filter(f => {
        const key = fileKey(f)
        if (queueRef.current.has(key)) return false
        if (current.some(uf => uf.fileName === f.name)) return false
        queueRef.current.add(key)
        return true
      })
      if (!toUpload.length) return

      uploadingRef.current = true
      setIsUploading(true)
      ;(async () => {
        try {
          const results: FileUploadResponse[] = []
          for (const file of toUpload) {
            try {
              results.push(await uploadFile(file))
            } catch (err) {
              console.error(`Failed to upload ${file.name}:`, err)
            }
          }
          if (results.length) {
            setUploadedFiles(prev => [...prev, ...results])
            toast.success(t('files_uploaded').replace('{count}', String(results.length)))
          }
        } catch {
          toast.error(t('failed_to_upload_files'))
        } finally {
          toUpload.forEach(f => queueRef.current.delete(fileKey(f)))
          uploadingRef.current = false
          setIsUploading(false)
        }
      })()
    }, 100)
  }

  const handleDeleteFile = async (fileId: any) => {
    const f = uploadedFiles.find(u => u.fileName === fileId || u.fileName.includes(fileId))
    if (!f) return
    try {
      await api.delete(`/api/files/delete/${f.fileName}`)
      setUploadedFiles(prev => prev.filter(u => u.fileName !== f.fileName))
      toast.success(t('file_deleted'))
    } catch {
      toast.error(t('failed_to_delete_file'))
    }
  }

  const fieldFiles = uploadedFiles.map(f => ({
    id:   f.fileName,
    name: f.fileName,
    size: f.fileSize,
    url:  f.fileUrl,
    type: f.fileType,
  }))

  return { newFiles, uploadedFiles, isUploading, reset, handleFilesChange, handleDeleteFile, fieldFiles }
}

// ─── Main Component ───────────────────────────────────────────────────────────

function CalibrationEdit() {
  const { role } = useAuth()
  const isAdmin  = role === 'ADMIN'

  const { id } = useSearch({ from: '/checklist/calibration/edit' })
  const [formData, setFormData] = useState<CalibrationFormData>({ id: 0, machineCode: '' })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const attachments = useFileUploads(t)
  const referFiles  = useFileUploads(t)

  // สถานะทันเวลา/เลยกำหนด คำนวณจาก due date + certificate date เสมอ
  const computedStatus = useMemo(
    () => computeCalibrationStatus(formData.dueDate, formData.certificateDate),
    [formData.dueDate, formData.certificateDate]
  )

  const isStandardRefer   = formData.mpeRefer === MPE_REFER_STANDARD
  const referFileMissing  = isStandardRefer && referFiles.uploadedFiles.length === 0
  const isUploadingAny    = attachments.isUploading || referFiles.isUploading

  // ค่าเก่าที่ไม่อยู่ในตัวเลือก (เช่น "Pass" เดิม) — แสดงไว้ไม่ให้หาย
  const legacyResult = formData.result && !RESULT_OPTIONS.some(o => o.value === formData.result)
    ? formData.result : null

  // ค่าเก่าที่ไม่อยู่ในตัวเลือก (ข้อมูลก่อนเปลี่ยนเป็น dropdown) — แสดงไว้ไม่ให้หาย
  const legacyMpeRefer = formData.mpeRefer && !MPE_REFER_OPTIONS.some(o => o.value === formData.mpeRefer)
    ? formData.mpeRefer : null

  // ─── Fetch detail ──────────────────────────────────────────────────────────
  useEffect(() => { if (id) fetchCalibrationDetail() }, [id])

  const fetchCalibrationDetail = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>(`/api/calibration/${id}`)
      if (response) {
        const data = response.data || response
        attachments.reset(parseAttachments(data.attachment))
        referFiles.reset(parseAttachments(data.referStandard))
        setFormData(toFormData(data))
      } else {
        toast.error(t('failed_to_load_calibration'))
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(t('failed_to_load_calibration'))
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadFile = (file: any) => {
    const name = file?.fileName || file?.name
    if (name) window.open(`${import.meta.env.VITE_API_URL}/api/files/download/${name}`, '_blank')
    else toast.error(t('file_not_found'))
  }

  // ─── Form handlers ─────────────────────────────────────────────────────────
  const handleInputChange = (field: keyof CalibrationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDateChange = (field: 'dueDate' | 'startDate' | 'certificateDate', date: Date | null) => {
    const next = { ...formData, [field]: toDateStr(date) }
    setFormData(next)

    // เตือนทันทีเมื่อ cert เกิน due
    if (field !== 'startDate') {
      const st = computeCalibrationStatus(next.dueDate, next.certificateDate)
      if (next.certificateDate && st === 'Overdue') {
        toast.warning(t('cert_exceeds_due_date'), { duration: 4000 })
      }
    }
    // เตือนเมื่อวันที่เริ่มอยู่หลังวันที่ได้ cert
    const err = validateDates(next)
    if (err === 'start_date_after_certificate') toast.warning(t(err))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)

    const dateError = validateDates(formData)
    if (dateError) {
      toast.error(t(dateError))
      return
    }
    if (isUploadingAny) {
      toast.warning(t('uploading'))
      return
    }
    if (referFileMissing) {
      toast.error(t('refer_standard_file_required'))
      document.getElementById('referStandard')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    try {
      setSaving(true)
      // ส่งเฉพาะ field ที่ backend รับ (CalibrationDTO); string ว่าง = ล้างค่า, null = ไม่แก้
      const payload = {
        id:               formData.id,
        dueDate:          formData.dueDate         || null,
        startDate:        formData.startDate       || null,
        certificateDate:  formData.certificateDate || null,
        mpe:              formData.mpe              ?? null,
        internalMpe:      formData.internalMpe      ?? null,
        maxRepeatability: formData.maxRepeatability ?? null,
        resolution:       formData.resolution       ?? null,
        minCapacity:      formData.minCapacity      ?? null,
        maxCapacity:      formData.maxCapacity      ?? null,
        mpeRefer:         formData.mpeRefer         ?? null,
        // ไฟล์อ้างอิงใช้เฉพาะเมื่อเลือก Standard — ตัวเลือกอื่นล้างเป็น "[]"
        referStandard:    JSON.stringify(isStandardRefer ? referFiles.uploadedFiles : []),
        calibrationBy:    formData.calibrationBy    ?? null,
        result:           formData.result           || null,
        correctionFactor: formData.correctionFactor ?? null,
        measurementRange: formData.measurementRange ?? null,
        remark:           formData.remark           ?? null,
        // ส่ง "[]" เมื่อลบไฟล์หมด เพื่อให้ backend ล้างค่าได้ (null = ไม่แก้)
        attachment:       JSON.stringify(attachments.uploadedFiles),
      }
      const response = await api.put<any>(`/api/calibration/update`, payload)
      // backend ตอบ 200 แม้ validate ไม่ผ่าน — เช็ก flag ด้วย
      if (response && response.success !== false && response.status !== false) {
        toast.success(t('calibration_updated'))
        router.navigate({ to: '/checklist/calibration/view', search: { id } })
      } else {
        toast.error(response?.message ?? t('failed_to_update_calibration'))
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error(t('failed_to_update_calibration'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => router.navigate({ to: '/checklist/calibration/view', search: { id } })

  if (loading) {
    return (
      <div className="relative p-6">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="relative bg-background">

      {/* Header */}
      <div className="bg-card border-b border-border px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleCancel} className="hover:bg-accent">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <PencilRuler className="h-6 w-6 text-red-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{formData.machineName}</h1>
                <p className="text-sm text-muted-foreground">{formData.machineCode}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              <X className="h-4 w-4 mr-2" />
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={saving || isUploadingAny}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? t('saving') : t('save_changes')}
            </Button>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Calibration Details */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <PencilRuler className="h-5 w-5 text-primary" />
              {t('calibration_information')}
              {formData.years ? ` - ${formData.years}` : ''}
              {computedStatus && (
                <Badge className={STATUS_BADGE_CLASS[computedStatus]}>
                  {t(STATUS_LABEL_KEY[computedStatus])}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Due date — แก้ได้เฉพาะ ADMIN */}
              <div className="space-y-2">
                <div className={!isAdmin ? 'pointer-events-none opacity-50' : ''}>
                  <DatePickerField
                    id="dueDate"
                    label={t('due_date')}
                    value={parseDateStr(formData.dueDate)}
                    onChange={(date) => handleDateChange('dueDate', date)}
                  />
                </div>
              </div>

              {/* Start date — ใช้หยุดการแจ้งเตือนรายวัน */}
              <div className="space-y-2">
                <DatePickerField
                  id="startDate"
                  label={t('start_date')}
                  value={parseDateStr(formData.startDate)}
                  onChange={(date) => handleDateChange('startDate', date)}
                />
              </div>

              {/* Certificate date — ใช้ตัดสินทันเวลา/เลยกำหนด */}
              <div className="space-y-2">
                <DatePickerField
                  id="certificateDate"
                  label={t('certificate_date')}
                  value={parseDateStr(formData.certificateDate)}
                  onChange={(date) => handleDateChange('certificateDate', date)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
              <div className="space-y-2">
                <Label>{t('result')}</Label>
                <Select value={formData.result || ''} onValueChange={v => handleInputChange('result', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('please_select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULT_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
                    ))}
                    {legacyResult && (
                      <SelectItem value={legacyResult}>{legacyResult}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* สถานะคำนวณอัตโนมัติ — ไม่ให้เลือกเอง */}
              <div className="space-y-2">
                <Label>{t('calibration_status')}</Label>
                <div className="flex h-9 items-center rounded-md border border-input bg-muted/40 px-3">
                  {computedStatus ? (
                    <Badge className={STATUS_BADGE_CLASS[computedStatus]}>
                      {t(STATUS_LABEL_KEY[computedStatus])}
                    </Badge>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calibrationBy">{t('calibration_by')}</Label>
                <Input
                  id="calibrationBy"
                  value={formData.calibrationBy || ''}
                  onChange={e => handleInputChange('calibrationBy', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 pt-6">
              <Label htmlFor="remark">{t('remark')}</Label>
              <Textarea
                id="remark" rows={4} placeholder={t('remark_placeholder')}
                value={formData.remark || ''}
                onChange={e => handleInputChange('remark', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <Gauge className="h-5 w-5 text-primary" />
              {t('calibration_specification')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {SPEC_FIELDS.map(({ id: fid, labelKey }) => (
                <div key={fid} className="space-y-2">
                  <Label htmlFor={fid}>{t(labelKey)}</Label>
                  <Input
                    id={fid}
                    value={formData[fid] || ''}
                    onChange={e => handleInputChange(fid, e.target.value)}
                  />
                </div>
              ))}

              {/* MPE Refer — dropdown */}
              <div className="space-y-2">
                <Label>{t('mpe_refer')}</Label>
                <Select value={formData.mpeRefer || ''} onValueChange={v => handleInputChange('mpeRefer', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('please_select')} />
                  </SelectTrigger>
                  <SelectContent>
                    {MPE_REFER_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{t(o.labelKey)}</SelectItem>
                    ))}
                    {legacyMpeRefer && (
                      <SelectItem value={legacyMpeRefer}>{legacyMpeRefer}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Refer Standard — บังคับอัปโหลดเมื่อเลือก Standard */}
              {isStandardRefer && (
                <div id="referStandard" className="space-y-2 md:col-span-2">
                  <Label>
                    {t('refer_standard')} <span className="text-destructive">*</span>
                  </Label>
                  <div className={cn(
                    'rounded-md',
                    submitted && referFileMissing && 'ring-2 ring-destructive ring-offset-2'
                  )}>
                    <FileUploadField
                      id="referStandardFiles"
                      maxFiles={10}
                      value={referFiles.newFiles}
                      uploadedFiles={referFiles.fieldFiles}
                      onChange={referFiles.handleFilesChange}
                      onDownloadFile={handleDownloadFile}
                      onDeleteUploadedFile={referFiles.handleDeleteFile}
                      onFileReject={(file, message) =>
                        toast.error(message, { description: `"${file.name}" ${t('could_not_be_uploaded')}` })
                      }
                    />
                  </div>
                  {referFiles.isUploading && (
                    <p className="text-sm text-muted-foreground animate-pulse">{t('uploading')}</p>
                  )}
                  {submitted && referFileMissing && !referFiles.isUploading && (
                    <p className="text-sm text-destructive">{t('refer_standard_file_required')}</p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Attachments */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <FileText className="h-5 w-5 text-primary" />
              {t('attachments')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="space-y-2">
              <Label>{t('attachment')}</Label>
              <FileUploadField
                id="attachments"
                maxFiles={10}
                value={attachments.newFiles}
                uploadedFiles={attachments.fieldFiles}
                onChange={attachments.handleFilesChange}
                onDownloadFile={handleDownloadFile}
                onDeleteUploadedFile={attachments.handleDeleteFile}
                onFileReject={(file, message) =>
                  toast.error(message, { description: `"${file.name}" ${t('could_not_be_uploaded')}` })
                }
              />
              {attachments.isUploading && (
                <p className="text-sm text-muted-foreground animate-pulse">{t('uploading')}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Actions */}
        <div className="md:hidden flex gap-3">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={saving} className="flex-1">
            <X className="h-4 w-4 mr-2" />
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={saving || isUploadingAny} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('saving') : t('save')}
          </Button>
        </div>

      </form>
    </div>
  )
}