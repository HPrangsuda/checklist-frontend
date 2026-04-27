import { cn } from "@/core/lib/utils"
import { useState } from "react"

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

export function FormSidebar({ steps, currentStep, onStepChange, getStepStatus, className }: FormSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  return (
    <>
      <div
        className={cn(
          "bg-white border-r border-gray-200",
          "md:w-75 md:fixed md:left-0 md:top-[130px] md:h-[calc(100vh-180px)] md:overflow-y-auto md:z-10",
          "fixed inset-x-0 top-[130px] z-40 md:relative",
          "max-h-[calc(100vh-138px)] md:max-h-full",
          isMobileOpen ? "block" : "hidden md:block",
          className,
        )}>
        <nav className="p-4 h-full overflow-y-auto">
          <div className="space-y-1">
            {steps.map((step) => {
              const isActive = currentStep === step.id
              const status = getStepStatus(step.id)
              return (
                <button
                  key={step.id}
                  onClick={() => {
                    onStepChange(step.id)
                    setIsMobileOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 p-3 md:p-4 rounded-lg text-left transition-all duration-200 hover:bg-gray-50",
                    "min-h-[60px] md:min-h-auto",
                    isActive && "bg-blue-50 border border-blue-200",
                    status === "complete" && !isActive && "bg-green-50 border border-green-200",
                  )}>
                  <div className="flex-shrink-0 mt-1 md:mt-0.5">
                    <div
                      className={cn(
                        "w-5 h-5 md:w-4 md:h-4 rounded-full border-2 flex items-center justify-center",
                        isActive
                          ? "border-blue-500 bg-blue-500"
                          : status === "complete"
                            ? "border-green-500 bg-green-500"
                            : status === "error"
                              ? "border-red-500 bg-red-500"
                              : "border-gray-300",
                      )}>
                      {(isActive || status === "complete" || status === "error") && (
                        <div className="w-2.5 h-2.5 md:w-2 md:h-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p
                        className={cn(
                          "text-sm md:text-sm font-normal",
                          isActive ? "text-blue-900" : status === "complete" ? "text-green-900" : "text-gray-900",
                        )}>
                        {step.title}
                      </p>
                      {step.required && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800 whitespace-nowrap">
                          Required
                        </span>
                      )}
                      {status === "complete" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                          Added
                        </span>
                      )}
                    </div>
                    <p
                      className={cn(
                        "text-sm leading-relaxed",
                        isActive ? "text-blue-700" : status === "complete" ? "text-green-700" : "text-gray-500",
                      )}>
                      {step.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </nav>
      </div>
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-opacity-75 z-30 md:hidden top-[130px]"
          onClick={() => setIsMobileOpen(false)}
        />
      )}
    </>
  )
}