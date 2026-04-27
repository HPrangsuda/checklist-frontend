import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/core/lib/utils"
import { FieldWrapper } from "./FieldWrapper"

interface Option {
  label: string
  value: string
}

interface SelectFieldProps {
  id?: string
  label?: string
  value?: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
  error?: string
  required?: boolean
}

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select an option",
  error,
  required,
}: SelectFieldProps) {
  return (
    <FieldWrapper id={id} label={label} required={required} error={error}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(
            "transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary",
            error && "border-destructive focus:border-destructive focus:ring-destructive"
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldWrapper>
  )
}