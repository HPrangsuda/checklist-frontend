import type React from "react"
import { useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/core/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "@tanstack/react-router"

import { DatePickerField } from "@/components/form/DatePickerField"
import { TextField } from "@/components/form/TextField"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { MultiSelectField } from "@/components/form/MultiSelectField"
import { TiptapEditor } from "@/components/editor/editor"
import { FileUploadField } from "@/components/form/FileUploadField"

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

// Define the priority options
const priorityOptions = [{ name: "High" }, { name: "Medium" }, { name: "Normal" }, { name: "Low" }]

// Define the currency options
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

// Mock data for departments, products, and leads
const departments = [
  { id: "dept1", name: "Sales" },
  { id: "dept2", name: "Marketing" },
  { id: "dept3", name: "Technical" },
  { id: "dept4", name: "Healthcare" },
  { id: "dept5", name: "Retail" },
]

const products = [
  { id: "prod1", name: "Enterprise CRM" },
  { id: "prod2", name: "Analytics Dashboard" },
  { id: "prod3", name: "Mobile App Integration" },
  { id: "prod4", name: "Cloud Storage Solution" },
  { id: "prod5", name: "Security Suite" },
]

const leads = [
  { id: "lead1", name: "Acme Corporation" },
  { id: "lead2", name: "City Hospital" },
  { id: "lead3", name: "SuperMart Chain" },
  { id: "lead4", name: "Tech Innovators Inc." },
  { id: "lead5", name: "Global Finance Group" },
]

interface OpportunityFormProps {
  data?: any
}

export default function OpportunityForm({ data }: OpportunityFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState("required")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    name: data?.name || "",
    probability: data?.probability || 0,
    priority: data?.priority || "Normal",
    opportunityStage: data?.opportunityStage || "New",
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
    accessDepartmentIds: data?.accessDepartmentIds || []
  })

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      const newErrors = { ...errors }
      delete newErrors[field]
      setErrors(newErrors)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Opportunity name is required"
    if (!formData.leadId) newErrors.leadId = "Lead is required"
    if (!formData.opportunityStage) newErrors.opportunityStage = "Stage is required"
    if (!formData.priority) newErrors.priority = "Priority is required"
    if (formData.probability < 0 || formData.probability > 100) newErrors.probability = "Probability must be between 0 and 100"
    if (!formData.departmentId) newErrors.departmentId = "Department is required"
    if (!formData.closeAt) newErrors.closeAt = "Close date is required"
    if (!formData.currency) newErrors.currency = "Currency is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return setActiveTab("required")
    console.log("Form JSON:", formData)
    setIsSubmitting(true)
    await new Promise(res => setTimeout(res, 1000))
    router.navigate({ to: "/" })
    setIsSubmitting(false)
  }

  // Check if required section is complete
  const isRequiredSectionComplete = () => {
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

  // Check if financial section has any data
  const hasFinancialData = () => {
    return !!(formData.amount > 0 || formData.qutotationNo.trim() || formData.conditionTerm.trim() || formData.followAt)
  }

  // Check if products section has any data
  const hasProductsData = () => {
    return !!(formData.productIds.length > 0 || formData.testProductIds.length > 0)
  }

  // Check if description section has any data
  const hasDescriptionData = () => {
    return !!formData.description.trim()
  }

  // Check if permissions section has any data
  const hasPermissionsData = () => {
    return !!(
      !formData.allowAllDepartments &&
      (formData.accessDepartmentIds.length > 0)
    )
  }
  const [content, setContent] = useState('<p>Hello, world!</p>');

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Accordion
        type="single"
        collapsible
        defaultValue="required"
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full">
        <AccordionItem
          value="required"
          className={cn("border rounded-lg shadow-none px-2 overflow-hidden",
            Object.keys(errors).some((key) =>
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
            ) && "border-destructive",
          )}
        >
          <AccordionTrigger className="py-4 px-2 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 text-md font-normal">
              Required Information
              {isRequiredSectionComplete() ? (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Complete
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2 bg-amber-50 text-amber-700 border-amber-200",
                    Object.keys(errors).some((key) =>
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
                    ) && "bg-red-50 text-red-700 border-red-200",
                  )}
                >
                  {Object.keys(errors).some((key) =>
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
                  ) ? (
                    <>
                      <XCircle className="h-3 w-3 mr-1" /> Error
                    </>
                  ) : (
                    <>Required</>
                  )}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 pb-6 pt-2">
            <TextField id="name" label="Opportunity Name" isAI={true}
              value={formData.name}
              onChange={v => handleInputChange("name", v)}
              error={errors.name} required />
            <MultiSelectField id="leadId" label="Lead"
              values={formData.leadId ? [formData.leadId] : []}
              onChange={v => handleInputChange("leadId", v[0] || "")}
              options={leads.map(l => ({ value: l.id, label: l.name }))}
              error={errors.leadId} required />
            <MultiSelectField id="opportunityStage" label="Opportunity Stage"
              values={[formData.opportunityStage]}
              onChange={v => handleInputChange("opportunityStage", v[0] || "")}
              options={opportunityStages.map(s => ({ value: s.value, label: s.name }))}
              error={errors.opportunityStage} required />
            <MultiSelectField id="priority" label="Priority"
              values={[formData.priority]}
              onChange={v => handleInputChange("priority", v[0] || "")}
              options={priorityOptions.map(o => ({ value: o.name, label: o.name }))}
              error={errors.priority} required />
            <TextField id="probability" label="Probability (%)"
              type="number" value={formData.probability}
              onChange={v => handleInputChange("probability", Number(v))}
              error={errors.probability} required />
            <MultiSelectField id="department" label="Department"
              values={formData.departmentId ? [formData.departmentId] : []}
              onChange={v => handleInputChange("departmentId", v[0] || "")}
              options={departments.map(d => ({ value: d.id, label: d.name }))}
              error={errors.departmentId} required />
            <DatePickerField id="closeAt" label="Close Date"
              value={formData.closeAt}
              onChange={d => handleInputChange("closeAt", d)}
              error={errors.closeAt} required />
            <MultiSelectField id="currency" label="Currency"
              values={[formData.currency]}
              onChange={v => handleInputChange("currency", v[0] || "")}
              options={currencyOptions.map(c => ({ value: c.name, label: c.name }))}
              error={errors.currency} required />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="financial" className="border rounded-lg shadow-none px-2 mt-4 overflow-hidden">
          <AccordionTrigger className="py-4 px-2 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 text-md font-normal">
              Financial Details
              {hasFinancialData() && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Added
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 pb-6 pt-2">
            <TextField id="amount" label="Amount"
              type="number"
              value={formData.amount}
              onChange={(v) => handleInputChange("amount", Number.parseFloat(v))}
              placeholder="Enter amount" />
            <TextField id="quotationNo" label="Quotation No."
              value={formData.qutotationNo}
              onChange={(v) => handleInputChange("qutotationNo", v)}
              placeholder="Enter quotation number" />
            <TextField id="conditionTerm" label="Condition Terms"
              value={formData.conditionTerm}
              onChange={(v) => handleInputChange("conditionTerm", v)}
              placeholder="Enter condition terms" />
            <DatePickerField id="followDate" label="Follow-up Date"
              value={formData.followAt}
              onChange={(date) => handleInputChange("followAt", date)} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="products" className="border rounded-lg shadow-none px-2 mt-4 overflow-hidden">
          <AccordionTrigger className="py-4 px-2 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 text-md font-normal">
              Products
              {hasProductsData() && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Added
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-6 pt-2">
            <MultiSelectField
              id="products"
              label="Products"
              values={formData.productIds}
              onChange={(selected) => handleInputChange("productIds", selected)}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select products"
            />
            <MultiSelectField
              id="testProducts"
              label="Test Products"
              values={formData.testProductIds}
              onChange={(selected) => handleInputChange("testProductIds", selected)}
              options={products.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="Select test products"
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="description" className="border rounded-lg shadow-none px-2 mt-4 overflow-hidden">
          <AccordionTrigger className="py-4 px-2 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 text-md font-normal">
              Description & Attachments
              {hasDescriptionData() && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Added
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-6 pt-2">
            <div className="space-y-6">
              <TiptapEditor
                content={formData.description}
                onChange={(h, j) => {
                  setFormData(prev => ({ ...prev, description: h }))
                }}
              />
              <FileUploadField
                id="attachments"
                label="Attachments"
                value={formData.files}
                onChange={(files) => handleInputChange("files", files)}
                onFileReject={(file, message) =>
                  toast.error(message, { description: `"${file.name}" could not be uploaded` })
                }
              />
            </div>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="permissions" className="border rounded-lg shadow-none px-2 mt-4">
          <AccordionTrigger className="py-4 px-2 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2 text-md font-normal">
              Permissions
              {hasPermissionsData() && (
                <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Added
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 pb-6 pt-2">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allow-all-departments"
                  checked={formData.allowAllDepartments}
                  onCheckedChange={(checked) => handleInputChange("allowAllDepartments", !!checked)}
                />
                <Label htmlFor="allow-all-departments" className="font-normal">
                  Give this record permission to other department
                </Label>
              </div>

              {formData.allowAllDepartments && (
                <div className="space-y-4 mt-4 pl-6">
                  <div className="space-y-3">
                    <Label className="font-normal">Departments with access</Label>
                    
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <div className="flex justify-end gap-4 mt-10">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.navigate({ to: "/crm/opportunities" })}
          className="px-6"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>{data ? "Updating..." : "Creating..."}</span>
            </div>
          ) : data ? (
            "Update Opportunity"
          ) : (
            "Create Opportunity"
          )}
        </Button>
      </div>
    </form>
  )
}
