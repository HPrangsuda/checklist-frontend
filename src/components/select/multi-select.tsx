import { Check, XCircle, X } from "lucide-react"
import { cn } from "@/core/lib/utils"
import {
    Command,
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
import { useVirtualizer } from "@tanstack/react-virtual"
import { useDebounce } from "@/core/hooks/use-debounce"
import { useCallback, useEffect, useRef, useState, useMemo } from "react"

export interface Option {
    label: any
    value: any
}

interface ServerMultiSelectProps {
    id: any
    title: string
    values?: string[]
    onChange?: (values: string[]) => void
    fetchOptions: (keyword: string, offset: number) => Promise<{
        data: Option[]
        hasMore: boolean
    }>
    renderOption?: (option: Option, isSelected: boolean) => React.ReactNode
    limit?: number
    placeholder?: string
}

export function ServerMultiSelect({
    id,
    title,
    values = [],
    onChange,
    fetchOptions,
    renderOption,
    limit = 5,
    placeholder,
}: ServerMultiSelectProps) {
    const [open, setOpen] = useState(false)
    const [options, setOptions] = useState<Option[]>([])
    const [loading, setLoading] = useState(false)
    const [keyword, setKeyword] = useState("")
    const [hasMore, setHasMore] = useState(false)
    const [selectedOptions, setSelectedOptions] = useState<Option[]>([])
    const [hasSearched, setHasSearched] = useState(false)
    const [error, setError] = useState(false)

    const debouncedKeyword = useDebounce(keyword, 300)
    const containerRef = useRef<HTMLDivElement>(null)

    // Sort options to show selected items first
    const sortedOptions = useMemo(() => {
        if (!options.length) return []
        
        const selectedValues = selectedOptions.map(opt => opt.value)
        
        // Create a map for faster lookups
        const selectedMap = new Map(selectedOptions.map(opt => [opt.value, opt]))
        
        const selected: Option[] = []
        const unselected: Option[] = []
        
        options.forEach(option => {
            if (selectedValues.includes(option.value)) {
                // Use the option from selectedOptions to ensure consistency
                const selectedOption = selectedMap.get(option.value) || option
                selected.push(selectedOption)
            } else {
                unselected.push(option)
            }
        })
        
        return [...selected, ...unselected]
    }, [options, selectedOptions])

    const virtualizerCount = hasMore && sortedOptions.length > 0 ? sortedOptions.length + 1 : sortedOptions.length

    const rowVirtualizer = useVirtualizer({
        count: virtualizerCount,
        getScrollElement: () => containerRef.current,
        estimateSize: () => 36,
        overscan: 5,
    })

    const loadOptions = useCallback(
        async (offset = 0, searchTerm = "") => {
            try {
                setLoading(true)
                setError(false)
                await new Promise(resolve => setTimeout(resolve, 500))
    
                const result = await fetchOptions(searchTerm, offset)
    
                if (offset === 0) {
                    setOptions(result.data || [])
                    containerRef.current?.scrollTo({ top: 0 })
                } else {
                    setOptions(prev => [...prev, ...(result.data || [])])
                }
    
                setHasMore(result.hasMore || false)
                setHasSearched(true)
            } catch (error) {
                if (offset === 0) {
                    setOptions([])
                }
                setHasMore(false)
                setHasSearched(true)
                setError(true)
            } finally {
                setLoading(false)
            }
        },
        [] // Remove fetchOptions dependency
    )

    const loadOptionsRef = useRef(loadOptions)
    loadOptionsRef.current = loadOptions

    useEffect(() => {
        if (open) {
            setHasSearched(false)
            setError(false)
            loadOptionsRef.current(0, debouncedKeyword)
        }
    }, [debouncedKeyword, open])

    useEffect(() => {
        if (values.length > 0 && selectedOptions.length === 0) {
            const fetchInitialOptions = async () => {
                try {
                    const result = await fetchOptions("", 0)
                    const initialOptions = (result.data || []).filter(item => values.includes(item.value))
                    setSelectedOptions(initialOptions)
                } catch (error) {
                    console.error('Error fetching initial options:', error)
                }
            }
            fetchInitialOptions()
        }
    }, [values]) // Remove fetchOptions and selectedOptions.length dependencies

    const lastItemRef = useCallback((node: HTMLDivElement | null) => {
        if (!node || !hasMore || !open || sortedOptions.length === 0) return

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting && !loading) {
                    loadOptionsRef.current(options.length, debouncedKeyword)
                }
            },
            {
                root: containerRef.current,
                rootMargin: '20px',
                threshold: 0.1
            }
        )

        observer.observe(node)
        return () => observer.disconnect()
    }, [hasMore, options.length, sortedOptions.length, debouncedKeyword, open, loading])

    const handleSelect = (option: Option) => {
        if (!onChange) return

        const isSelected = selectedOptions.some(selected => selected.value === option.value)

        if (isSelected) {
            const newSelected = selectedOptions.filter(selected => selected.value !== option.value)
            setSelectedOptions(newSelected)
            onChange(newSelected.map(opt => opt.value))
        } else {
            if (selectedOptions.length < limit) {
                const newSelected = [...selectedOptions, option]
                setSelectedOptions(newSelected)
                onChange(newSelected.map(opt => opt.value))
            }
        }
        
        // Don't close the dropdown when selecting/deselecting
        // setOpen(false) // Remove this if it exists
    }

    const handleRemove = (valueToRemove: string) => {
        if (!onChange) return
        const newSelected = selectedOptions.filter(option => option.value !== valueToRemove)
        setSelectedOptions(newSelected)
        onChange(newSelected.map(opt => opt.value))
    }

    const onReset = () => {
        onChange?.([])
        setSelectedOptions([])
        setOpen(false)
    }

    const handleOpen = (isOpen: boolean) => {
        setOpen(isOpen)
        if (!isOpen) {
            setKeyword("")
            setOptions([])
            setHasSearched(false)
            setError(false)
        }
    }

    const handleSearch = (value: string) => {
        setKeyword(value)
    }

    const isAtLimit = selectedOptions.length >= limit
    const showInitialLoading = loading && !hasSearched && sortedOptions.length === 0
    const showEmpty = !loading && hasSearched && sortedOptions.length === 0 && !error
    const showError = !loading && hasSearched && error

    return (
        <Popover open={open} onOpenChange={handleOpen}>
            <PopoverTrigger asChild>
                <div
                    className={cn(
                        "flex min-h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer",
                        selectedOptions.length === 0 && "text-muted-foreground"
                    )}
                    onClick={() => setOpen(!open)}>
                    <div className="flex items-center gap-1 flex-wrap">
                        {selectedOptions.length > 0 ? (
                            selectedOptions.map((option) => (
                                <Badge
                                    key={option.value}
                                    variant="secondary"
                                    className="gap-1 pr-1 text-xs">
                                    {option.label}
                                    <X
                                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleRemove(option.value)
                                        }}
                                    />
                                </Badge>
                            ))
                        ) : (
                            placeholder || `Select ${title}`
                        )}
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                        {selectedOptions.length > 0 && (
                            <XCircle
                                className="h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onReset();
                                }}
                            />
                        )}
                        <svg
                            className="h-4 w-4 shrink-0 opacity-50"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent className="p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={`Search ${title.toLowerCase()}...`}
                        value={keyword}
                        onValueChange={handleSearch}
                    />
                    {isAtLimit && (
                        <div className="px-3 py-2 text-xs text-muted-foreground border-b">
                            Maximum {limit} selections allowed
                        </div>
                    )}
                    <CommandList
                        ref={containerRef}
                        className="max-h-[200px] overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                        onWheel={(e) => {
                            e.stopPropagation()
                        }}
                        style={{ 
                            overflowY: 'auto',
                            scrollBehavior: 'smooth'
                        }}
                        >
                        {/* Show initial loading */}
                        {showInitialLoading && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Loading...
                            </div>
                        )}

                        {/* Show error state */}
                        {showError && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                Failed to load data.
                            </div>
                        )}

                        {/* Show empty state */}
                        {showEmpty && (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                No results found.
                            </div>
                        )}

                        {/* Show options when available */}
                        {sortedOptions.length > 0 && !showInitialLoading && !showError && (
                            <CommandGroup>
                                <div
                                    style={{
                                        height: `${rowVirtualizer.getTotalSize()}px`,
                                        width: "100%",
                                        position: "relative",
                                    }}
                                >
                                    {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                        const isLoadingRow = virtualRow.index === sortedOptions.length

                                        if (isLoadingRow && hasMore) {
                                            return (
                                                <div
                                                    key="loading-more"
                                                    className="absolute top-0 left-0 w-full flex items-center justify-center py-2 text-sm text-muted-foreground"
                                                    style={{
                                                        height: `${virtualRow.size}px`,
                                                        transform: `translateY(${virtualRow.start}px)`,
                                                    }}
                                                    ref={lastItemRef}
                                                >
                                                    {loading ? "Loading more..." : "Load more"}
                                                </div>
                                            )
                                        }

                                        if (isLoadingRow) return null

                                        const option = sortedOptions[virtualRow.index]
                                        if (!option) return null

                                        const isSelected = selectedOptions.some(
                                            selected => selected.value === option.value
                                        )
                                        const isDisabled = !isSelected && isAtLimit

                                        return (
                                            <CommandItem
                                                key={`option-${option.value}-${virtualRow.index}`}
                                                style={{
                                                    position: "absolute",
                                                    top: 0,
                                                    left: 0,
                                                    width: "100%",
                                                    height: `${virtualRow.size}px`,
                                                    transform: `translateY(${virtualRow.start}px)`,
                                                }}
                                                onSelect={() => !isDisabled && handleSelect(option)}
                                                className={cn(
                                                    "flex items-center px-2 py-1.5 text-sm cursor-pointer",
                                                    isDisabled && "opacity-50 cursor-not-allowed",
                                                    isSelected && "bg-accent/50"
                                                )}
                                                disabled={isDisabled}
                                            >
                                                {renderOption ? (
                                                    renderOption(option, isSelected)
                                                ) : (
                                                    <>
                                                        <div
                                                            className={cn(
                                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                                isSelected
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "opacity-50 [&_svg]:invisible"
                                                            )}
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </div>
                                                        <span>{option.label}</span>
                                                    </>
                                                )}
                                            </CommandItem>
                                        )
                                    })}
                                </div>
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}