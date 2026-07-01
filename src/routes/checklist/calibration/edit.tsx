import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { ArrowLeft, Save, X, PencilRuler, FileText, CheckCircle2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { toast } from 'sonner'
import { DatePickerField } from '@/components/form/DatePickerField'
import { FileUploadField } from '@/components/form/FileUploadField'
import { Skeleton } from '@/components/ui/skeleton'

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
  years: number
  dueDate?: string
  startDate?: string
  certificateDate?: string
  results?: string
  criteria?: string
  measuringRange?: string
  accuracy?: string
  calibrationRange?: string
  calibrationStatus?: string
  note?: string
  permissibleCapacity?: string
  comment?: string
  resolution?: string
  maxUncertainty?: string
  mpe?: string
  checkMpe?: string
  checkResolution?: string
  checkResult?: string
  reasonNotPass?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseAttachments = (raw?: string | null): FileUploadResponse[] => {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  try { return JSON.parse(raw) } catch { return [] }
}

// ─── Main Component ───────────────────────────────────────────────────────────

function CalibrationEdit() {
  const { id } = useSearch({ from: '/checklist/calibration/edit' })
  const [formData, setFormData] = useState<CalibrationFormData>({
    id: 0,
    machineCode: '',
    years: new Date().getFullYear(),
    calibrationStatus: 'PENDING'
  })
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  // ─── File upload state ─────────────────────────────────────────────────────
  const [newFiles,         setNewFiles]         = useState<File[]>([])
  const [uploadedFiles,    setUploadedFiles]    = useState<FileUploadResponse[]>([])
  const [isUploadingFiles, setIsUploadingFiles] = useState(false)

  const uploadedFilesRef = useRef<FileUploadResponse[]>([])
  const fileQueueRef     = useRef<Set<string>>(new Set())
  const fileTimeoutRef   = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => { uploadedFilesRef.current = uploadedFiles }, [uploadedFiles])

  // ─── Fetch detail ──────────────────────────────────────────────────────────
  useEffect(() => { if (id) fetchCalibrationDetail() }, [id])

  const fetchCalibrationDetail = async () => {
    try {
      setLoading(true)
      const response = await api.get<any>(`/api/calibration/${id}`)
      if (response) {
        const data = response.data || response
        const attachments = parseAttachments(data.attachment)
        setUploadedFiles(attachments)
        uploadedFilesRef.current = attachments
        const { attachment, ...rest } = data
        setFormData(rest)
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

  // ─── File upload core ──────────────────────────────────────────────────────
  const uploadFile = async (file: File): Promise<FileUploadResponse> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await api.post<{ data: FileUploadResponse }>('/api/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  }

  const handleFilesChange = (files: File[]) => {
    const realFiles = files.filter(f => f instanceof File)
    setNewFiles(realFiles)

    if (fileTimeoutRef.current) clearTimeout(fileTimeoutRef.current)

    fileTimeoutRef.current = setTimeout(() => {
      if (!realFiles.length || isUploadingFiles) return

      const current = uploadedFilesRef.current
      const toUpload = realFiles.filter(f => {
        const key = `${f.name}-${f.size}-${f.lastModified}`
        if (fileQueueRef.current.has(key)) return false
        if (current.some(uf => uf.fileName === f.name)) return false
        fileQueueRef.current.add(key)
        return true
      })

      if (!toUpload.length) return

      setIsUploadingFiles(true)
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
          toUpload.forEach(f =>
            fileQueueRef.current.delete(`${f.name}-${f.size}-${f.lastModified}`)
          )
          setIsUploadingFiles(false)
        }
      })()
    }, 100)
  }

  const handleDownloadFile = (file: any) => {
    const name = file?.fileName || file?.name
    if (name) window.open(`${import.meta.env.VITE_API_URL}/api/files/download/${name}`, '_blank')
    else toast.error(t('file_not_found'))
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

  // ─── Form handlers ─────────────────────────────────────────────────────────
  const handleInputChange = (field: keyof CalibrationFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const payload = {
        ...formData,
        attachment: uploadedFiles.length > 0 ? JSON.stringify(uploadedFiles) : null
      }
      const response = await api.put(`/api/calibration/update`, payload)
      if (response) {
        toast.success(t('calibration_updated'))
        router.navigate({ to: '/checklist/calibration/view', search: { id } })
      } else {
        toast.error(t('failed_to_update_calibration'))
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
      <div className="min-h-screen bg-gray-50 p-6">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">

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
            <Button onClick={handleSubmit} disabled={saving}>
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
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <DatePickerField
                  id="dueDate"
                  label={t('due_date')}
                  value={formData.dueDate ? new Date(formData.dueDate) : null}
                  onChange={(date) => {
                    const isoDate = date ? date.toISOString().split('T')[0] : ''
                    handleInputChange('dueDate', isoDate)
                    if (formData.certificateDate && isoDate) {
                      if (new Date(formData.certificateDate) > new Date(isoDate)) {
                        handleInputChange('calibrationStatus', 'Overdue')
                        toast.warning(t('cert_exceeds_due_date'))
                      } else if (formData.calibrationStatus === 'Overdue') {
                        handleInputChange('calibrationStatus', 'On Time')
                      }
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <DatePickerField
                  id="certificateDate"
                  label={t('certificate_date')}
                  value={formData.certificateDate ? new Date(formData.certificateDate) : null}
                  onChange={(date) => {
                    const isoDate = date ? date.toISOString().split('T')[0] : ''
                    handleInputChange('certificateDate', isoDate)
                    if (formData.dueDate && isoDate) {
                      if (new Date(isoDate) > new Date(formData.dueDate)) {
                        handleInputChange('calibrationStatus', 'Overdue')
                        toast.warning(t('cert_exceeds_due_date'), { duration: 4000 })
                      } else if (formData.calibrationStatus === 'Overdue') {
                        handleInputChange('calibrationStatus', 'On Time')
                      }
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('results')}</Label>
                <Select value={formData.results || ''} onValueChange={v => handleInputChange('results', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('please_select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">{t('status_pass')}</SelectItem>
                    <SelectItem value="Not Pass">{t('status_not_pass')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('calibration_status')}</Label>
                <Select value={formData.calibrationStatus || ''} onValueChange={v => handleInputChange('calibrationStatus', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('please_select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Time">{t('status_on_time')}</SelectItem>
                    <SelectItem value="Overdue">{t('status_overdue')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {([
                { id: 'criteria',            labelKey: 'criteria' },
                { id: 'accuracy',            labelKey: 'accuracy' },
                { id: 'measuringRange',      labelKey: 'measuring_range' },
                { id: 'calibrationRange',    labelKey: 'calibration_range' },
                { id: 'resolution',          labelKey: 'resolution' },
                { id: 'mpe',                 labelKey: 'mpe' },
                { id: 'maxUncertainty',      labelKey: 'max_uncertainty' },
                { id: 'permissibleCapacity', labelKey: 'permissible_capacity' },
              ] as const).map(({ id: fid, labelKey }) => (
                <div key={fid} className="space-y-2">
                  <Label htmlFor={fid}>{t(labelKey)}</Label>
                  <Input
                    id={fid}
                    value={(formData as any)[fid] || ''}
                    onChange={e => handleInputChange(fid as keyof CalibrationFormData, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 pt-6">
              {([
                { id: 'note',          labelKey: 'note',          placeholderKey: 'note_placeholder' },
                { id: 'comment',       labelKey: 'comment',       placeholderKey: 'comment_placeholder' },
                { id: 'reasonNotPass', labelKey: 'reason_not_pass', placeholderKey: 'reason_not_pass_placeholder' },
              ] as const).map(({ id: fid, labelKey, placeholderKey }) => (
                <div key={fid} className="space-y-2">
                  <Label htmlFor={fid}>{t(labelKey)}</Label>
                  <Textarea
                    id={fid} rows={4} placeholder={t(placeholderKey)}
                    value={(formData as any)[fid] || ''}
                    onChange={e => handleInputChange(fid as keyof CalibrationFormData, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Check Results */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2 text-foreground font-semibold">
              <CheckCircle2 className="h-5 w-5 text-success" />
              {t('check_results')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div className="space-y-2">
                <Label>{t('check_mpe')}</Label>
                <Select value={formData.checkMpe || ''} onValueChange={v => handleInputChange('checkMpe', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('please_select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">{t('status_pass')}</SelectItem>
                    <SelectItem value="Not Pass">{t('check_failed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('check_resolution')}</Label>
                <Select value={formData.checkResolution || ''} onValueChange={v => handleInputChange('checkResolution', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('please_select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">{t('status_pass')}</SelectItem>
                    <SelectItem value="Not Pass">{t('check_failed')}</SelectItem>
                    <SelectItem value="Pass Only 3">{t('check_pass_only_3')}</SelectItem>
                    <SelectItem value="Pass Only 5">{t('check_pass_only_5')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('check_result')}</Label>
                <Select value={formData.checkResult || ''} onValueChange={v => handleInputChange('checkResult', v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t('please_select')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATIONAL">{t('check_result_operational')}</SelectItem>
                    <SelectItem value="DECOMMISSIONED">{t('check_result_decommissioned')}</SelectItem>
                    <SelectItem value="LIMITED USE">{t('check_result_limited_use')}</SelectItem>
                    <SelectItem value="CERTIFICATE MISMATCH">{t('check_result_cert_mismatch')}</SelectItem>
                    <SelectItem value="DAMAGED">{t('check_result_damaged')}</SelectItem>
                    <SelectItem value="UNDER REPAIR">{t('check_result_under_repair')}</SelectItem>
                    <SelectItem value="N/A">{t('check_result_na')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                value={newFiles}
                uploadedFiles={uploadedFiles.map(f => ({
                  id:   f.fileName,
                  name: f.fileName,
                  size: f.fileSize,
                  url:  f.fileUrl,
                  type: f.fileType,
                }))}
                onChange={handleFilesChange}
                onDownloadFile={handleDownloadFile}
                onDeleteUploadedFile={handleDeleteFile}
                onFileReject={(file, message) =>
                  toast.error(message, { description: `"${file.name}" ${t('could_not_be_uploaded')}` })
                }
              />
              {isUploadingFiles && (
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
          <Button type="submit" disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? t('saving') : t('save')}
          </Button>
        </div>

      </form>
    </div>
  )
}