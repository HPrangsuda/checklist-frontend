import type React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { FormSidebar } from "./form-sidebar"
import { cn } from "@/core/lib/utils"

export interface FormStep {
  id: string
  title: string
  description: string
  required: boolean
}

export interface FormLayoutProps {
  backLink: string
  title: string
  subtitle?: string
  children: ReactNode
  onSubmit: (e: React.FormEvent) => void
  steps: FormStep[]
  currentStep: string
  onStepChange: (stepId: string) => void
  getStepStatus: (stepId: string) => "complete" | "error" | "incomplete" | "empty"
  isSubmitting?: boolean
  isFormValid?: boolean
  submitText?: string
  cancelLink?: string
  className?: string
}

export function FormLayout({
  backLink,
  title,
  subtitle,
  children,
  onSubmit,
  steps,
  currentStep,
  onStepChange,
  getStepStatus,
  isSubmitting = false,
  isFormValid = true,
  submitText = "Submit",
  cancelLink,
  className,
}: FormLayoutProps) {
  const router = useRouter()
  const finalCancelLink = cancelLink || backLink

  const currentStepIndex = steps.findIndex((step) => step.id === currentStep)
  const canGoPrevious = currentStepIndex > 0
  const canGoNext = currentStepIndex < steps.length - 1
  const isLastStep = currentStepIndex === steps.length - 1

  const handlePrevious = () => { if (canGoPrevious) onStepChange(steps[currentStepIndex - 1].id) }
  const handleNext     = () => { if (canGoNext)     onStepChange(steps[currentStepIndex + 1].id) }
  const handleBackClick   = () => router.navigate({ to: backLink })
  const handleCancelClick = () => router.navigate({ to: finalCancelLink })

  return (
    // FIX: ใช้ -m-4 sm:-m-6 เพื่อยกเลิก padding ของ <main> แล้ว layout เองทั้งหมด
    // ทำให้ได้ full-height layout โดยไม่ต้องใช้ fixed
    <div className="-m-4 sm:-m-6 flex flex-col" style={{ height: 'calc(100vh - 57px)' }}>

      {/* Header — ไม่ใช้ fixed, ใช้ shrink-0 แทน ติดอยู่บนสุดของ flex column */}
      <div className="flex items-center gap-3 sm:gap-4 pt-3 pb-3 pl-4 pr-4 bg-white border-b border-gray-200 shrink-0 z-20">
        <Button
          variant="outline"
          size="sm"
          className="text-xs sm:text-sm font-normal bg-transparent shrink-0"
          onClick={handleBackClick}>
          <ArrowLeft className="mr-0 h-3 w-3 sm:h-4 sm:w-4" />
          <span className="hidden lg:block xs:inline">Back</span>
        </Button>

        <div className="min-w-0 flex-1">
          <h1 className="text-md font-normal truncate">{title}</h1>
          {subtitle && <p className="text-muted-foreground text-sm truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm font-normal bg-transparent"
            onClick={handleCancelClick}>
            <span className="hidden sm:inline">Cancel</span>
            <span className="sm:hidden">✕</span>
          </Button>
          <Button
            type="submit"
            form="main-form"
            size="sm"
            className="text-xs sm:text-sm font-normal bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isSubmitting || !isFormValid}>
            <span className="hidden sm:inline">{isSubmitting ? "Submitting..." : submitText}</span>
            <span className="sm:hidden">✓</span>
          </Button>
        </div>
      </div>

      {/* Body — flex row, scroll ที่นี่ */}
      <div className="flex flex-1 overflow-hidden bg-gray-50">

        {/* Sidebar — ซ้าย, ไม่ scroll */}
        <div className="hidden lg:flex flex-col w-75 shrink-0 overflow-y-auto border-r border-gray-100 bg-white">
          <FormSidebar
            steps={steps}
            currentStep={currentStep}
            onStepChange={onStepChange}
            getStepStatus={getStepStatus}
          />
        </div>

        {/* Content — ขวา, scroll ที่นี่ */}
        <div className="flex-1 overflow-y-auto">
          <form id="main-form" onSubmit={onSubmit}>
            <div className="p-4">
              <div className={cn(
                "bg-white rounded-lg border border-gray-200",
                "min-h-[400px]",
                "flex flex-col",
                className,
              )}>
                <div className="flex-1 p-4">{children}</div>
                <div className="border-t border-gray-200 p-4 bg-white rounded-b-md flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevious}
                      disabled={!canGoPrevious}
                      className="flex items-center gap-2 bg-transparent font-normal">
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-3">
                      {isLastStep ? (
                        <Button
                          type="submit"
                          disabled={isSubmitting || !isFormValid}
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                          {isSubmitting ? "Submitting..." : submitText}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleNext}
                          disabled={!canGoNext}
                          className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 font-normal">
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

      </div>
    </div>
  )
}