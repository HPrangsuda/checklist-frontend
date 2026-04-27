"use client"

import * as React from "react"
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

interface SingleSelectFieldProps {
  id?: string
  label?: string
  value: string[]
  onChange: (value: string[]) => void
  options: Option[]
  placeholder?: string
  error?: string
  required?: boolean
  searchable?: boolean
}

export function SingleSelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "Select option",
  error,
  required,
  searchable = true,
}: SingleSelectFieldProps) {
  const [open, setOpen] = React.useState(false)

  const selectedValue = value.length > 0 ? value[0] : ""

  return (
    <FieldWrapper id={id} label={label} required={required} error={error}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between font-normal",
              !selectedValue && "text-muted-foreground",
              error && "border-destructive focus:border-destructive focus:ring-destructive"
            )}>
            {selectedValue
              ? options.find((option) => option.value === selectedValue)?.label
              : placeholder}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            {searchable && <CommandInput placeholder="Search..." />}
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    if (option.value === selectedValue) {
                      onChange([])
                    } else {
                      onChange([option.value])
                    }
                    setOpen(false)
                  }}>
                  {option.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      selectedValue === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  )
}
