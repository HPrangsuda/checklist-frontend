import { SingleSelectField } from '@/components/form/SingleSelectField'
import { FormLayout } from '@/components/layout/form-layout'
import type { FormStep } from '@/components/layout/form-sidebar'
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

/* =======================
   Route — รับ id ผ่าน search param
======================= */
export const Route = createFileRoute('/checklist/type/edit')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: Number(search.id) || 0,
  }),
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
  { value: 'ACTIVE',   label: 'Active'   },
  { value: 'INACTIVE', label: 'Inactive' },
]

/* =======================
   Component
======================= */
function RouteComponent() {
  const navigate  = useNavigate()
  const { id }    = Route.useSearch()

  const [isSubmitting, setIsSubmitting]   = useState(false)
  const [isLoading,    setIsLoading]      = useState(true)
  const [currentStep,  setCurrentStep]    = useState('general')
  const [errors,       setErrors]         = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    machineGroupId:   '',
    machineGroupName: '',
    machineTypeId:    '',
    machineTypeName:  '',
    status:           'ACTIVE',
  })

  /* =======================
     Load existing data
  ======================= */
  useEffect(() => {
    if (!id) {
      toast.error('Invalid id')
      navigate({ to: '/checklist/type' })
      return
    }

    const fetchData = async () => {
      try {
        setIsLoading(true)
        // ใช้ axios instance โดยตรงเพื่อป้องกัน api.get() spread { ...res.data, status: httpStatus }
        // ทับ field "status" ของ DTO ด้วย HTTP status code 200
        const axiosRes = await api.getInstance().get<{
          id: number
          machineGroupId: string
          machineGroupName: string
          machineTypeId: string
          machineTypeName: string
          status: string
        }>(`/api/type/${id}`)

        const res = axiosRes.data

        setFormData({
          machineGroupId:   res.machineGroupId   ?? '',
          machineGroupName: res.machineGroupName ?? '',
          machineTypeId:    res.machineTypeId    ?? '',
          machineTypeName:  res.machineTypeName  ?? '',
          status:           res.status           ?? 'ACTIVE',
        })
      } catch {
        toast.error('Failed to load machine type')
        navigate({ to: '/checklist/type' })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id])

  /* =======================
     Validation
  ======================= */
  const isFormValid = () => !!formData.status

  const getStepStatus = (
    stepId: string
  ): 'complete' | 'error' | 'incomplete' | 'empty' => {
    if (stepId !== 'general') return 'empty'
    if (Object.keys(errors).length > 0) return 'error'
    return isFormValid() ? 'complete' : 'incomplete'
  }

  /* =======================
     Submit — อัปเดตเฉพาะ status
  ======================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isFormValid()) {
      toast.error('Please select a status')
      return
    }

    setIsSubmitting(true)

    try {
      await api.put('/api/type/update', { id, status: formData.status })
      toast.success('Machine type updated successfully')
      setTimeout(() => navigate({ to: '/checklist/type' }), 800)
    } catch (error: any) {
      const errorMessage: string =
        error.response?.data?.detail ??
        error.response?.data?.message ??
        'Failed to update machine type'
      toast.error('Update failed', { description: errorMessage })
    } finally {
      setIsSubmitting(false)
    }
  }

  /* =======================
     Render
  ======================= */
  if (isLoading) return null

  return (
    <FormLayout
      backLink="/checklist/type"
      title="Edit Machine Type"
      subtitle={`${formData.machineGroupName} › ${formData.machineTypeName}`}
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText="Save"
      cancelLink="/checklist/type"
    >
      <div className="px-2 pt-2 space-y-4">

        {/* Read-only info */}
        <div className="grid grid-cols-2 gap-4 rounded-md border bg-muted/40 p-4 text-sm">
          <div>
            <p className="text-muted-foreground mb-0.5">Group ID</p>
            <p className="font-medium">{formData.machineGroupId}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Group Name</p>
            <p className="font-medium">{formData.machineGroupName}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Type ID</p>
            <p className="font-medium">{formData.machineTypeId}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-0.5">Type Name</p>
            <p className="font-medium">{formData.machineTypeName}</p>
          </div>
        </div>

        {/* Editable field */}
        <SingleSelectField
          id="status"
          label="Status"
          value={[formData.status]}
          onChange={v => setFormData(prev => ({ ...prev, status: v[0] }))}
          options={statusOptions}
          error={errors.status}
          required
        />
      </div>
    </FormLayout>
  )
}