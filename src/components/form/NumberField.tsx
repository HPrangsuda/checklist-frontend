import { Input } from "@/components/ui/input"
import { cn } from "@/core/lib/utils"
import { FieldWrapper } from "./FieldWrapper"

interface NumberFieldProps {
  id?: string
  label?: string
  value?: number | null
  onChange: (value: number | null) => void
  placeholder?: string
  error?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  required,
  min,
  max,
  step,
}: NumberFieldProps) {
  return (
    <FieldWrapper id={id} label={label} required={required} error={error}>
      <Input
        id={id}
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const num = e.target.value === "" ? null : Number(e.target.value)
          onChange(Number.isNaN(num) ? null : num)
        }}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        className={cn(
          "transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary",
          error && "border-destructive focus:border-destructive focus:ring-destructive"
        )}
      />
    </FieldWrapper>
  )
}
