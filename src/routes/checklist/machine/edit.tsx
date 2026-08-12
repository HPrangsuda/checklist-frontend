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
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, Download, FileText, Plus, Search, X } from 'lucide-react'
import { useAuth } from '@/core/contexts/auth-context'

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileUploadResponse {
  fileName:    string
  fileUrl:     string
  fileType:    string
  fileSize:    number
  uploadedBy?: string | null
}

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
  isChoice:    boolean
}

type MachineEditSearch = { id: number; step?: string }

const ACTIVE_STATUSES = ['OPERATIONAL', 'NON-OPERATIONAL', 'UNDER MAINTENANCE'] as const
const isNonActiveStatus = (status: string): boolean =>
  !!status && !(ACTIVE_STATUSES as readonly string[]).includes(status)

// ─── Constants ────────────────────────────────────────────────────────────────

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp'])
const API_BASE   = import.meta.env.VITE_API_URL ?? ''

// ─── Date helpers ──────────────────────────────────────────────────────────────

function toDateString(val: unknown): string {
  if (!val) return ''
  if (Array.isArray(val)) {
    const [y, m, d] = val as number[]
    if (!y || !m || !d) return ''
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  if (val instanceof Date) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const str = String(val)
  if (!str) return ''
  if (str.includes('T')) return str.split('T')[0]
  return str
}

function toISOPreservingDate(val: unknown): string | null {
  return toDateString(val) || null
}

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/checklist/machine/edit')({
  component: MachineEdit,
  validateSearch: (search: Record<string, unknown>): MachineEditSearch => ({
  id:   Number(search.id) || 0,
  step: typeof search.step === 'string' ? search.step : undefined,
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

const activeFiles = (files: FileEntry[]) => files.filter(f => !f._markedForDelete)

const isImageFile = (fileName: string) =>
  IMAGE_EXTS.has(fileName.split('.').pop()?.toLowerCase() ?? '')

const toFileUrl = (fileUrl: string) => {
  const filename = fileUrl.split('/').pop() ?? fileUrl
  return `${API_BASE}/api/files/download/${encodeURIComponent(filename)}`
}

// ─── AuthImage ────────────────────────────────────────────────────────────────

function AuthImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [failed,  setFailed]  = useState(false)

  useEffect(() => {
    let url = ''
    api.getInstance().get(src, { responseType: 'blob' })
      .then((res: any) => { url = URL.createObjectURL(res.data); setBlobUrl(url) })
      .catch(() => setFailed(true))
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [src])

  if (failed)   return null
  if (!blobUrl) return <div className="w-full h-full animate-pulse bg-muted rounded" />
  return <img src={blobUrl} alt={alt} className={className} />
}

// ─── ImageGalleryDialog ───────────────────────────────────────────────────────

function ImageGalleryDialog({
  files,
  initialIndex,
  open,
  onClose,
}: {
  files: FileEntry[]
  initialIndex: number
  open: boolean
  onClose: () => void
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [blobUrls, setBlobUrls] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const blobUrlsRef = useRef<Record<number, string>>({})

  const imageFiles = files.filter(f => isImageFile(f.fileName))

  useEffect(() => {
    if (open) setCurrentIndex(initialIndex)
  }, [open, initialIndex])

  useEffect(() => {
    if (!open || imageFiles.length === 0) return
    const idx = currentIndex
    if (blobUrlsRef.current[idx]) return
    setLoading(true)
    const src = toFileUrl(imageFiles[idx]?.fileUrl ?? '')
    api.getInstance().get(src, { responseType: 'blob' })
      .then((res: any) => {
        const url = URL.createObjectURL(res.data)
        blobUrlsRef.current[idx] = url
        setBlobUrls(prev => ({ ...prev, [idx]: url }))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open, currentIndex, imageFiles.length])

  useEffect(() => {
    if (!open) return
    const preload = (idx: number) => {
      if (idx < 0 || idx >= imageFiles.length || blobUrlsRef.current[idx]) return
      const src = toFileUrl(imageFiles[idx]?.fileUrl ?? '')
      api.getInstance().get(src, { responseType: 'blob' })
        .then((res: any) => {
          const url = URL.createObjectURL(res.data)
          blobUrlsRef.current[idx] = url
          setBlobUrls(prev => ({ ...prev, [idx]: url }))
        })
        .catch(() => {})
    }
    preload(currentIndex - 1)
    preload(currentIndex + 1)
  }, [open, currentIndex, imageFiles.length])

  useEffect(() => {
    return () => { Object.values(blobUrlsRef.current).forEach(url => URL.revokeObjectURL(url)) }
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft')  setCurrentIndex(i => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setCurrentIndex(i => Math.min(imageFiles.length - 1, i + 1))
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, imageFiles.length, onClose])

  if (!open || imageFiles.length === 0) return null

  const currentFile    = imageFiles[currentIndex]
  const currentBlobUrl = blobUrls[currentIndex]
  const hasPrev        = currentIndex > 0
  const hasNext        = currentIndex < imageFiles.length - 1

  const goPrev = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentIndex(i => Math.max(0, i - 1)) }
  const goNext = (e: React.MouseEvent) => { e.stopPropagation(); setCurrentIndex(i => Math.min(imageFiles.length - 1, i + 1)) }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm" onClick={onClose}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 min-w-0">
          <p className="text-white text-sm truncate max-w-[50vw]">{currentFile?.fileName}</p>
          {imageFiles.length > 1 && (
            <span className="text-white/50 text-sm shrink-0">{currentIndex + 1} / {imageFiles.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentBlobUrl && (
            <a href={currentBlobUrl} download={currentFile?.fileName}
              className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
              onClick={e => e.stopPropagation()}>
              <Download className="h-4 w-4" /> ดาวน์โหลด
            </a>
          )}
          <button onClick={onClose}
            className="flex items-center gap-1.5 text-white text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors">
            <X className="h-4 w-4" /> ปิด
          </button>
        </div>
      </div>

      {/* Main image */}
      <div className="flex flex-1 items-center justify-center relative overflow-hidden">
        {hasPrev && (
          <button onClick={goPrev}
            className="absolute left-3 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
            aria-label="ก่อนหน้า">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <div className="relative flex items-center justify-center w-full h-full px-16" onClick={e => e.stopPropagation()}>
          {loading || !currentBlobUrl ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm">กำลังโหลด...</p>
            </div>
          ) : (
            <img key={currentIndex} src={currentBlobUrl} alt={currentFile?.fileName}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
              draggable={false} />
          )}
        </div>
        {hasNext && (
          <button onClick={goNext}
            className="absolute right-3 z-10 flex items-center justify-center w-11 h-11 rounded-full bg-black/50 hover:bg-black/70 text-white transition-all hover:scale-110 active:scale-95 shadow-lg"
            aria-label="ถัดไป">
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {imageFiles.length > 1 && (
        <div className="flex justify-center gap-2 px-4 py-3 bg-black/60 shrink-0 overflow-x-auto" onClick={e => e.stopPropagation()}>
          {imageFiles.map((f, i) => (
            <button key={i} onClick={() => setCurrentIndex(i)}
              className={`shrink-0 w-14 h-14 rounded-md overflow-hidden border-2 transition-all ${
                i === currentIndex ? 'border-white scale-105' : 'border-white/20 opacity-50 hover:opacity-90 hover:border-white/50'
              }`}>
              {blobUrls[i]
                ? <img src={blobUrls[i]} alt={f.fileName} className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-white/10 animate-pulse" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── FilePreviewItem ──────────────────────────────────────────────────────────

function FilePreviewItem({
  file,
  onOpenGallery,
  galleryIndex,
  onDelete,
}: {
  file: FileEntry
  onOpenGallery?: (index: number) => void
  galleryIndex?: number
  onDelete: (fileName: string) => void
}) {
  const isImage = isImageFile(file.fileName)
  const src     = toFileUrl(file.fileUrl)
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    if (isImage && onOpenGallery && galleryIndex !== undefined) {
      onOpenGallery(galleryIndex)
      return
    }
    setLoading(true)
    try {
      const res = await api.getInstance().get(src, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch { toast.error('โหลดไฟล์ไม่สำเร็จ') }
    finally { setLoading(false) }
  }

  return (
    <div className="group relative">
      <div onClick={handleClick} title={file.fileName}
        className="relative flex flex-col items-center justify-center w-20 h-20 rounded-lg border border-border bg-muted hover:border-primary transition-all overflow-hidden shrink-0 cursor-pointer">
        {isImage ? (
          <>
            <AuthImage src={src} alt={file.fileName} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              {loading
                ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <p className="text-[10px] text-white text-center px-1">🔍 ดูเต็มจอ</p>}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-1 p-1 w-full h-full">
            <FileText className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className="text-[10px] text-muted-foreground text-center leading-tight line-clamp-2 break-all px-1">
              {file.fileName}
            </span>
          </div>
        )}
      </div>
      {/* Delete button */}
      <button
        onClick={e => { e.stopPropagation(); onDelete(file.fileName) }}
        className="absolute -top-1.5 -right-1.5 z-10 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:scale-110"
        title="ลบไฟล์">
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}

// ─── FilePreviewGrid ──────────────────────────────────────────────────────────

function FilePreviewGrid({
  files,
  onDelete,
}: {
  files: FileEntry[]
  onDelete: (fileName: string) => void
}) {
  const [galleryOpen,  setGalleryOpen]  = useState(false)
  const [galleryStart, setGalleryStart] = useState(0)

  const visibleFiles = activeFiles(files)
  if (visibleFiles.length === 0) return null

  const imageFiles = visibleFiles.filter(f => isImageFile(f.fileName))

  let imgCursor = 0
  const mapped = visibleFiles.map(f => {
    if (isImageFile(f.fileName)) return { file: f, galleryIndex: imgCursor++ }
    return { file: f, galleryIndex: null }
  })

  return (
    <>
      <div className="flex flex-wrap gap-3 mt-2">
        {mapped.map(({ file, galleryIndex }, i) => (
          <FilePreviewItem
            key={file.fileName + i}
            file={file}
            galleryIndex={galleryIndex ?? undefined}
            onOpenGallery={galleryIndex !== null ? (idx) => { setGalleryStart(idx); setGalleryOpen(true) } : undefined}
            onDelete={onDelete}
          />
        ))}
      </div>
      {imageFiles.length > 0 && (
        <ImageGalleryDialog
          files={imageFiles}
          initialIndex={galleryStart}
          open={galleryOpen}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </>
  )
}

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
      setItems(
        (res.data?.data ?? []).map((q: any) => ({
          id:          q.id,
          detail:      q.detail,
          description: q.description ?? '',
          isChoice:    q.isChoice ?? false,
        }))
      )
    } catch { toast.error('Failed to fetch questions') }
    finally { setLoading(false) }
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
        <div className="absolute left-0 top-full mt-1 z-50 w-[440px] rounded-xl border bg-background shadow-lg overflow-hidden">
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
                    already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{q.detail}</p>
                      {q.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{q.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        q.isChoice ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {q.isChoice ? 'Choice' : 'Text'}
                      </span>
                      {already && <Check className="h-4 w-4 text-emerald-500" />}
                    </div>
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
  const { id, step } = Route.useSearch()
  const { t }           = useTranslation('checklist')
  const { role }        = useAuth()

  // ── i18n options — value = API string, label = translated ─────────────────
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
  const maintenanceOptions = [
    { value: '6 MONTH', label: t('maintenance_6_month') },
    { value: '3 MONTH', label: t('maintenance_3_month') },
  ]
  const resultOptions = [
    { value: 'PASS', label: t('status_pass')     },
    { value: 'FAIL', label: t('status_not_pass') },
  ]
  const calibrationStatusOptions = [
    { value: 'ON TIME', label: t('status_on_time') },
    { value: 'OVERDUE', label: t('status_overdue') },
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

  const [calibrationId, setCalibrationId] = useState<number | null>(null)

  const [imageFiles, setImageFiles] = useState<FileEntry[]>([])
  const [instrFiles, setInstrFiles] = useState<FileEntry[]>([])
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
    calibrationDueDate: '', certificateDate: '',
    results: '', criteria: '', measuringRange: '', accuracy: '', calibrationRange: '',
    responsible: '', responsibleName: '',
    supervisor:  '', supervisorName:  '',
    manager:     '', managerName:     '',
    machineStatus: '', resetPeriod: '', note: '', calibrationStatus: '',
    cancelDate: '', reasonCancel: '',
  })

  // ── Load machine data ─────────────────────────────────────────────────────
  useEffect(() => {
    window.scrollTo(0, 0)
    if (step) setCurrentStep(step)   // ← เพิ่มบรรทัดนี้
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
          .forEach((m: any, i: number) => {
            if (m.dueDate) maintenanceData[`maintenance${i + 1}`] = toDateString(m.dueDate)
          })
      }

      const calList = machineData.calibrationRecords ?? machineData.calibration ?? []
      const cal = Array.isArray(calList) ? (calList[0] ?? {}) : (calList ?? {})
      if (cal?.id) setCalibrationId(cal.id)

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
        maintenance1:      toDateString(maintenanceData.maintenance1),
        maintenance2:      toDateString(maintenanceData.maintenance2),
        maintenance3:      toDateString(maintenanceData.maintenance3),
        maintenance4:      toDateString(maintenanceData.maintenance4),
        calibrationDueDate:  toDateString(cal.calibrationDueDate ?? cal.dueDate),
        certificateDate:     toDateString(cal.certificateDate),
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
        cancelDate:       toDateString(machineData.cancelDate),
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
      setChecklists(
        (res.data?.data ?? []).map((item: any) => ({
          id:          item.id,
          questionId:  item.questionId,
          detail:      item.question?.detail      ?? '',
          description: item.question?.description ?? '',
          resetTime:   item.resetTime             ?? '',
          isChoice:    item.question?.isChoice    ?? item.isChoice ?? false,
          checkStatus: item.checkStatus           ?? false,
        }))
      )
    } catch { toast.error('Failed to load checklist') }
    finally { setChecklistLoading(false) }
  }

  const handleAddQuestion = async (q: QuestionOption) => {
    try {
      await api.getInstance().post('/api/machine-checklist', {
        machineCode: machineData.machineCode,
        questionId:  q.id,
        checkStatus: false,
        resetTime:   '0 0 0 * * 1',
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
      setMaintChecklists(
        list.map((item: any) => ({
          id:          item.id,
          questionId:  item.questionId,
          detail:      item.question?.detail      ?? '',
          description: item.question?.description ?? '',
          resetTime:   item.resetTime             ?? '',
          isChoice:    item.question?.isChoice    ?? item.isChoice ?? false,
          checkStatus: item.checkStatus           ?? false,
        }))
      )
    } catch { toast.error('Failed to load maintenance checklist') }
    finally { setMaintChecklistLoading(false) }
  }

  const handleAddMaintQuestion = async (q: QuestionOption) => {
    try {
      await api.getInstance().post('/api/maintenance-checklist', {
        machineCode: formData.machineCode,
        questionId:  q.id,
        checkStatus: false,
        resetTime:   '0 0 0 * * 1',
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
    const toFileJson = (files: FileEntry[]): string =>
      files.length
        ? JSON.stringify(files.map(f => ({
            fileName:   f.fileName,
            fileUrl:    f.fileUrl ?? toDisplayUrl(f),
            fileType:   f.fileType,
            fileSize:   f.fileSize,
            uploadedBy: f.uploadedBy ?? null,
          })))
        : ''

    const nonActive  = isNonActiveStatus(formData.machineStatus)
    const cancelDate = nonActive ? new Date().toISOString() : null

    const rounds = formData.maintenancePeriod === '3 MONTH' ? 4 : formData.maintenancePeriod === '6 MONTH' ? 2 : 0
    const maintenanceList: any[] = []
    for (let i = 1; i <= rounds; i++) {
      const dateValue = (formData as any)[`maintenance${i}`] as string
      if (!dateValue) continue
      const iso = toISOPreservingDate(dateValue)
      if (!iso) continue
      const d = new Date(iso)
      maintenanceList.push({
        machineName: formData.name,
        years:       d.getFullYear().toString(),
        round:       i,
        dueDate:     iso,
        status:      'On Time',
        planDate:    null, resultDate: null, maintenanceBy: null, note: null, attachment: null,
      })
    }

    const calibrationDTO = formData.calibrationDueDate ? {
      ...(calibrationId ? { id: calibrationId } : {}),
      machineName:       formData.name,
      dueDate:           toISOPreservingDate(formData.calibrationDueDate),
      certificateDate:   toISOPreservingDate(formData.certificateDate),
      results:           formData.results           || null,
      criteria:          formData.criteria          || null,
      measuringRange:    formData.measuringRange    || null,
      accuracy:          formData.accuracy          || null,
      calibrationRange:  formData.calibrationRange  || null,
      calibrationStatus: formData.calibrationStatus || null,
    } : null

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
      image:           toFileJson(resolvedImages),
      workInstruction: toFileJson(resolvedInstrs),
      maintenanceList:  maintenanceList.length ? maintenanceList : null,
      calibration:      calibrationDTO,
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
      const imagesToDelete = imageFiles.filter(f => f._markedForDelete)
      const instrsToDelete = instrFiles.filter(f => f._markedForDelete)
      const activeImages   = activeFiles(imageFiles)
      const activeInstrs   = activeFiles(instrFiles)

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
      if (failedDeletes > 0) console.warn(`${failedDeletes} file(s) could not be deleted from disk`)

      await api.put('/api/machine/update', buildMachineDTO(activeImages, activeInstrs))
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
      setFormData(prev => ({
        ...prev,
        responsible: '', responsibleName: '',
        supervisor: '', supervisorName: '',
        manager: '', managerName: '',
      }))
      return
    }
    const found = cachedResponsible.find(r => String(r.value) === String(val))
    setFormData(prev => ({
      ...prev,
      responsible: val, responsibleName: found?.fullName ?? prev.responsibleName,
      supervisor: '', supervisorName: '',
      manager: '', managerName: '',
    }))
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
        supervisor:     supId,
        supervisorName: supMembers.find(m => String(m.value) === supId)?.fullName ?? '',
        manager:        mgrId,
        managerName:    mgrMembers.find(m => String(m.value) === mgrId)?.fullName ?? '',
      }))
    } catch {}
  }

  // ─── Checklist table (shared) ──────────────────────────────────────────────

  const renderChecklistTable = (
    items:    ChecklistQuestion[],
    loading:  boolean,
    deleting: number[],
    onDelete: (id: number) => void,
    onAdd:    (q: QuestionOption) => void,
  ) => (
    <div className="space-y-4">
      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">{t('loading')}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed">
          {t('no_result')}
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Detail</th>
                <th className="text-left px-4 py-3 font-medium w-[22%]">Description</th>
                <th className="text-left px-4 py-3 font-medium w-[14%]">Reset Time</th>
                <th className="text-left px-4 py-3 font-medium w-[10%]">Type</th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map(item => (
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
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      item.isChoice ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.isChoice ? 'Choice' : 'Text'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={deleting.includes(item.id)}
                      onClick={() => onDelete(item.id)}
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
        <QuestionPicker onAdd={onAdd} existingQuestionIds={items.map(c => c.questionId)} />
        <p className="text-xs text-muted-foreground">
          {items.length} question{items.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )

  // ─── Step content ──────────────────────────────────────────────────────────

  const renderStepContent = () => {
    if (isLoading)
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      )

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
                id="responsible"
                title={t('responsible')}
                label={t('responsible')}
                placeholder={t('select_responsible')}
                value={formData.responsible}
                initialLabel={formData.responsibleName}
                onChange={handleResponsibleChange}
                fetchOptions={fetchResponsible}
                error={errors.responsible}
                required
              />
              <ReadOnlyField label={t('supervisor')} value={formData.supervisorName} />
              <ReadOnlyField label={t('manager')}    value={formData.managerName} />
            </div>

            <SingleSelectField
              key={`status-${formData.machineStatus || 'empty'}`}
              id="machineStatus"
              label={t('machine_status')}
              value={formData.machineStatus ? [formData.machineStatus] : []}
              onChange={v => setField('machineStatus', v[0] || '')}
              options={machineStatusOptions}
              error={errors.machineStatus}
              required
            />

            {isNonActiveStatus(formData.machineStatus) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">{t('reason_cancel')}</label>
                <input
                  type="text"
                  value={formData.reasonCancel}
                  onChange={e => setField('reasonCancel', e.target.value)}
                  placeholder={t('reason_cancel_placeholder')}
                  className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t('note')}</label>
              <textarea
                value={formData.note}
                onChange={e => setField('note', e.target.value)}
                rows={3}
                placeholder={t('note')}
                className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* ── Images upload + preview ── */}
            <FileUploadField
              id="machine-images"
              label={t('images')}
              maxFiles={10}
              value={[]}
              uploadedFiles={[]}
              onChange={handleImagesChange}
              onDownloadFile={handleDownloadFile}
              onDeleteUploadedFile={handleDeleteImage}
              onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })}
            />
            {activeFiles(imageFiles).length > 0 && (
              <FilePreviewGrid files={imageFiles} onDelete={handleDeleteImage} />
            )}

            {/* ── Work instructions upload + preview ── */}
            <FileUploadField
              id="machine-instructions"
              label={t('work_instructions')}
              maxFiles={10}
              value={[]}
              uploadedFiles={[]}
              onChange={handleInstructionsChange}
              onDownloadFile={handleDownloadFile}
              onDeleteUploadedFile={handleDeleteInstruction}
              onFileReject={(f, m) => toast.error(m, { description: `"${f.name}" ${t('could_not_be_uploaded')}` })}
            />
            {activeFiles(instrFiles).length > 0 && (
              <FilePreviewGrid files={instrFiles} onDelete={handleDeleteInstruction} />
            )}
          </div>
        )

      case 'checklist':
        return (
          <div className="px-2 pt-2">
            {renderChecklistTable(
              checklists, checklistLoading, deletingIds,
              handleDeleteChecklist, handleAddQuestion,
            )}
          </div>
        )

      case 'maintenance':
        return (
          <div className="px-2 pt-2 space-y-4">
            <SingleSelectField
              id="maintenancePeriod"
              label={t('maintenance_period')}
              value={[formData.maintenancePeriod]}
              onChange={v => setField('maintenancePeriod', v[0] || '')}
              options={maintenanceOptions}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePickerField id="maintenance1" label={t('round_1')} value={formData.maintenance1} onChange={d => setField('maintenance1', d)} />
              <DatePickerField id="maintenance2" label={t('round_2')} value={formData.maintenance2} onChange={d => setField('maintenance2', d)} />
            </div>
            {formData.maintenancePeriod === '3 MONTH' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DatePickerField id="maintenance3" label={t('round_3')} value={formData.maintenance3} onChange={d => setField('maintenance3', d)} />
                <DatePickerField id="maintenance4" label={t('round_4')} value={formData.maintenance4} onChange={d => setField('maintenance4', d)} />
              </div>
            )}
            <hr className="border-t pt-2" />
            {renderChecklistTable(
              maintChecklists, maintChecklistLoading, maintDeletingIds,
              handleDeleteMaintChecklist, handleAddMaintQuestion,
            )}
          </div>
        )

      case 'calibration':
        return (
          <div className="px-2 pt-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DatePickerField id="calibrationDueDate" label={t('calibration_due_date')} value={formData.calibrationDueDate} onChange={d => setField('calibrationDueDate', d)} />
              <DatePickerField id="certificateDate"    label={t('certificate_date')}     value={formData.certificateDate}    onChange={d => setField('certificateDate', d)} />
              <SingleSelectField
                id="results"
                label={t('results')}
                value={[formData.results]}
                onChange={v => setField('results', v[0] || '')}
                options={resultOptions}
              />
              <TextField id="criteria"         label={t('criteria')}          value={formData.criteria}        onChange={v => setField('criteria', v)} />
              <TextField id="measuringRange"   label={t('measuring_range')}   value={formData.measuringRange}  onChange={v => setField('measuringRange', v)} />
              <TextField id="calibrationRange" label={t('calibration_range')} value={formData.calibrationRange} onChange={v => setField('calibrationRange', v)} />
              <TextField id="accuracy"         label={t('accuracy')}          value={formData.accuracy}        onChange={v => setField('accuracy', v)} />
              <SingleSelectField
                id="calibrationStatus"
                label={t('calibration_status')}
                value={[formData.calibrationStatus]}
                onChange={v => setField('calibrationStatus', v[0] || '')}
                options={calibrationStatusOptions}
              />
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
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText={t('update')}
      cancelLink="/checklist/machine"
    >
      {renderStepContent()}
    </FormLayout>
  )
}