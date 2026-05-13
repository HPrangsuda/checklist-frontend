import { XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FieldWrapper } from '../form/FieldWrapper'
import { cn } from '@/core/lib/utils'
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useDebounce } from '@/core/hooks/use-debounce'
import { useTranslation } from '@/core/contexts/language-context'

export interface Option {
  label: any
  value: any
}

export interface ServerSingleSelectProps {
  id?: string
  label?: string
  required?: boolean
  error?: string
  title: string
  value?: any
  initialLabel?: string          // ← เพิ่ม: แสดงชื่อทันทีโดยไม่ต้อง fetch
  onChange?: (value: any | null) => void
  fetchOptions: (
    keyword: string,
    index: number,
    selected: Array<any>,
  ) => Promise<{
    data: Array<Option>
    hasMore: boolean
  }>
  renderOption?: (option: Option, isSelected: boolean) => React.ReactNode
  placeholder?: string
}

export function ServerSingleSelect({
  id,
  label,
  required,
  error,
  title,
  value,
  initialLabel,
  onChange,
  fetchOptions,
  renderOption,
  placeholder,
}: ServerSingleSelectProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<Array<Option>>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  // ── selectedOption: ถ้ามี initialLabel ให้ใช้เลย ไม่ต้อง fetch ────────────
  const [selectedOption, setSelectedOption] = useState<Option | null>(() => {
    if (value !== undefined && value !== null && value !== '' && initialLabel) {
      return { value, label: initialLabel }
    }
    return null
  })

  const debouncedKeyword = useDebounce(keyword, 300)
  const containerRef = useRef<HTMLDivElement>(null)
  const pageRef = useRef(0)

  // ── sync value/initialLabel จากภายนอก ────────────────────────────────────
  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      // ถ้ามี initialLabel และยังไม่ได้เปิด dropdown → ใช้ initialLabel โดยตรง
      if (initialLabel && !open) {
        setSelectedOption(prev => {
          // อัปเดตเฉพาะถ้า value เปลี่ยน
          if (prev?.value === value) return prev
          return { value, label: initialLabel }
        })
        return
      }
      // ถ้าไม่มี initialLabel → fetch จาก API เหมือนเดิม
      const fetchSelectedOption = async () => {
        try {
          const result = await fetchOptions('', 0, [value])
          const found = result.data.find((item) => item.value === value)
          if (found) setSelectedOption(found)
          else if (initialLabel) setSelectedOption({ value, label: initialLabel })
        } catch {
          if (initialLabel) setSelectedOption({ value, label: initialLabel })
        }
      }
      fetchSelectedOption()
    } else {
      setSelectedOption(null)
    }
  }, [value, initialLabel])

  const sortedOptions = useMemo(() => {
    if (!options.length) return []
    const selectedVal = selectedOption?.value
    const selectedList: Array<Option> = []
    const unselectedList: Array<Option> = []
    options.forEach((option) => {
      if (option.value === selectedVal) selectedList.push(option)
      else unselectedList.push(option)
    })
    return [...selectedList, ...unselectedList]
  }, [options, selectedOption])

  const loadOptions = useCallback(
    async (index = 0, searchTerm = '') => {
      try {
        if (index === 0) pageRef.current = 0
        setLoading(true)
        setFetchError(false)
        await new Promise((resolve) => setTimeout(resolve, 300))
        const result = await fetchOptions(searchTerm, index, [])
        if (index === 0) {
          setOptions(result.data || [])
          containerRef.current?.scrollTo({ top: 0 })
        } else {
          setOptions((prev) => [...prev, ...(result.data || [])])
        }
        setHasMore(result.hasMore || false)
        setHasSearched(true)
      } catch {
        if (index === 0) setOptions([])
        setHasMore(false)
        setHasSearched(true)
        setFetchError(true)
      } finally {
        setLoading(false)
      }
    },
    [fetchOptions],
  )

  const loadOptionsRef = useRef(loadOptions)
  loadOptionsRef.current = loadOptions

  useEffect(() => {
    if (open) {
      setHasSearched(false)
      setFetchError(false)
      loadOptionsRef.current(0, debouncedKeyword)
    }
  }, [debouncedKeyword, open])

  const sentinelRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || !hasMore || !open || sortedOptions.length === 0) return
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting && !loading) {
            pageRef.current += 1
            loadOptionsRef.current(pageRef.current, debouncedKeyword)
          }
        },
        { root: containerRef.current, rootMargin: '20px', threshold: 0.1 },
      )
      observer.observe(node)
      return () => observer.disconnect()
    },
    [hasMore, sortedOptions.length, debouncedKeyword, open, loading],
  )

  const handleSelect = (option: Option) => {
    if (!onChange) return
    setSelectedOption(option)
    onChange(option.value)
    setOpen(false)
  }

  const onReset = () => {
    onChange?.(null)
    setSelectedOption(null)
    setOpen(false)
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) {
      setKeyword('')
      setOptions([])
      setHasSearched(false)
      setFetchError(false)
    }
  }

  const showInitialLoading = loading && !hasSearched && sortedOptions.length === 0
  const showEmpty   = !loading && hasSearched && sortedOptions.length === 0 && !fetchError
  const showError   = !loading && hasSearched && fetchError

  return (
    <FieldWrapper id={id} label={label || title} required={required} error={error}>
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'flex min-h-9 w-full items-center justify-between rounded-md border bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer',
              !selectedOption && 'text-muted-foreground',
              error && 'border-destructive focus:ring-destructive',
            )}
            onClick={() => setOpen(!open)}
          >
            <div className="flex items-center gap-1 flex-wrap">
              {selectedOption
                ? selectedOption.label
                : placeholder || t('Select') + ' ' + title}
            </div>
            <div className="flex items-center gap-2 ml-2 shrink-0">
              {selectedOption && (
                <XCircle
                  className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onReset() }}
                />
              )}
              <svg className="h-4 w-4 shrink-0 opacity-50" xmlns="http://www.w3.org/2000/svg"
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="p-0 w-max min-w-[var(--radix-popover-trigger-width)] max-w-[480px]"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={t('Search') + ' ' + title.toLowerCase()}
              value={keyword}
              onValueChange={(v) => setKeyword(v)}
            />
            <CommandList
              ref={containerRef}
              className="max-h-[260px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              onWheel={(e) => e.stopPropagation()}
            >
              {showInitialLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('Loading')}...</div>
              )}
              {showError && (
                <div className="py-6 text-center text-sm text-destructive">{t('Failed to load data')}.</div>
              )}
              {showEmpty && (
                <div className="py-6 text-center text-sm text-muted-foreground">{t('No results found')}.</div>
              )}

              {sortedOptions.length > 0 && !showInitialLoading && !showError && (
                <CommandGroup>
                  {sortedOptions.map((option, idx) => {
                    const isSelected = selectedOption?.value === option.value
                    return (
                      <CommandItem
                        key={`option-${option.value}-${idx}`}
                        onSelect={() => handleSelect(option)}
                        className={cn(
                          'flex items-start px-2 py-2 text-sm cursor-pointer whitespace-normal break-words leading-snug h-auto',
                          isSelected && 'bg-accent/50 font-medium',
                        )}
                      >
                        {renderOption ? renderOption(option, isSelected) : option.label}
                      </CommandItem>
                    )
                  })}

                  {hasMore && (
                    <div ref={sentinelRef} className="py-2 text-center text-sm text-muted-foreground">
                      {loading ? t('Loading more') + '...' : t('Load more')}
                    </div>
                  )}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </FieldWrapper>
  )
}