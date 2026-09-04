import { useState, useEffect, useRef } from 'react'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { Html5Qrcode } from 'html5-qrcode'
import { QrCode, X, Camera, Flashlight, CheckCircle2, AlertCircle, ChevronDown, Upload } from 'lucide-react'
import { sessionStore } from '@/core/lib/store'
import { useTranslation } from '@/core/contexts/language-context'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/checklist/checklist-records/add')({
  validateSearch: (search: Record<string, unknown>) => ({
    machineCode: (search.machineCode as string) ?? '',
  }),
  component: RouteComponent,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface MachineChecklist {
  id: number
  machineCode: string
  question: {
    id: number
    detail: string
    description: string
  } | null
  answer: string
  checkStatus: boolean
  resetTime: string
  isChoice: boolean
  isDropdown: boolean
}

interface Machine {
  id: number
  machineCode: string
  machineName: string
  machineStatus: string
  frequency?: string
  responsiblePersonId: string
  checkStatus: string
  supervisorId: string
  managerId: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MACHINE_STATUS_VALUES = ['OPERATIONAL', 'UNDER MAINTENANCE'] as const
const CHOICE_VALUES = [
  'READY TO USE',
  'NOT READY (WAITING FOR REPAIR)',
  'NOT READY (UNDER REPAIR)',
  'NOT READY (EQUIPMENT MODIFICATION)',
  'OTHERS',
] as const

const QR_READER_ID = 'qr-checklist-scanner'

const formSteps: FormStep[] = [
  { id: 'form', title: 'Checklist', description: 'Fill in checklist and job details', required: true },
]

// ─── QR Scanner Modal ─────────────────────────────────────────────────────────

function QrScanModal({ onScan, onClose }: { onScan: (code: string) => void; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null)
  const [scanned, setScanned] = useState<string | null>(null)
  const [torch, setTorch] = useState(false)
  const readerRef = useRef<Html5Qrcode | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)

  useEffect(() => {
    let cancelled = false
    const startScan = async () => {
      try {
        const html5Qrcode = new Html5Qrcode(QR_READER_ID)
        readerRef.current = html5Qrcode
        const devices = await Html5Qrcode.getCameras()
        if (!devices || devices.length === 0) { setError('No camera found on this device'); return }
        const backCamera = devices.find(d => /back|rear|environment/i.test(d.label)) ?? devices[devices.length - 1]
        if (cancelled) return
        await html5Qrcode.start(
          backCamera.id,
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decoded) => {
            if (cancelled) return
            let code = decoded
            try { const json = JSON.parse(decoded); if (json?.code) code = json.code } catch {}
            setScanned(code)
            html5Qrcode.stop().catch(() => {})
            setTimeout(() => { if (!cancelled) { onScan(code); onClose() } }, 800)
          },
          () => {}
        )
        const videoEl = document.querySelector(`#${QR_READER_ID} video`) as HTMLVideoElement | null
        trackRef.current = (videoEl?.srcObject as MediaStream | null)?.getVideoTracks()[0] ?? null
      } catch (e: any) {
        if (!cancelled) setError(e?.name === 'NotAllowedError' ? 'Please allow camera access' : 'Unable to open camera')
      }
    }
    startScan()
    return () => {
      cancelled = true
      if (readerRef.current) {
        const state = (readerRef.current as any).getState?.()
        if (state === 2 || state === 3) readerRef.current.stop().catch(() => {})
        readerRef.current = null
      }
    }
  }, [])

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    try { await track.applyConstraints({ advanced: [{ torch: !torch } as any] }); setTorch(t => !t) } catch {}
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-sm mx-4 bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-white">
            <QrCode className="w-5 h-5 text-blue-400" />
            <span className="font-semibold">Scan Machine QR Code</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative aspect-square bg-black overflow-hidden">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center">
              <Camera className="w-12 h-12 text-zinc-600" />
              <p className="text-zinc-400 text-sm">{error}</p>
            </div>
          ) : scanned ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-900">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
              </div>
              <p className="text-green-400 font-semibold">Scan successful!</p>
              <p className="text-zinc-400 text-xs">{scanned}</p>
            </div>
          ) : (
            <>
              <div id={QR_READER_ID} className="w-full h-full" />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-52 h-52">
                  {(['tl', 'tr', 'bl', 'br'] as const).map(pos => (
                    <span key={pos} className={`absolute w-8 h-8 border-blue-400
                      ${pos === 'tl' ? 'top-0 left-0 border-t-4 border-l-4 rounded-tl-lg' : ''}
                      ${pos === 'tr' ? 'top-0 right-0 border-t-4 border-r-4 rounded-tr-lg' : ''}
                      ${pos === 'bl' ? 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-lg' : ''}
                      ${pos === 'br' ? 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-lg' : ''}`}
                    />
                  ))}
                  <div className="absolute left-2 right-2 h-0.5 bg-blue-400/70 rounded-full animate-[scan_2s_ease-in-out_infinite]" />
                </div>
              </div>
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.7)_100%)] pointer-events-none" />
            </>
          )}
        </div>
        {!error && !scanned && (
          <div className="flex items-center justify-between px-5 py-4">
            <p className="text-zinc-500 text-xs">Point camera at the QR Code on the machine</p>
            <button onClick={toggleTorch} className={`p-2 rounded-xl transition-colors ${torch ? 'bg-yellow-400/20 text-yellow-400' : 'text-zinc-500 hover:text-white hover:bg-white/10'}`}>
              <Flashlight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes scan { 0%{top:8px} 50%{top:calc(100% - 8px)} 100%{top:8px} }
        #${QR_READER_ID} > img, #${QR_READER_ID} > div:last-child { display:none!important }
        #${QR_READER_ID} video { width:100%!important; height:100%!important; object-fit:cover!important }
      `}</style>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function RouteComponent() {
  const navigate = useNavigate()
  const { t } = useTranslation('checklist')
  const { machineCode: qrCode } = useSearch({ from: '/checklist/checklist-records/add' })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showQr, setShowQr] = useState(false)

  // Machine data
  const [machine, setMachine] = useState<Machine | null>(null)
  const [checklist, setChecklist] = useState<MachineChecklist[]>([])

  // Form data
  const [selectedStatus, setSelectedStatus] = useState('')
  const [jobDetails, setJobDetails] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // ─── i18n option arrays ───────────────────────────────────────────────────
  const machineStatusOptions = MACHINE_STATUS_VALUES.map(value => ({
    value,
    label: t(`status_${value.toLowerCase().replace(/[\s-]/g, '_')}`),
  }))

  const choiceOptions = CHOICE_VALUES.map((value, idx) => ({
    value,
    label: t([
      'choice_ready',
      'choice_not_ready_repair',
      'choice_not_ready_under_repair',
      'choice_not_ready_modification',
      'choice_others',
    ][idx]),
  }))

  // ─── Auto-load from QR scan search param ─────────────────────────────────
  useEffect(() => {
    if (qrCode) loadMachineData(qrCode)
    else setShowQr(true)
  }, [qrCode])

  const loadMachineData = async (code: string) => {
    try {
      const machineRes = await api.get<any>(`/api/machine/machine-code/${code}`)
      const data: Machine = machineRes?.data ?? machineRes

      setMachine(data)

      const isResponsible = String(sessionStore.state.session?.memberId ?? '') === String(data.responsiblePersonId ?? '')
      const response = await api.get<{ data: any[]; success: boolean }>(
        isResponsible
          ? `/api/machine-checklist/responsible/${code}`
          : `/api/machine-checklist/general/${code}`
      )
      const items: any[] = Array.isArray(response) ? response : (response?.data ?? [])
      setChecklist(
        items.sort((a, b) => a.id - b.id).map(item => ({
          ...item,
          answer: '',
          isDropdown: item.isChoice === true,
        }))
      )
    } catch {
      toast.error(t('machine_not_found'))
      setMachine(null)
    }
  }

  // ─── Answer helpers ───────────────────────────────────────────────────────
  const getAnswer = (item: MachineChecklist) => item.answer ?? ''

  const updateAnswer = (id: number, value: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, answer: value } : item))
    if (errors[`item_${id}`]) setErrors(prev => { const n = { ...prev }; delete n[`item_${id}`]; return n })
  }

  // ─── Validation ───────────────────────────────────────────────────────────
  const isFormValid = () =>
    !!(machine && selectedStatus && jobDetails.trim() && checklist.every(item => getAnswer(item).trim() !== ''))

  const getStepStatus = (stepId: string): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId === 'form') {
      if (Object.keys(errors).length > 0) return 'error'
      return isFormValid() ? 'complete' : 'incomplete'
    }
    return 'empty'
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!machine) { toast.error('Please scan QR Code first'); return }
    if (!selectedStatus) newErrors.selectedStatus = t('please_select_machine_status')
    checklist.forEach(item => { if (!getAnswer(item).trim()) newErrors[`item_${item.id}`] = t('field_required') })
    if (!jobDetails.trim()) newErrors.jobDetails = t('job_detail_required')
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); toast.error(t('please_fill_required_fields')); return }

    setIsSubmitting(true)
    try {
      const session = sessionStore.state.session

      const request = {
        machineId: machine.id,
        machineCode: machine.machineCode,
        machineName: machine.machineName,
        machineStatus: selectedStatus,
        machineChecklist: JSON.stringify(checklist.map(item => ({
          id: item.id,
          questionDetail: item.question?.detail ?? 'N/A',
          answerChoice: getAnswer(item),
          checkStatus: true,
        }))),
        machineNote: note,
        userId: session?.employeeId ?? '',
        userName: `${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim(),
        memberId: session?.memberId ?? null,
        supervisor: machine.supervisorId,
        manager: machine.managerId,
        jobDetail: jobDetails,
        checklistStatus: 'PENDING SUPERVISOR',
      }

      const formData = new FormData()
      formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
      if (file) formData.append('file', file)

      const response = await api.post('/api/checklist/create', formData)

      if (!response.success) {
        toast.error(response.message ?? t('save_failed'))
        return
      }

      if (machine?.id) await api.post(`/api/machine/${machine.id}/sync-to-lark`)

      toast.success(t('checklist_saved'))
      setTimeout(() => navigate({ to: '/checklist/dashboard' }), 1000)
    } catch (error: any) {
      console.error('Submit error:', error)
      const message = error?.response?.data?.message ?? error?.message ?? t('save_failed')
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <FormLayout
        backLink="/checklist/dashboard"
        title={t('checklist_record')}
        subtitle={machine ? `${machine.machineCode} — ${machine.machineName}` : t('scan_qr_to_begin')}
        onSubmit={handleSubmit}
        steps={formSteps}
        currentStep="form"
        onStepChange={() => {}}
        getStepStatus={getStepStatus}
        isSubmitting={isSubmitting}
        isFormValid={isFormValid()}
        submitText={t('save')}
        cancelLink="/checklist/dashboard"
      >
        <div className="px-2 pt-2 space-y-4">

          {/* ── Machine Status ────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('machine_status')} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedStatus}
                onChange={e => {
                  setSelectedStatus(e.target.value)
                  setErrors(p => { const n = { ...p }; delete n.selectedStatus; return n })
                }}
                className={`w-full appearance-none border rounded-lg px-3 py-2.5 pr-9 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition
                  ${errors.selectedStatus ? 'border-red-400' : 'border-border'}`}
              >
                <option value="">{t('please_select')}</option>
                {machineStatusOptions.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            {errors.selectedStatus && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.selectedStatus}
              </p>
            )}
          </div>

          {/* ── Checklist ─────────────────────────────────────── */}
          {checklist.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">{t('no_checklist_items')}</p>
          ) : (
            <div className="space-y-3">
              {checklist.map((item, idx) => {
                const answer = getAnswer(item)
                const hasError = !!errors[`item_${item.id}`]
                return (
                  <div key={item.id} className={`p-4 rounded-xl border ${hasError ? 'border-red-400 bg-red-50/10' : 'border-border bg-muted/20'}`}>
                    <p className="text-sm mb-0.5">
                      {idx + 1}. {item.question?.description ?? 'N/A'} <span className="text-red-500">*</span>
                    </p>
                    {item.question?.description && item.question.description !== 'N/A' && (
                      <p className="text-xs text-muted-foreground mb-2">{item.question.detail}</p>
                    )}
                    {item.isDropdown ? (
                      <div className="relative mt-2">
                        <select
                          value={answer}
                          onChange={e => updateAnswer(item.id, e.target.value)}
                          className={`w-full appearance-none border rounded-lg px-3 py-2 pr-8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                            ${hasError ? 'border-red-400' : 'border-border'}`}
                        >
                          <option value="">{t('please_select')}</option>
                          {choiceOptions.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={answer}
                        onChange={e => updateAnswer(item.id, e.target.value)}
                        placeholder={t('please_specify')}
                        className={`w-full mt-2 border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                          ${hasError ? 'border-red-400' : 'border-border'}`}
                      />
                    )}
                    {hasError && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {t('field_required')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* ── Job Detail ────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              {t('job_detail')} <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-muted-foreground">{t('job_detail_hint')}</p>
            <textarea
              value={jobDetails}
              onChange={e => {
                setJobDetails(e.target.value)
                setErrors(p => { const n = { ...p }; delete n.jobDetails; return n })
              }}
              rows={3}
              placeholder={t('please_specify')}
              className={`w-full border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none
                ${errors.jobDetails ? 'border-red-400' : 'border-border'}`}
            />
            {errors.jobDetails && (
              <p className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.jobDetails}
              </p>
            )}
          </div>

          {/* ── Note ─────────────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t('note')}</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              placeholder={t('note_placeholder')}
              className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* ── Attachments ───────────────────────────────────── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">{t('attachments')}</label>
            {file ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Upload className="w-4 h-4 text-blue-600" />
                  <span className="truncate max-w-[200px]">{file.name}</span>
                  <span className="text-muted-foreground text-xs">({(file.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button type="button" onClick={() => setFile(null)} className="p-1 rounded-lg hover:bg-muted transition">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/5 transition">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t('click_to_upload')}</span>
                <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            )}
          </div>

        </div>
      </FormLayout>

      {showQr && (
        <QrScanModal
          onScan={(code) => loadMachineData(code)}
          onClose={() => setShowQr(false)}
        />
      )}
    </>
  )
}