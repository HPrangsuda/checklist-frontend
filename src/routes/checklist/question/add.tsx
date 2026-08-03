import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { AlertCircle } from 'lucide-react'
import { useTranslation } from '@/core/contexts/language-context'

// ─── Route ────────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/checklist/question/add')({
  component: RouteComponent,
})

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
  const { t }    = useTranslation('checklist')

  const formSteps: FormStep[] = [
    { id: 'form', title: t('question_info'), description: t('question_info_desc'), required: true },
  ]

  const [detail,       setDetail]       = useState('')
  const [description,  setDescription]  = useState('')
  const [isChoice,     setIsChoice]     = useState(true)
  const [errors,       setErrors]       = useState<{ detail?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      setErrors({ detail: t('question_detail_required') })
      toast.error(t('fill_required_fields'))
      return
    }

    setIsSubmitting(true)
    try {
      const response = await api.post<any>('/api/question/create', {
        detail:      detail.trim(),
        description: description.trim() || null,
        isChoice,
      })

      if (!response?.success) {
        toast.error(t('question_create_failed'), { description: response?.message ?? '' })
        return
      }

      toast.success(t('question_created'))
      setTimeout(() => navigate({ to: '/checklist/question' }), 800)
    } catch (error: any) {
      const errorMessage: string =
        error?.response?.data?.detail  ??
        error?.response?.data?.message ??
        error?.message                 ??
        t('question_create_failed')
      toast.error(t('question_create_failed'), { description: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FormLayout
      backLink="/checklist/question"
      title={t('add_question')}
      subtitle={t('add_question_subtitle')}
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep="form"
      onStepChange={() => {}}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText={t('question_create_btn')}
      cancelLink="/checklist/question"
    >
      <div className="px-2 pt-2 space-y-4">

        <FieldWrapper label={t('question_detail')} required error={errors.detail}>
          <textarea
            rows={4}
            value={detail}
            onChange={e => {
              setDetail(e.target.value)
              if (errors.detail) setErrors({})
            }}
            placeholder={t('question_detail_placeholder')}
            className={inputClass(!!errors.detail)}
          />
        </FieldWrapper>

        <FieldWrapper label={t('question_description')} hint={t('question_description_hint')}>
          <textarea
            rows={3}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('question_description_placeholder')}
            className={inputClass(false)}
          />
        </FieldWrapper>

        {/* ─── Is Choice Toggle ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">{t('question_is_choice')}</p>
            <p className="text-xs text-muted-foreground">{t('question_is_choice_hint')}</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isChoice}
            onClick={() => setIsChoice(v => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isChoice ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200
              ${isChoice ? 'translate-x-5' : 'translate-x-0'}`}
            />
          </button>
        </div>

      </div>
    </FormLayout>
  )
}