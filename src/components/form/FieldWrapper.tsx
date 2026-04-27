import { Label } from "@/components/ui/label"
import { cn } from "@/core/lib/utils"

interface FieldWrapperProps {
  id?: string
  label?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}

export function FieldWrapper({ id, label, required, error, children }: FieldWrapperProps) {
  return (
    <div className="space-y-2">
      {label && (
        <Label
          htmlFor={id}
          className={cn("font-normal", error && "text-destructive")}
        >
          {label}{" "}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}

      {children}

      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}