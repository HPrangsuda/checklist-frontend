import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import { useTranslation } from '@/core/contexts/language-context'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getStatusColor } from '@/utils/status.untils'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  Popover, PopoverContent, PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { Separator } from '@/components/ui/separator'
import { Filter, X, SlidersHorizontal, Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/core/lib/utils'
import type { PageResponse } from '@/core/types/common'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalibrationDTO {
  id:                number
  machineCode:       string
  machineName:       string
  years:             number
  dueDate:           string
  certificateDate:   string
  results:           string
  calibrationStatus: string
}

interface ApiResponse<T> {
  status:  boolean
  message: string
  data:    T
}

interface DepartmentOption {
  code: string
  name: string
}

interface FilterOptionsResponse {
  years:               number[]
  departments:         DepartmentOption[]
  results:             string[]
  calibrationStatuses: string[]
}

interface CalibrationFilters {
  year:              string
  department:        string
  results:           string
  calibrationStatus: string
}

interface FilterOptions {
  years:               number[]
  departments:         DepartmentOption[]
  results:             string[]
  calibrationStatuses: string[]
}

interface Props {
  machineCode?: string
}

// ─── Status i18n map ──────────────────────────────────────────────────────────

const STATUS_I18N_MAP: Record<string, string> = {
  'pass':     'status_pass',
  'not pass': 'status_not_pass',
  'on time':  'status_on_time',
  'overdue':  'status_overdue',
  'pending':  'status_pending',
}

// ─── Format date ──────────────────────────────────────────────────────────────

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('T')[0].split('-')
  return `${day}-${month}-${year}`
}

// ─── LazySearchSelect ─────────────────────────────────────────────────────────

const PAGE_SIZE = 10

function LazySearchSelect<T>({
  value, placeholder, allLabel, items, getKey, getLabel, onSelect,
  scrollHint, remaining,
}: {
  value: string; placeholder: string; allLabel: string
  items: T[]; getKey: (i: T) => string; getLabel: (i: T) => string
  onSelect: (v: string) => void
  scrollHint: string; remaining: string
}) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const [page,   setPage]   = useState(1)
  const listRef             = useRef<HTMLDivElement>(null)
  const debouncedSearch     = useDebounce(search, 200)

  const filtered = items.filter(i => getLabel(i).toLowerCase().includes(debouncedSearch.toLowerCase()))
  const visible  = filtered.slice(0, page * PAGE_SIZE)
  const hasMore  = visible.length < filtered.length

  useEffect(() => { setPage(1) }, [debouncedSearch])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore) return
    const el = e.currentTarget
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 20) setPage(p => p + 1)
  }, [hasMore])

  const selectedLabel = value
    ? (items.find(i => getKey(i) === value) ? getLabel(items.find(i => getKey(i) === value)!) : value)
    : ''

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) { setSearch(''); setPage(1) } }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-9 w-full justify-between text-sm font-normal">
          <span className={cn('truncate', !value && 'text-muted-foreground')}>
            {value ? selectedLabel : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder={placeholder} value={search} onValueChange={setSearch} />
          <CommandList ref={listRef} className="max-h-52 overflow-y-auto" onScroll={handleScroll}>
            <CommandEmpty>-</CommandEmpty>
            <CommandGroup>
              <CommandItem value="__ALL__" onSelect={() => { onSelect(''); setOpen(false); setSearch('') }}>
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                {allLabel}
              </CommandItem>
              {visible.map(item => {
                const key = getKey(item)
                return (
                  <CommandItem key={key} value={key} onSelect={() => { onSelect(key); setOpen(false); setSearch('') }}>
                    <Check className={cn('mr-2 h-4 w-4', value === key ? 'opacity-100' : 'opacity-0')} />
                    {getLabel(item)}
                  </CommandItem>
                )
              })}
              {hasMore && (
                <div className="py-2 text-center text-xs text-muted-foreground select-none">
                  ↓ {scrollHint} ({filtered.length - visible.length} {remaining})
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── CalibrationFilterPanel ───────────────────────────────────────────────────

function CalibrationFilterPanel({
  filters, options, onChange, onClear, activeCount, t,
}: {
  filters:     CalibrationFilters
  options:     FilterOptions
  onChange:    (key: keyof CalibrationFilters, value: string) => void
  onClear:     () => void
  activeCount: number
  t:           (key: string) => string
}) {
  const [open, setOpen] = useState(false)
  const yearItems = options.years.map(y => String(y))

  const selectProps = {
    scrollHint: t('scroll_to_load_more'),
    remaining:  t('remaining'),
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-3 whitespace-nowrap flex items-center">
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t('filter')}
          {activeCount > 0 && (
            <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              {t('filter_by')}
            </SheetTitle>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive" onClick={onClear}>
                <X className="w-3 h-3 mr-1" />{t('clear_all')}
              </Button>
            )}
          </div>
          {activeCount > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">{activeCount} {t('active_filters')}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('years')}</label>
            <LazySearchSelect<string>
              value={filters.year} placeholder={t('all')} allLabel={t('all')}
              items={yearItems} getKey={y => y} getLabel={y => y}
              onSelect={v => onChange('year', v)} {...selectProps}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('department')}</label>
            <LazySearchSelect<DepartmentOption>
              value={filters.department} placeholder={t('all')} allLabel={t('all')}
              items={options.departments} getKey={d => d.code} getLabel={d => d.name}
              onSelect={v => onChange('department', v)} {...selectProps}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('results')}</label>
            <LazySearchSelect<string>
              value={filters.results} placeholder={t('all')} allLabel={t('all')}
              items={options.results} getKey={s => s}
              getLabel={s => t(STATUS_I18N_MAP[s.toLowerCase()] ?? s) ?? s}
              onSelect={v => onChange('results', v)} {...selectProps}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('calibration_status')}</label>
            <LazySearchSelect<string>
              value={filters.calibrationStatus} placeholder={t('all')} allLabel={t('all')}
              items={options.calibrationStatuses} getKey={s => s}
              getLabel={s => t(STATUS_I18N_MAP[s.toLowerCase()] ?? s) ?? s}
              onSelect={v => onChange('calibrationStatus', v)} {...selectProps}
            />
          </div>
        </div>

        {activeCount > 0 && (
          <div className="border-t px-6 py-4">
            <Button
              variant="outline"
              className="w-full h-9 text-sm text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
              onClick={() => { onClear(); setOpen(false) }}
            >
              <X className="w-3.5 h-3.5 mr-1.5" />{t('clear_all')}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}

// ─── CalibrationTbl ───────────────────────────────────────────────────────────

export function CalibrationTbl({ machineCode }: Props) {
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [pagination,    setPagination]    = useState({ pageIndex: 0, pageSize: 10 })
  const [allData,       setAllData]       = useState<CalibrationDTO[]>([])
  const [data,          setData]          = useState<CalibrationDTO[]>([])
  const [loading,       setLoading]       = useState(false)
  const [totalCount,    setTotalCount]    = useState(0)
  const [keyword,       setKeyword]       = useState('')
  const [searchValue,   setSearchValue]   = useState('')
  const [selectedRowId, setSelectedRowId] = useState<number | null>(null)
  const debouncedSearch                   = useDebounce(keyword, 500)

  const [filters, setFilters] = useState<CalibrationFilters>({
    year: '', department: '', results: '', calibrationStatus: '',
  })
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    years: [], departments: [], results: [], calibrationStatuses: [],
  })

  const paginationRef  = useRef(pagination)
  const searchValueRef = useRef(searchValue)
  const filtersRef     = useRef(filters)

  useEffect(() => { paginationRef.current  = pagination  }, [pagination])
  useEffect(() => { searchValueRef.current = searchValue }, [searchValue])
  useEffect(() => { filtersRef.current     = filters     }, [filters])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const translateStatus = (status: string): string => {
    if (!status) return '-'
    const key = STATUS_I18N_MAP[status.toLowerCase()]
    return key ? t(key) : status
  }

  // ── Debounce ──────────────────────────────────────────────────────────────
  useEffect(() => { setSearchValue(debouncedSearch) }, [debouncedSearch])

  // ── Initial fetch ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetchFilterOptions()
    if (machineCode) fetchByMachineCode()
    else             onFetchData(filtersRef.current)
  }, [machineCode])

  // ── List mode: re-fetch on search/page ───────────────────────────────────
  useEffect(() => {
    if (!machineCode) onFetchData(filtersRef.current)
  }, [searchValue, pagination.pageIndex, pagination.pageSize])

  // ── Detail mode: re-filter on search/filter/page ─────────────────────────
  useEffect(() => {
    if (!machineCode) return
    applyClientFilter(allData, filtersRef.current, searchValue, paginationRef.current)
  }, [searchValue, filters, pagination.pageIndex, pagination.pageSize, allData])

  // ── Detail mode fetch ─────────────────────────────────────────────────────
  const fetchByMachineCode = async () => {
    try {
      setLoading(true)
      const resp = await api.get(`/api/calibration/get/${machineCode}`)
      const res  = resp as ApiResponse<CalibrationDTO[]>
      if (res.status) {
        const all = res.data ?? []
        setAllData(all)
        setFilterOptions(prev => ({
          ...prev,
          years:               [...new Set(all.map(d => d.years).filter(Boolean))].sort((a, b) => b - a),
          results:             [...new Set(all.map(d => d.results).filter(Boolean))],
          calibrationStatuses: [...new Set(all.map(d => d.calibrationStatus).filter(Boolean))],
        }))
        applyClientFilter(all, filtersRef.current, searchValueRef.current, paginationRef.current)
      } else {
        toast.error(t('data_fetch_failed'))
        setAllData([]); setData([])
      }
    } catch {
      toast.error(t('data_fetch_failed'))
      setAllData([]); setData([])
    } finally {
      setLoading(false)
    }
  }

  // ── Client-side filter ────────────────────────────────────────────────────
  const applyClientFilter = (
    source:         CalibrationDTO[],
    currentFilters: CalibrationFilters,
    sv:             string,
    pg:             { pageIndex: number; pageSize: number },
  ) => {
    const q = sv.toLowerCase().trim()
    const filtered = source.filter(item => {
      if (q && !(item.machineCode?.toLowerCase().includes(q) || item.machineName?.toLowerCase().includes(q))) return false
      if (currentFilters.year              && String(item.years) !== currentFilters.year) return false
      if (currentFilters.results           && item.results?.toLowerCase()           !== currentFilters.results.toLowerCase())           return false
      if (currentFilters.calibrationStatus && item.calibrationStatus?.toLowerCase() !== currentFilters.calibrationStatus.toLowerCase()) return false
      return true
    })
    const start = pg.pageIndex * pg.pageSize
    setTotalCount(filtered.length)
    setData(filtered.slice(start, start + pg.pageSize))
  }

  // ── List mode server fetch ────────────────────────────────────────────────
  const onFetchData = async (currentFilters: CalibrationFilters) => {
    try {
      setLoading(true)
      const pg = paginationRef.current
      const sv = searchValueRef.current
      const params = new URLSearchParams()
      params.set('index', pg.pageIndex.toString())
      params.set('size',  pg.pageSize.toString())
      if (sv.trim())                        params.set('keyword',           sv.trim())
      if (currentFilters.year)              params.set('year',              currentFilters.year)
      if (currentFilters.department)        params.set('department',        currentFilters.department)
      if (currentFilters.results)           params.set('results',           currentFilters.results)
      if (currentFilters.calibrationStatus) params.set('calibrationStatus', currentFilters.calibrationStatus)

      const response = await api.get<PageResponse<CalibrationDTO>>('/api/calibration/get/page', { params })
      if (response?.success) {
        setData(response.data ?? [])
        setTotalCount(response.totalElements ?? 0)
      } else {
        toast.error(t('data_fetch_failed'))
        setData([])
      }
    } catch {
      toast.error(t('data_fetch_failed'))
      setData([])
    } finally {
      setLoading(false)
    }
  }

  // ── Filter options ────────────────────────────────────────────────────────
  const fetchFilterOptions = async () => {
    try {
      const response = await api.get<FilterOptionsResponse>('/api/calibration/filter-options')
      if (response) {
        setFilterOptions({
          years:               response.years               ?? [],
          departments:         response.departments         ?? [],
          results:             response.results             ?? [],
          calibrationStatuses: response.calibrationStatuses ?? [],
        })
      }
    } catch {
      console.warn('[CalibrationTbl] /api/calibration/filter-options unavailable')
    }
  }

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleFilterChange = useCallback((key: keyof CalibrationFilters, value: string) => {
    const newFilters = { ...filtersRef.current, [key]: value }
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    if (machineCode) applyClientFilter(allData, newFilters, searchValueRef.current, { ...paginationRef.current, pageIndex: 0 })
    else             onFetchData(newFilters)
  }, [machineCode, allData])

  const handleClearFilters = useCallback(() => {
    const empty: CalibrationFilters = { year: '', department: '', results: '', calibrationStatus: '' }
    setFilters(empty)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    if (machineCode) applyClientFilter(allData, empty, searchValueRef.current, { ...paginationRef.current, pageIndex: 0 })
    else             onFetchData(empty)
  }, [machineCode, allData])

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // ── Columns ───────────────────────────────────────────────────────────────
  const columns = useMemo<ColumnDef<CalibrationDTO>[]>(() => [
    {
      accessorKey: 'years',
      header: t('years'),
      cell: ({ row }) => <div>{row.original.years ?? '-'}</div>,
    },
    {
      accessorKey: 'dueDate',
      header: t('calibration_due_date'),
      cell: ({ row }) => <div className="text-sm">{formatDate(row.original.dueDate)}</div>,
    },
    {
      accessorKey: 'certificateDate',
      header: t('certificate_date'),
      cell: ({ row }) => <div className="text-sm">{formatDate(row.original.certificateDate)}</div>,
    },
    {
      accessorKey: 'results',
      header: t('results'),
      cell: ({ row }) => {
        const s = row.original.results
        return s ? <Badge className={getStatusColor(s)}>{translateStatus(s)}</Badge> : <span>-</span>
      },
    },
    {
      accessorKey: 'calibrationStatus',
      header: t('calibration_status'),
      cell: ({ row }) => {
        const s = row.original.calibrationStatus
        return s ? <Badge className={getStatusColor(s)}>{translateStatus(s)}</Badge> : <span>-</span>
      },
    },
  ], [t])

  // ── Table ─────────────────────────────────────────────────────────────────
  const table = useReactTable({
    data, columns,
    manualPagination: true,
    getCoreRowModel:       getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel:     getSortedRowModel(),
    getFilteredRowModel:   getFilteredRowModel(),
    onPaginationChange:    setPagination,
    pageCount:             Math.ceil(totalCount / pagination.pageSize) || 0,
    manualSorting: true, manualFiltering: true,
    state: { pagination },
    getRowId: row => row.id.toString(),
  })

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Card className="shadow-sm border-dashboard-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-dashboard-bg/50">
        <CardTitle className="font-bold">{t('calibration_lists')}</CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <TblContainer>
          <div className="flex items-center gap-2 pt-1 pb-3">
            <div className="flex-1">
              <DataTableToolbar
                table={table} isSync={false}
                onSearch={handleSearch} isServerSide={true}
                searchValue={keyword} breakpoint={1300}
                className="w-full gap-2 pt-0 pb-0"
              />
            </div>
            <CalibrationFilterPanel
              filters={filters} options={filterOptions}
              onChange={handleFilterChange} onClear={handleClearFilters}
              activeCount={activeFilterCount} t={t}
            />
          </div>
          <div>
            {loading ? (
              <DataTableSkeleton
                columnCount={columns.length} rowCount={10} filterCount={0}
                cellWidths={['auto']} withViewOptions={false} withPagination={true}
                shrinkZero={false} className="w-full"
              />
            ) : (
              <DataTable
                table={table}
                emptyText={t('no_result')}
                onRowClick={row => {
                  setSelectedRowId(row.id)
                  router.navigate({ to: '/checklist/calibration/view', search: { id: row.id } })
                }}
                getRowClassName={row =>
                  cn(
                    'cursor-pointer transition-colors',
                    selectedRowId === row.original.id
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-muted/50'
                  )
                }
              />
            )}
          </div>
        </TblContainer>
      </CardContent>
    </Card>
  )
}