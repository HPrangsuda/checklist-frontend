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
  const { t }    = useTranslation()
  const router   = useRouter()

  // ─── File upload state ─────────────────────────────────────────────────────
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
        // parse attachment string → FileUploadResponse[]
        const attachments = parseAttachments(data.attachment)
        setUploadedFiles(attachments)
        // strip attachment from formData (managed separately)
        const { attachment, ...rest } = data
        setFormData(rest)
      } else {
        toast.error(t('Failed to load calibration details'))
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error(t('Failed to load calibration details'))
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
    if (fileTimeoutRef.current) clearTimeout(fileTimeoutRef.current)
    fileTimeoutRef.current = setTimeout(async () => {
      const current  = uploadedFilesRef.current
      const newFiles = files.filter(f => {
        const key = `${f.name}-${f.size}-${f.lastModified}`
        if (fileQueueRef.current.has(key)) return false
        if (current.some(uf => uf.fileName.includes(f.name))) return false
        fileQueueRef.current.add(key)
        return true
      })
      if (!newFiles.length) return
      setIsUploadingFiles(true)
      try {
        const results: FileUploadResponse[] = []
        for (const file of newFiles) {
          try { results.push(await uploadFile(file)) } catch {}
        }
        if (results.length) {
          setUploadedFiles(prev => [...prev, ...results])
          toast.success(`${results.length} file(s) uploaded`)
        }
      } catch {
        toast.error('Failed to upload files')
      } finally {
        newFiles.forEach(f => fileQueueRef.current.delete(`${f.name}-${f.size}-${f.lastModified}`))
        setIsUploadingFiles(false)
      }
    }, 100)
  }

  const handleDownloadFile = (file: any) => {
    const name = file?.fileName || file?.name
    if (name) window.open(`${import.meta.env.VITE_API_URL}/api/files/download/${name}`, '_blank')
    else toast.error('File not found')
  }

  const handleDeleteFile = async (fileId: any) => {
    const f = uploadedFiles.find(u => u.fileName === fileId || u.fileName.includes(fileId))
    if (!f) return
    try {
      await api.delete(`/api/files/delete/${f.fileName}`)
      setUploadedFiles(prev => prev.filter(u => u.fileName !== f.fileName))
      toast.success('File deleted')
    } catch {
      toast.error('Failed to delete file')
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
        toast.success(t('Calibration updated successfully'))
        router.navigate({ to: '/checklist/calibration/view', search: { id } })
      } else {
        toast.error(t('Failed to update calibration'))
      }
    } catch (error) {
      console.error('Update error:', error)
      toast.error(t('Failed to update calibration'))
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => router.navigate({ to: '/checklist/calibration/view', search: { id } })

  if (saving) {
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
            <Button variant="outline" onClick={handleCancel} disabled={loading}>
              <X className="h-4 w-4 mr-2" />Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
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
              Calibration Details {formData.years && `- ${formData.years}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              <div className="space-y-2">
                <DatePickerField
                  id="dueDate" label="Due Date"
                  value={formData.dueDate ? new Date(formData.dueDate) : null}
                  onChange={(date) => {
                    const isoDate = date ? date.toISOString().split('T')[0] : ''
                    handleInputChange('dueDate', isoDate)
                    if (formData.certificateDate && isoDate) {
                      if (new Date(formData.certificateDate) > new Date(isoDate)) {
                        handleInputChange('calibrationStatus', 'Overdue')
                        toast.warning('Certificate date exceeds new due date. Status updated to Overdue.')
                      } else if (formData.calibrationStatus === 'Overdue') {
                        handleInputChange('calibrationStatus', 'On Time')
                      }
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <DatePickerField
                  id="certificateDate" label="Certificate Date"
                  value={formData.certificateDate ? new Date(formData.certificateDate) : null}
                  onChange={(date) => {
                    const isoDate = date ? date.toISOString().split('T')[0] : ''
                    handleInputChange('certificateDate', isoDate)
                    if (formData.dueDate && isoDate) {
                      if (new Date(isoDate) > new Date(formData.dueDate)) {
                        handleInputChange('calibrationStatus', 'Overdue')
                        toast.warning('Certificate date exceeds due date. Status changed to Overdue.', { duration: 4000 })
                      } else if (formData.calibrationStatus === 'Overdue') {
                        handleInputChange('calibrationStatus', 'On Time')
                      }
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Results</Label>
                <Select value={formData.results} onValueChange={v => handleInputChange('results', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Not Pass">Not Pass</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.calibrationStatus} onValueChange={v => handleInputChange('calibrationStatus', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="On Time">On Time</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {[
                { id: 'criteria',            label: 'Criteria' },
                { id: 'accuracy',            label: 'Accuracy' },
                { id: 'measuringRange',      label: 'Measuring Range' },
                { id: 'calibrationRange',    label: 'Calibration Range' },
                { id: 'resolution',          label: 'Resolution' },
                { id: 'mpe',                 label: 'MPE' },
                { id: 'maxUncertainty',      label: 'Max Uncertainty' },
                { id: 'permissibleCapacity', label: 'Permissible Capacity' },
              ].map(({ id: fid, label }) => (
                <div key={fid} className="space-y-2">
                  <Label htmlFor={fid}>{label}</Label>
                  <Input
                    id={fid}
                    value={(formData as any)[fid] || ''}
                    onChange={e => handleInputChange(fid as keyof CalibrationFormData, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-6 pt-6">
              {[
                { id: 'note',          label: 'Note',           placeholder: 'Enter additional notes...' },
                { id: 'comment',       label: 'Comment',        placeholder: 'Enter comments...' },
                { id: 'reasonNotPass', label: 'Reason Not Pass', placeholder: 'Enter reason for not passing...' },
              ].map(({ id: fid, label, placeholder }) => (
                <div key={fid} className="space-y-2">
                  <Label htmlFor={fid}>{label}</Label>
                  <Textarea
                    id={fid} rows={4} placeholder={placeholder}
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
              <CheckCircle2 className="h-5 w-5 text-success" />Check Results
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div className="space-y-2">
                <Label>Check MPE</Label>
                <Select value={formData.checkMpe} onValueChange={v => handleInputChange('checkMpe', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Not Pass">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Check Resolution</Label>
                <Select value={formData.checkResolution} onValueChange={v => handleInputChange('checkResolution', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pass">Pass</SelectItem>
                    <SelectItem value="Not Pass">Failed</SelectItem>
                    <SelectItem value="Pass Only 3">Pass Only 3</SelectItem>
                    <SelectItem value="Pass Only 5">Pass Only 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Check Result</Label>
                <Select value={formData.checkResult} onValueChange={v => handleInputChange('checkResult', v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPERATIONAL">Operational</SelectItem>
                    <SelectItem value="DECOMMISSIONED">Decommissioned</SelectItem>
                    <SelectItem value="LIMITED USE">Limited Use</SelectItem>
                    <SelectItem value="CERTIFICATE MISMATCH">Certificate Mismatch</SelectItem>
                    <SelectItem value="DAMAGED">Damaged</SelectItem>
                    <SelectItem value="UNDER REPAIR">Under Repair</SelectItem>
                    <SelectItem value="N/A">N/A</SelectItem>
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
              <FileText className="h-5 w-5 text-primary" />Attachments
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-2">
            <div className="space-y-2">
              <Label>Attachment</Label>
              <FileUploadField
                id="attachments"
                maxFiles={10}
                value={
                  uploadedFiles.map(f => ({
                    name: f.fileName, size: f.fileSize,
                    type: f.fileType, url:  f.fileUrl
                  })) as unknown as File[]
                }
                onChange={handleFilesChange}
                onDownloadFile={handleDownloadFile}
                onDeleteUploadedFile={handleDeleteFile}
                onFileReject={(file, message) =>
                  toast.error(message, { description: `"${file.name}" could not be uploaded` })
                }
              />
              {isUploadingFiles && (
                <p className="text-sm text-muted-foreground animate-pulse">Uploading...</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mobile Actions */}
        <div className="md:hidden flex gap-3">
          <Button type="button" variant="outline" onClick={handleCancel} disabled={loading} className="flex-1">
            <X className="h-4 w-4 mr-2" />Cancel
          </Button>
          <Button type="submit" disabled={loading} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </div>

      </form>
    </div>
  )
}