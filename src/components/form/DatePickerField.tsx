import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { format } from "date-fns"
import { FieldWrapper } from "./FieldWrapper"

interface DatePickerFieldProps {
  id?: string
  label?: string
  value?: Date | null
  onChange: (date: Date | null) => void
  error?: string
  required?: boolean
}

export function DatePickerField({ id, label, value, onChange, error, required }: DatePickerFieldProps) {
  return (
    <FieldWrapper id={id} label={label} required={required} error={error}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal transition-all duration-200 focus:border-primary focus:ring-1 focus:ring-primary shadow-none",
              !value && "text-muted-foreground",
              error && "border-destructive focus:border-destructive focus:ring-destructive"
            )}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP") : "Select date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
           <Calendar
            mode="single"
            selected={value || undefined}
            onSelect={(date) => onChange(date ?? null)}
            required={false}
          />
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  )
}
