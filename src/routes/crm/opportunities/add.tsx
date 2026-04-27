import { TiptapEditor } from '@/components/editor/editor'
import { DatePickerField } from '@/components/form/DatePickerField'
import { FileUploadField } from '@/components/form/FileUploadField'
import { TableSelectorInput, type TableColumn } from "@/components/form/FormTableField"
import { NumberField } from '@/components/form/NumberField'
import { SingleSelectField } from '@/components/form/SingleSelectField'
import { TextField } from '@/components/form/TextField'
import { FormLayout, type FormStep } from '@/components/layout/form-layout'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { toast } from 'sonner'

export const Route = createFileRoute('/crm/opportunities/add')({
  component: RouteComponent,
})


const formSteps: FormStep[] = [
  { id: "general", title: "General", description: "Basic information", required: true },
  { id: "description", title: "Description", description: "Financial details and amounts", required: false },
  { id: "products", title: "Products", description: "Associated products", required: false },
  { id: "attachments", title: "Attachments", description: "Files and descriptions", required: false },
  { id: "permissions", title: "Permissions", description: "Access and settings", required: false },
]
const leads = [
  { id: "lead1", name: "Acme Corporation" },
  { id: "lead2", name: "City Hospital" },
  { id: "lead3", name: "SuperMart Chain" },
  { id: "lead4", name: "Tech Innovators Inc." },
  { id: "lead5", name: "Global Finance Group" },
]
const opportunityStages = [
  { name: "New", value: "New" },
  { name: "Hand Over", value: "Hand_Over" },
  { name: "Survey & Proposal", value: "Survey_Proposal" },
  { name: "Evaluation & Testing", value: "Evaluation_Testing" },
  { name: "Quotation", value: "Quotation" },
  { name: "Negotiation", value: "Negotiation" },
  { name: "Announcement", value: "Announcement" },
  { name: "Sign Contract", value: "Sign_Contract" },
  { name: "Down Payment", value: "Down_Payment" },
  { name: "Implement & Training", value: "Implement_Training" },
  { name: "Closed Won", value: "Closed_Won" },
  { name: "Closed Lost", value: "Closed_Lost" },
  { name: "On Hold", value: "On_Hold" },
  { name: "Cancel", value: "Cancel" },
]
const priorityOptions = [{ name: "High" }, { name: "Medium" }, { name: "Normal" }, { name: "Low" }]

const departments = [
  { id: "dept1", name: "Sales" },
  { id: "dept2", name: "Marketing" },
  { id: "dept3", name: "Technical" },
  { id: "dept4", name: "Healthcare" },
  { id: "dept5", name: "Retail" },
]
const visibility = [
  { id: "team", name: "Team Member Only" },
  { id: "public", name: "Everyone can see" },
  { id: "custom", name: "Selected Team Only" },
]
const currencyOptions = [
  { name: "THB" },
  { name: "USD" },
  { name: "INR" },
  { name: "EUR" },
  { name: "JPY" },
  { name: "CNY" },
  { name: "KRW" },
  { name: "VND" },
  { name: "HKD" },
]
const uploadedFiles = [
  {
    id: "file1",
    name: "document1.pdf",
    size: 1024000, // 1MB
    url: "https://example.com/files/document1.pdf",
    type: "application/pdf"
  },
  {
    id: "file2",
    name: "image1.jpg",
    size: 512000, // 512KB
    url: "https://example.com/files/image1.jpg",
    type: "image/jpeg"
  }
];

const leadList: any[] = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Admin", status: "Active", department: "Engineering" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "User", status: "Active", department: "Marketing" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", role: "Manager", status: "Inactive", department: "Sales" },
  { id: 4, name: "Alice Brown", email: "alice@example.com", role: "User", status: "Active", department: "HR" },
  {
    id: 5,
    name: "Charlie Wilson",
    email: "charlie@example.com",
    role: "Admin",
    status: "Active",
    department: "Engineering",
  },
  { id: 6, name: "Diana Davis", email: "diana@example.com", role: "User", status: "Pending", department: "Marketing" },
  { id: 7, name: "Eve Miller", email: "eve@example.com", role: "Manager", status: "Active", department: "Sales" },
  {
    id: 8,
    name: "Frank Garcia",
    email: "frank@example.com",
    role: "User",
    status: "Active",
    department: "Engineering",
  },
  { id: 9, name: "Grace Lee", email: "grace@example.com", role: "Admin", status: "Inactive", department: "HR" },
  { id: 10, name: "Henry Taylor", email: "henry@example.com", role: "User", status: "Active", department: "Marketing" },
  { id: 11, name: "Ivy Anderson", email: "ivy@example.com", role: "Manager", status: "Active", department: "Sales" },
  {
    id: 12,
    name: "Jack Thomas",
    email: "jack@example.com",
    role: "User",
    status: "Pending",
    department: "Engineering",
  },
]

const leadColumns: TableColumn[] = [
  { key: "name", label: "Name" },
  { key: "industry", label: "Industry" }
]

function RouteComponent({ data }: any) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState("general")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: data?.name || "",
    probability: data?.probability || 0,
    priority: data?.priority || "Normal",
    opportunityStage: data?.opportunityStage,
    followAt: data?.followAt ? new Date(data.followAt) : null,
    closeAt: data?.closeAt ? new Date(data.closeAt) : null,
    currency: data?.currency || "THB",
    amount: data?.amount || 0,
    qutotationNo: data?.qutotationNo || "",
    conditionTerm: data?.conditionTerm || "",
    departmentId: data?.department || "",
    productIds: data?.products || [],
    testProductIds: data?.testProducts || [],
    leadId: data?.lead || "",
    description: data?.description || "",
    files: data?.files || [],
    isCollaborate: data?.isCollaborate || false,
    collaboratorIds: data?.collaboratorIds || [],
    isDefaultProducts: data?.isDefaultProducts || false,
    isDefaultTestProducts: data?.isDefaultTestProducts || false,
    allowAllDepartments: data?.allowAllDepartments || false,
    accessDepartmentIds: data?.accessDepartmentIds || [],
    visibility: data?.visibility || "team"
  })

  const validateRequiredFields = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Opportunity name is required"
    if (!formData.leadId) newErrors.leadId = "Lead is required"
    if (!formData.opportunityStage) newErrors.opportunityStage = "Stage is required"
    if (!formData.priority) newErrors.priority = "Priority is required"
    if (formData.probability < 0 || formData.probability > 100)
      newErrors.probability = "Probability must be between 0 and 100"
    if (!formData.departmentId) newErrors.departmentId = "Department is required"
    if (!formData.closeAt) newErrors.closeAt = "Close date is required"
    if (!formData.currency) newErrors.currency = "Currency is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isFormValid = () => {
    return !!(
      formData.name.trim() &&
      formData.leadId &&
      formData.opportunityStage &&
      formData.priority &&
      formData.probability >= 0 &&
      formData.probability <= 100 &&
      formData.departmentId &&
      formData.closeAt &&
      formData.currency
    )
  }

  const getStepStatus = (stepId: string): "complete" | "error" | "incomplete" | "empty" => {
    switch (stepId) {
      case "general":
        const hasRequiredData = isFormValid()
        const hasErrors = Object.keys(errors).some((key) =>
          [
            "name",
            "leadId",
            "opportunityStage",
            "priority",
            "probability",
            "departmentId",
            "closeAt",
            "currency",
          ].includes(key),
        )
        if (hasErrors) return "error"
        return hasRequiredData ? "complete" : "incomplete"

      case "financial":
        return !!(
          formData.amount > 0 ||
          formData.qutotationNo.trim() ||
          formData.conditionTerm.trim() ||
          formData.followAt
        )
          ? "complete"
          : "empty"

      case "products":
        return !!(formData.productIds.length > 0 || formData.testProductIds.length > 0) ? "complete" : "empty"

      case "attachments":
        return !!formData.description.trim() ? "complete" : "empty"

      case "permissions":
        return !!(formData.allowAllDepartments && formData.accessDepartmentIds.length > 0) ? "complete" : "empty"

      default:
        return "empty"
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateRequiredFields()) {
      setCurrentStep("general")
      return
    }
    console.log("Form JSON:", formData)
    setIsSubmitting(true)
    await new Promise((res) => setTimeout(res, 1000))
    toast.success("Opportunity created successfully!")
    setIsSubmitting(false)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const handleDownloadFile = (file: any) => {

  };

  const handleDeleteUploadedFile = async (fileId: any) => {

  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "general":
        return (
          <div className="px-2 pt-2 space-y-4">
            <div>
              <TextField id="name" label="Opportunity Name" isAI={true}
                value={formData.name}
                onChange={v => handleInputChange("name", v)}
                error={errors.name} required />
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <SingleSelectField id="opportunityStage" label="Opportunity Stage"
                value={[formData.opportunityStage]}
                onChange={v => handleInputChange("opportunityStage", v[0] || "")}
                options={opportunityStages.map(s => ({ value: s.value, label: s.name }))}
                error={errors.opportunityStage} required />
              <SingleSelectField id="priority" label="Priority"
                value={[formData.priority]}
                onChange={v => handleInputChange("priority", v[0] || "")}
                options={priorityOptions.map(o => ({ value: o.name, label: o.name }))}
                error={errors.priority} required />
              <NumberField id="probability" label="Probability (%)"
                min={0} max={100} value={formData.probability}
                onChange={v => handleInputChange("probability", Number(v))}
                error={errors.probability} required />
              <SingleSelectField id="department" label="Department"
                value={formData.departmentId ? [formData.departmentId] : []}
                onChange={v => handleInputChange("departmentId", v[0] || "")}
                options={departments.map(d => ({ value: d.id, label: d.name }))}
                error={errors.departmentId} required />
              <DatePickerField id="closeAt" label="Close Date"
                value={formData.closeAt}
                onChange={d => handleInputChange("closeAt", d)}
                error={errors.closeAt} required />
              <SingleSelectField id="currency" label="Currency"
                value={[formData.currency]}
                onChange={v => handleInputChange("currency", v[0] || "")}
                options={currencyOptions.map(c => ({ value: c.name, label: c.name }))}
                error={errors.currency} required />
            </div>
            <div>
              <TableSelectorInput
                label="Lead"
                data={leadList}
                columns={leadColumns}
                value={formData.leadId ? leadList.filter(lead => formData.leadId.includes(lead.id)) : []}
                onSelectionChange={(selected) => setFormData({
                  ...formData,
                  leadId: selected.map(item => item.id)
                })}
                limit={1}
                pageSize={5}
                customBadge={({ item, onRemove }) => (
                  <div className="flex items-center bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs">
                    {item.name}
                    <button onClick={onRemove} className="ml-1 text-red-500 hover:text-red-700">×</button>
                  </div>
                )}
              />
            </div>
          </div>
        )

      case "description":
        return (
          <div className="space-y-4 sm:space-y-6">
            <TiptapEditor
              content={formData.description}
              onChange={(h) => {
                setFormData(prev => ({ ...prev, description: h }))
              }}
            />
          </div>
        )

      case "products":
        return (
          <div className="space-y-4 sm:space-y-6">
            <div>
              <h2 className="text-lg sm:text-xl font-medium text-gray-900 mb-2">Products & Services</h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                Select products and test products for this opportunity
              </p>
            </div>

          </div>
        )

      case "attachments":
        return (
          <div>
            <FileUploadField
              id="attachments"
              label=""
              maxFiles={10}
              value={formData.files}
              onChange={(files) => handleInputChange("files", files)}
              uploadedFiles={uploadedFiles}
              onDownloadFile={handleDownloadFile}
              onDeleteUploadedFile={handleDeleteUploadedFile}
              onFileReject={(file, message) =>
                toast.error(message, { description: `"${file.name}" could not be uploaded` })
              }
            />
          </div>
        )

      case "permissions":
        return (
          <div className="grid grid-cols-1 gap-6">
            <SingleSelectField id="visibility" label="Visibility"
              value={[formData.visibility]}
              onChange={v => handleInputChange("visibility", v[0] || "")}
              options={visibility.map(c => ({ value: c.id, label: c.name }))}
              error={errors.visibility} required />
          </div>
        )

      default:
        return null
    }
  }


  return (
    <FormLayout
      backLink="/crm/opportunities"
      title="Add New Opportunity"
      subtitle="Create a new crm opportunity"
      onSubmit={handleSubmit}
      steps={formSteps}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      getStepStatus={getStepStatus}
      isSubmitting={isSubmitting}
      isFormValid={isFormValid()}
      submitText={data ? "Update" : "Submit"}
      cancelLink="/crm/opportunities">
      {renderStepContent()}
    </FormLayout>
  )
}
