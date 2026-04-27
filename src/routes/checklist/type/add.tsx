import { SingleSelectField } from '@/components/form/SingleSelectField'
import { TextField } from '@/components/form/TextField'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { ServerSingleSelect } from '@/components/select/server-single-select'
import { useTranslation } from '@/core/contexts/language-context'
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

/* =======================
   Route
======================= */
export const Route = createFileRoute('/checklist/type/add')({
  component: RouteComponent,
})

/* =======================
   Constants
======================= */
const formSteps: FormStep[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Basic information',
    required: true,
  },
]

const statusOptions = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

const modeOptions = [
  { value: 'NEW_GROUP', label: 'Create New Group' },
  { value: 'ADD_TYPE', label: 'Add Type to Existing Group' },
]

interface MachineGroupOption {
  label: string
  value: string
}

/* =======================
   Component
======================= */
function RouteComponent({ data }: any) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState('general')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    mode: data?.mode || 'NEW_GROUP',
    machineGroupId: data?.machineGroupId || '',
    machineGroupName: data?.machineGroupName || '',
    machineTypeName: data?.machineTypeName || '',
    status: data?.status || 'ACTIVE',
  })

  /* =======================
     Validation
  ======================= */
  const validateRequiredFields = () => {
    const newErrors: Record<string, string> = {}

    if (formData.mode === 'NEW_GROUP') {
      if (!formData.machineGroupName.trim()) {
        newErrors.machineGroupName = 'Machine group name is required'
      }
    }

    if (formData.mode === 'ADD_TYPE') {
      if (!formData.machineGroupId) {
        newErrors.machineGroupId = 'Please select a machine group'
      }
    }

    if (!formData.machineTypeName.trim()) {
      newErrors.machineTypeName = 'Machine type name is required'
    }

    if (!formData.status) {
      newErrors.status = 'Status is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormValid = () => {
    if (formData.mode === 'NEW_GROUP') {
      return (
        !!formData.machineGroupName.trim() &&
        !!formData.machineTypeName.trim() &&
        !!formData.status
      )
    }

    return (
      !!formData.machineGroupId &&
      !!formData.machineTypeName.trim() &&
      !!formData.status
    )
  }

  const getStepStatus = (
    stepId: string
  ): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId !== 'general') return 'empty'
    if (Object.keys(errors).length > 0) return 'error'
    return isFormValid() ? 'complete' : 'incomplete'
  }

  /* =======================
     DTO Builder
  ======================= */
  const buildDTO = () => {
    // Case 1: NEW_GROUP — send machineGroupName (no machineGroupId)
    if (formData.mode === 'NEW_GROUP') {
      return {
        machineGroupName: formData.machineGroupName.trim(),
        machineTypeName: formData.machineTypeName.trim(),
        status: formData.status,
        // machineGroupId intentionally omitted — backend detects NEW_GROUP by its absence
      }
    }

    // Case 2: ADD_TYPE — send machineGroupId (backend resolves machineGroupName from DB)
    const gid = formData.machineGroupId && formData.machineGroupId !== '0'
      ? formData.machineGroupId
      : undefined
    return {
      machineGroupId: gid,
      machineTypeName: formData.machineTypeName.trim(),
      status: formData.status,
    }
  }

  /* =======================
     Submit
  ======================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateRequiredFields()) {
      setCurrentStep('general')
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    try {
      const dto = buildDTO()
      await api.post('/api/type/create', dto)

      toast.success('Machine type created successfully')

      setTimeout(() => {
        navigate({ to: '/checklist/type' })
      }, 800)
    } catch (error: any) {
      // Spring WebFlux ResponseStatusException format:
      // { status, error, detail, path }  ← Spring 6+
      const errorMessage: string =
        error.response?.data?.detail ??
        error.response?.data?.message ??
        'Failed to create machine type'

      toast.error('Create failed', { description: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* =======================
     Handlers
  ======================= */
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const handleModeChange = (mode: string) => {
    setFormData({
      mode,
      machineGroupId: '',
      machineGroupName: '',
      machineTypeName: '',
      status: 'ACTIVE',
    })
    setErrors({})
  }

  /* =======================
     Fetch Groups
  ======================= */
  const fetchMachineGroups = async (
    keyword: string,
    _index: number
  ): Promise<{ data: MachineGroupOption[]; hasMore: boolean }> => {
    try {
      const params: any = {}
      if (keyword.trim()) params.keyword = keyword.trim()

      // ใช้ axios instance โดยตรงพร้อม Authorization header
      const session = (api as any).getSession?.() ?? null
      const headers: any = {}
      if (session?.accessToken) {
        headers.Authorization = `Bearer ${session.accessToken}`
      }

      const res = await api.getInstance().get<
        Array<{ machineGroupId: string; machineGroupName: string }>
      >('/api/type/groups/distinct', { params, headers })

      const list = Array.isArray(res.data) ? res.data : []

      console.log('[fetchMachineGroups] raw list:', list)

      return {
        data: list.map(g => ({
          label: g.machineGroupName,
          value: g.machineGroupId,   // ควรเป็น "07", "05" ฯลฯ
        })),
        hasMore: false,
      }
    } catch {
      toast.error('Failed to fetch machine groups')
      return { data: [], hasMore: false }
    }
  }

  const changeMachineGroup = (selected: string) => {
    handleInputChange('machineGroupId', selected || '')
  }
  
  /* =======================
     Render
  ======================= */
  return (
    <FormLayout
      backLink="/checklist/type"
      title="Add Machine Type"
      subtitle="Create a new machine type"
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText="Submit"
      cancelLink="/checklist/type"
    >
      <div className="px-2 pt-2 space-y-4">
        <SingleSelectField
          id="mode"
          label="Mode"
          value={[formData.mode]}
          onChange={v => handleModeChange(v[0])}
          options={modeOptions}
          required
        />

        {/* ── Case 1: NEW_GROUP ── */}
        {formData.mode === 'NEW_GROUP' && (
          <TextField
            id="machineGroupName"
            label="Machine Group Name"
            value={formData.machineGroupName}
            onChange={v => handleInputChange('machineGroupName', v)}
            error={errors.machineGroupName}
            required
          />
        )}

        {/* ── Case 2: ADD_TYPE ── */}
        {formData.mode === 'ADD_TYPE' && (
          <ServerSingleSelect
            id="machineGroupId"
            title="Machine Group"
            label="Select Machine Group"
            placeholder="Select existing group"
            value={formData.machineGroupId}
            onChange={changeMachineGroup}
            fetchOptions={fetchMachineGroups}
            error={errors.machineGroupId}
            required
          />
        )}

        <TextField
          id="machineTypeName"
          label="Machine Type Name"
          value={formData.machineTypeName}
          onChange={v => handleInputChange('machineTypeName', v)}
          error={errors.machineTypeName}
          required
        />

        <SingleSelectField
          id="status"
          label="Status"
          value={[formData.status]}
          onChange={v => handleInputChange('status', v[0])}
          options={statusOptions}
          error={errors.status}
          required
        />
      </div>
    </FormLayout>
  )
}