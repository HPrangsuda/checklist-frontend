import { useState, useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { AlertCircle } from 'lucide-react'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/checklist/question/edit')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0,
  }),
  component: RouteComponent,
})

// ─── Constants ────────────────────────────────────────────────────────────────

const formSteps: FormStep[] = [
  { id: 'form', title: 'Question Info', description: 'Edit question details', required: true },
]

// ─── Field Components ─────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-red-500 text-xs flex items-center gap-1 mt-1">
      <AlertCircle className="w-3 h-3 shrink-0" /> {message}
    </p>
  )
}

function FieldWrapper({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
      <FieldError message={error} />
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

function RouteComponent() {
  const navigate = useNavigate()
  const { id }   = Route.useSearch()

  const [detail,       setDetail]       = useState('')
  const [description,  setDescription]  = useState('')
  const [errors,       setErrors]       = useState<{ detail?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading,    setIsLoading]    = useState(true)

  // ─── Load existing data ────────────────────────────────────────────────

  useEffect(() => {
    if (!id) {
      toast.error('Invalid id')
      navigate({ to: '/checklist/question' })
      return
    }

    const fetchQuestion = async () => {
      try {
        setIsLoading(true)
        const axiosRes = await api.getInstance().get<any>(`/api/question/${id}`)
        const res = axiosRes.data

        setDetail(res.detail ?? '')
        setDescription(res.description ?? '')
      } catch {
        toast.error('Failed to load question')
        navigate({ to: '/checklist/question' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestion()
  }, [id])

  const inputClass = (hasError: boolean) =>
    `w-full border rounded-lg px-3 py-2.5 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition
     ${hasError ? 'border-red-400' : 'border-border'}`

  const isFormValid = () => !!detail.trim()

  const getStepStatus = (stepId: string): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId === 'form') {
      if (errors.detail) return 'error'
      return isFormValid() ? 'complete' : 'incomplete'
    }
    return 'empty'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!detail.trim()) {
      setErrors({ detail: 'Question detail is required' })
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.put<any>('/api/question/update', {
        id,
        detail: detail.trim(),
        description: description.trim() || null,
      })

      if (!response?.success) {
        toast.error('Update failed', { description: response?.message ?? 'Failed to update question' })
        return
      }

      toast.success('Question updated successfully')
      setTimeout(() => navigate({ to: '/checklist/question' }), 800)
    } catch (error: any) {
      const errorMessage: string =
        error?.response?.data?.detail  ??
        error?.response?.data?.message ??
        error?.message                 ??
        'Failed to update question'
      toast.error('Update failed', { description: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) return null

  return (
    <FormLayout
      backLink="/checklist/question"
      title="Edit Question"
      subtitle={detail ? detail.slice(0, 60) + (detail.length > 60 ? '...' : '') : 'Edit question'}
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep="form"
      onStepChange={() => {}}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText="Save Changes"
      cancelLink="/checklist/question"
    >
      <div className="px-2 pt-2 space-y-4">

        <FieldWrapper label="Detail" required error={errors.detail}>
          <textarea
            rows={4}
            value={detail}
            onChange={e => {
              setDetail(e.target.value)
              if (errors.detail) setErrors({})
            }}
            placeholder="Enter question detail..."
            className={inputClass(!!errors.detail)}
          />
        </FieldWrapper>

        <FieldWrapper label="Description" hint="Optional additional information">
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter description (optional)..."
            className={inputClass(false)}
          />
        </FieldWrapper>

      </div>
    </FormLayout>
  )
}