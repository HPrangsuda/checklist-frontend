import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command"
import { cn } from "@/core/lib/utils"
import { FieldWrapper } from "./FieldWrapper"

interface Option {
  label: string
  value: string
}

interface MultiSelectFieldProps {
  id?: string
  label?: string
  values: string[]
  onChange: (values: string[]) => void
  options: Option[]
  placeholder?: string
  error?: string
  required?: boolean
  searchable?: boolean
}

export function MultiSelectField({
  id,
  label,
  values,
  onChange,
  options,
  placeholder = "Select options",
  error,
  required,
  searchable = true,
}: MultiSelectFieldProps) {
  const toggleValue = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val))
    } else {
      onChange([...values, val])
    }
  }

  return (
    <FieldWrapper id={id} label={label} required={required} error={error}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "w-full justify-between",
              !values.length && "text-muted-foreground",
              error && "border-destructive focus:border-destructive focus:ring-destructive"
            )}
          >
            {values.length
              ? `${values.length} selected`
              : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0">
          <Command>
            {searchable && <CommandInput placeholder="Search..." />}
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => toggleValue(option.value)}
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      values.includes(option.value) ? "bg-primary text-primary-foreground" : "opacity-50"
                    )}
                  >
                    {values.includes(option.value) && <Check className="h-3 w-3" />}
                  </div>
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  )
}