import { Check, PlusCircle, XCircle } from "lucide-react"
import { cn } from "@/core/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useDebounce } from "@/core/hooks/use-debounce"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "@/core/contexts/language-context";

export interface Option {
  label: string
  value: string
}

interface DataTableServerSelectProps {
  title: string
  value?: string | string[]
  onChange?: (value: string | string[]) => void
  multiple?: boolean
  fetchOptions: (search: string, offset: number) => Promise<{
    items: Option[]
    hasMore: boolean
    total: number
  }>
}

export function DataTableServerSelect({
  title,
  value,
  onChange,
  multiple = false,
  fetchOptions,
}: DataTableServerSelectProps) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Option[]>([])
  const [selectedOptionsList, setSelectedOptionsList] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [hasMore, setHasMore] = useState(true)
  const [shouldFetch, setShouldFetch] = useState(false)
  const { t } = useTranslation();
  
  const debouncedSearch = useDebounce(search, 300)
  const containerRef = useRef<HTMLDivElement>(null)
  
  const selectedValues = useMemo(() => {
    if (!value) return new Set<string>()
    return new Set(Array.isArray(value) ? value : [value])
  }, [value])

  const rowVirtualizer = useVirtualizer({
    count: hasMore ? options.length + 1 : options.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    overscan: 5,
  })

  const loadOptions = useCallback(async (offset = 0, searchTerm = "") => {
    try {
      setLoading(true)
      const result = await fetchOptions(searchTerm, offset)
      if (offset === 0) {
        setOptions(result.items)
      } else {
        setOptions(prev => [...prev, ...result.items])
      }
      setHasMore(result.hasMore)
    } finally {
      setLoading(false)
    }
  }, [fetchOptions])


  useEffect(() => {
    if (open && shouldFetch) {
      setOptions([])
      loadOptions(0, debouncedSearch)
      setShouldFetch(false)
    }
  }, [debouncedSearch, open, loadOptions, shouldFetch])

  const lastItemRef = useCallback((node: HTMLDivElement | null) => {
    if (node && hasMore && !loading && open) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          loadOptions(options.length, debouncedSearch)
        }
      })
      observer.observe(node)
      return () => observer.disconnect()
    }
  }, [hasMore, loading, options.length, debouncedSearch, open])

  const handleSelect = useCallback((option: Option) => {
    if (!onChange) return
    
    if (multiple) {
      const newSelected = new Set(selectedValues)
      if (newSelected.has(option.value)) {
        newSelected.delete(option.value)
        setSelectedOptionsList(prev => prev.filter(opt => opt.value !== option.value))
      } else {
        newSelected.add(option.value)
        setSelectedOptionsList(prev => [...prev, option])
      }
      onChange(Array.from(newSelected))
    } else {
      onChange(option.value)
      setSelectedOptionsList([option])
      setOpen(false)
    }
  }, [multiple, onChange, selectedValues])

  const onReset = useCallback(() => {
    onChange?.(multiple ? [] : "")
    setSelectedOptionsList([])
    setOpen(false)
  }, [multiple, onChange])

  const handleOpen = useCallback((isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen) {
      setShouldFetch(true)
    } else {
      setSearch("")
      setOptions([])
    }
  }, [])

  const handleSearch = useCallback((value: string) => {
    setSearch(value)
    setShouldFetch(true)
  }, [])

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="border-dashed">
          {selectedValues?.size > 0 ? (
            <div
              role="button"
              aria-label={`Clear ${title} filter`}
              tabIndex={0}
              onClick={onReset}
              className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <XCircle className="h-4 w-4" />
            </div>
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          <span className="ml-2">{title}</span>
          {selectedValues?.size > 0 && (
            <>
              <Separator
                orientation="vertical"
                className="mx-2 h-4"
              />
              <div className="flex items-center gap-1">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} {t("selected")}
                  </Badge>
                ) : (
                  selectedOptionsList.map((option) => (
                    <Badge
                      variant="secondary"
                      key={option.value}
                      className="rounded-sm px-1 font-normal"
                    >
                      {option.label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={`${t("Search")} ${title.toLowerCase()}...`}
            value={search}
            onValueChange={handleSearch}
          />
          <CommandList ref={containerRef} className="max-h-[200px]">
            <CommandEmpty>{t("No Results")}</CommandEmpty>
            <CommandGroup>
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const option = options[virtualRow.index]
                  if (!option) {
                    return loading ? (
                      <CommandItem
                        key="loading"
                        className="justify-center text-muted-foreground"
                      >
                        {t("Loading More")}
                      </CommandItem>
                    ) : null
                  }

                  const isSelected = selectedValues.has(option.value)
                  return (
                    <CommandItem
                      key={option.value}
                      ref={virtualRow.index === options.length - 1 ? lastItemRef : null}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      onSelect={() => handleSelect(option)}>
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}>
                        <Check className={cn("h-4 w-4")} />
                      </div>
                      {option.label}
                    </CommandItem>
                  )
                })}
              </div>
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <Separator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      onChange?.(multiple ? [] : "")
                      setSelectedOptionsList([])
                      setOpen(false)
                    }}
                    className="justify-center text-center">
                    {t("Clear Selection")}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 