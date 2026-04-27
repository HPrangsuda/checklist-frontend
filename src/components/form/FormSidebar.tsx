import { CheckCircle2, Circle, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/core/lib/utils"

export type FormStep = {
  id: string
  title: string
  description: string
  required: boolean
}

export type StepStatus = "complete" | "error" | "incomplete" | "empty"

interface FormSidebarProps {
  steps: FormStep[]
  currentStep: string
  onStepChange: (stepId: string) => void
  getStepStatus: (stepId: string) => StepStatus
  className?: string
}

export function FormSidebar({
  steps,
  currentStep,
  onStepChange,
  getStepStatus,
  className,
}: FormSidebarProps) {
  const renderStepIcon = (stepId: string) => {
    const status = getStepStatus(stepId)
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "incomplete":
        return <Circle className="h-5 w-5 text-amber-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const renderStepBadge = (stepId: string) => {
    const status = getStepStatus(stepId)
    const step = steps.find((s) => s.id === stepId)

    if (status === "complete") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
          Complete
        </Badge>
      )
    }
    if (status === "error") {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
          Error
        </Badge>
      )
    }
    if (status === "incomplete" && step?.required) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
          Required
        </Badge>
      )
    }
    return null
  }

  return (
    <div className={cn("w-74 bg-white border-r border-gray-100 form-action-h", className)}>
      <nav className="p-4">
        <div className="space-y-2">
          {steps.map((step) => {
            const isActive = currentStep === step.id
            const status = getStepStatus(step.id)
            return (
              <button
                key={step.id}
                onClick={() => onStepChange(step.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200",
                  isActive
                    ? "bg-blue-50 border-2 border-blue-200 text-blue-900"
                    : "hover:bg-gray-50 border-2 border-transparent text-gray-700",
                  status === "error" && !isActive && "border-red-200 bg-red-50",
                )}
              >
                <div className="flex-shrink-0">{renderStepIcon(step.id)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn("text-sm font-normal truncate", isActive ? "text-blue-900" : "text-gray-900")}>
                      {step.title}
                    </p>
                    {renderStepBadge(step.id)}
                  </div>
                  <p className={cn("text-xs truncate mt-1", isActive ? "text-blue-700" : "text-gray-500")}>
                    {step.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}