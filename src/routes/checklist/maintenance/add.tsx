import { FormLayout } from '@/components/layout/form-layout'
import { sessionStore } from '@/core/lib/store'
import api from '@/services/api'
import { createFileRoute, useNavigate, useSearch } from '@tanstack/react-router'
import { ChevronDown, AlertCircle, Upload, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/checklist/maintenance/add')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id ?? 0),
  }),
  component: RouteComponent,
})

interface MaintenanceDetail {
  id: number
  machineCode: string
  machineName: string
  years: string
  round: number
  dueDate: string
  planDate: string
  maintenanceType: string
  status: string
  checklistItems: ChecklistItem[]
}

interface ChecklistItem {
  id: number
  machineCode: string
  questionId: number
  questionDetail: string
  questionDescription: string
  isChoice: boolean
  checkStatus: boolean
  answer: string
}

function RouteComponent() {
  const navigate = useNavigate()
  const { id } = useSearch({ from: '/checklist/maintenance/add' })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<MaintenanceDetail | null>(null)
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])

  const [selectedStatus, setSelectedStatus] = useState('')
  const [maintenanceBy, setMaintenanceBy] = useState<'INTERNAL' | 'EXTERNAL'>('INTERNAL')
  const [responsibleMaintenance, setResponsibleMaintenance] = useState('')
  const [actualDate, setActualDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const MACHINE_STATUSES = ['OPERATIONAL', 'NON-OPERATIONAL', 'UNDER MAINTENANCE']
  const CHOICES = [
    'Ready to use',
    'Not ready (Waiting for repair)',
    'Not ready (Under repair)',
    'Not ready (Equipment modification)',
    'Others',
  ]

  useEffect(() => {
    if (id) loadDetail(id)
  }, [id])

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

  const getAnswer = (item: ChecklistItem) => item.answer ?? ''

  const updateAnswer = (id: number, value: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, answer: value } : item))
    if (errors[`item_${id}`]) setErrors(prev => { const n = { ...prev }; delete n[`item_${id}`]; return n })
  }

  const isFormValid = () =>
    !!(detail && selectedStatus && actualDate && checklist.every(item => getAnswer(item).trim() !== ''))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: Record<string, string> = {}
    if (!detail) { toast.error('No maintenance record loaded'); return }
    if (!selectedStatus) newErrors.selectedStatus = 'Please select machine status'
    if (!actualDate) newErrors.actualDate = 'Please select actual date'
    checklist.forEach(item => { if (!getAnswer(item).trim()) newErrors[`item_${item.id}`] = 'This field is required' })
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); toast.error('Please fill in all required fields'); return }

    setIsSubmitting(true)
    try {
      const session = sessionStore.state.session
      const request = {
        maintenanceRecordId: detail.id,
        machineCode: detail.machineCode,
        machineName: detail.machineName,
        machineStatus: selectedStatus,
        machineChecklist: JSON.stringify(checklist.map(item => ({
          id: item.id,
          questionDetail: item.questionDetail ?? 'N/A',
          answerChoice: getAnswer(item),
          checkStatus: true,
        }))),
        machineNote: note,
        userId: session?.employeeId ?? '',
        userName: `${session?.firstName ?? ''} ${session?.lastName ?? ''}`.trim(),
        supervisor: '',
        manager: '',
        jobDetail: `Maintenance Round ${detail.round}/${detail.years}`,
        actualDate: actualDate,
        dueDate: detail.dueDate,
        maintenanceBy: maintenanceBy,
        responsibleMaintenance: maintenanceBy === 'INTERNAL' ? responsibleMaintenance : '',
      }

      const formData = new FormData()
      formData.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }))
      if (file) formData.append('file', file)

      const response = await api.post<{ success: boolean; message?: string }>('/api/maintenance-record/create', formData)

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

  if (!detail) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  )

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
          <label className="text-sm font-medium">Machine Status <span className="text-red-500">*</span></label>
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setErrors(p => { const n = {...p}; delete n.selectedStatus; return n }) }}
              className={`w-full appearance-none border rounded-lg px-3 py-2.5 pr-9 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.selectedStatus ? 'border-red-400' : 'border-border'}`}
            >
              <option value="">Please select</option>
              {MACHINE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {errors.selectedStatus && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.selectedStatus}</p>}
        </div>

        {/* Actual Date */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Actual Date <span className="text-red-500">*</span></label>
          <input
            type="date"
            value={actualDate}
            onChange={e => { setActualDate(e.target.value); setErrors(p => { const n = {...p}; delete n.actualDate; return n }) }}
            className={`w-full border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.actualDate ? 'border-red-400' : 'border-border'}`}
          />
          {errors.actualDate && <p className="text-red-500 text-xs flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {errors.actualDate}</p>}
        </div>

        {/* Maintenance By */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Maintenance By <span className="text-red-500">*</span></label>
          <div className="flex gap-3">
            {(['INTERNAL', 'EXTERNAL'] as const).map(type => (
              <button
                key={type}
                type="button"
                onClick={() => setMaintenanceBy(type)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition ${maintenanceBy === type ? 'bg-blue-600 text-white border-blue-600' : 'border-border bg-background'}`}
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
              className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Checklist */}
        {checklist.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-6">No checklist items</p>
        ) : (
          <div className="space-y-3">
            {checklist.map((item, idx) => {
              const answer = getAnswer(item)
              const hasError = !!errors[`item_${item.id}`]
              return (
                <div key={item.id} className={`p-4 rounded-xl border ${hasError ? 'border-red-400 bg-red-50/10' : 'border-border bg-muted/20'}`}>
                  <p className="text-sm mb-0.5">{idx + 1}. {item.questionDescription ?? 'N/A'} <span className="text-red-500">*</span></p>
                  {item.questionDetail && <p className="text-xs text-muted-foreground mb-2">{item.questionDetail}</p>}
                  {item.isChoice ? (
                    <div className="relative mt-2">
                      <select
                        value={answer}
                        onChange={e => updateAnswer(item.id, e.target.value)}
                        className={`w-full appearance-none border rounded-lg px-3 py-2 pr-8 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-400' : 'border-border'}`}
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
                      className={`w-full mt-2 border rounded-lg px-3 py-2 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${hasError ? 'border-red-400' : 'border-border'}`}
                    />
                  )}
                  {hasError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> This field is required</p>}
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
            className="w-full border border-border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Attachment */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Attachment</label>
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
              <span className="text-sm text-muted-foreground">Click to upload image</span>
              <input type="file" accept="image/*" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>

      </div>
    </FormLayout>
  )
}