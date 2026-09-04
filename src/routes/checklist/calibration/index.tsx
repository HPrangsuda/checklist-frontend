import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import type { PageResponse, ResponseDTO } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
import { DeleteDialog } from '@/components/dialog/delete-dialog'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { TblAction } from '@/components/action/tbl-action'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { PencilRuler, SlidersHorizontal, Filter, X, Check, ChevronsUpDown } from 'lucide-react'
import { CalibrationDepartmentDashboard } from '@/module/checklist/calibration/calibration-department-dashboard'
import { CalibrationKanbanCard } from '@/module/checklist/calibration/calibrationkanbancard'
import { CalibrationPlanActualCard } from '@/module/checklist/calibration/plan-actual-cal'
import { CalibrationCalendarCard } from '@/module/checklist/calibration/calibration-calendar'
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
import { cn } from '@/core/lib/utils'

export const Route = createFileRoute('/checklist/calibration/')({
  component: Calibration,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalibrationDTO {
  id: number
  machineCode: string
  machineName: string
  years: number
  results?: string
  dueDate?: string
  calibrationStatus?: string
}

interface DepartmentOption { code: string; name: string }

interface FilterOptionsResponse {
  years: number[]
  departments: DepartmentOption[]
  results: string[]
  calibrationStatuses: string[]
}

interface CalibrationFilters {
  department:        string
  results:           string
  calibrationStatus: string
}

interface FilterOptions {
  departments:         DepartmentOption[]
  results:             string[]
  calibrationStatuses: string[]
}

// ─── LazySearchSelect ─────────────────────────────────────────────────────────

const PAGE_SIZE = 10

function LazySearchSelect<T>({
  value, placeholder, allLabel, items, getKey, getLabel, onSelect,
}: {
  value: string; placeholder: string; allLabel: string
  items: T[]; getKey: (i: T) => string; getLabel: (i: T) => string
  onSelect: (v: string) => void
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
          <span className={cn('truncate', !value && 'text-muted-foreground')}>{value ? selectedLabel : placeholder}</span>
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
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />{allLabel}
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
                  ↓ scroll to load more ({filtered.length - visible.length} remaining)
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// ─── CalibrationFilterPanel — ไม่มี year selector แล้ว ──────────────────────

function CalibrationFilterPanel({
  filters, options, onChange, onClear, activeCount, t,
}: {
  filters: CalibrationFilters; options: FilterOptions
  onChange: (key: keyof CalibrationFilters, value: string) => void
  onClear: () => void; activeCount: number; t: (k: string) => string
}) {
  const [open, setOpen] = useState(false)

  const STATUS_I18N_MAP: Record<string, string> = {
    'pass': 'status_pass', 'not pass': 'status_not_pass',
    'on time': 'status_on_time', 'overdue': 'status_overdue', 'pending': 'status_pending',
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 px-3 whitespace-nowrap flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          {t('filter')}
          {activeCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80 flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />{t('filter_by')}
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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('department')}</label>
            <LazySearchSelect<DepartmentOption>
              value={filters.department} placeholder={t('all')} allLabel={t('all')}
              items={options.departments} getKey={d => d.code} getLabel={d => d.name}
              onSelect={v => onChange('department', v)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('results')}</label>
            <LazySearchSelect<string>
              value={filters.results} placeholder={t('all')} allLabel={t('all')}
              items={options.results} getKey={s => s}
              getLabel={s => t(STATUS_I18N_MAP[s.toLowerCase()] ?? s) ?? s}
              onSelect={v => onChange('results', v)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('calibration_status')}</label>
            <LazySearchSelect<string>
              value={filters.calibrationStatus} placeholder={t('all')} allLabel={t('all')}
              items={options.calibrationStatuses} getKey={s => s}
              getLabel={s => t(STATUS_I18N_MAP[s.toLowerCase()] ?? s) ?? s}
              onSelect={v => onChange('calibrationStatus', v)}
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

// ─── CalibrationTable ─────────────────────────────────────────────────────────

function CalibrationTable({ year }: { year: number }) {
  const { t }  = useTranslation('checklist')
  const router = useRouter()

  const [pagination,       setPagination]       = useState({ pageIndex: 0, pageSize: 10 })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedIds,      setSelectedIds]      = useState<number[]>([])
  const [data,             setData]             = useState<CalibrationDTO[]>([])
  const [loading,          setLoading]          = useState(false)
  const [totalCount,       setTotalCount]       = useState(0)
  const [keyword,          setKeyword]          = useState('')
  const [searchValue,      setSearchValue]      = useState('')
  const debouncedSearch                         = useDebounce(keyword, 500)

  const [filters, setFilters] = useState<CalibrationFilters>({ department: '', results: '', calibrationStatus: '' })
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ departments: [], results: [], calibrationStatuses: [] })

  const filtersRef     = useRef(filters)
  const paginationRef  = useRef(pagination)
  const searchValueRef = useRef(searchValue)
  const yearRef        = useRef(year)

  useEffect(() => { filtersRef.current     = filters     }, [filters])
  useEffect(() => { paginationRef.current  = pagination  }, [pagination])
  useEffect(() => { searchValueRef.current = searchValue }, [searchValue])
  useEffect(() => { yearRef.current        = year        }, [year])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  const getResultBadge = (result?: string) => {
    if (!result) return <>-</>
    const cfg: Record<string, string> = {
      'NOT PASS': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'PASS':     'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    }
    const cls   = cfg[result] ?? 'bg-zinc-100 text-zinc-600'
    const key   = `status_${result.toLowerCase().replace(/\s+/g, '_')}`
    const label = t(key) !== key ? t(key) : result
    return <Badge className={cls}>{label}</Badge>
  }

  const getStatusBadge = (status?: string) => {
    if (!status) return <>-</>
    const cfg: Record<string, string> = {
      'ON TIME': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      'OVERDUE': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      'PENDING': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    }
    const cls   = cfg[status] ?? 'bg-zinc-100 text-zinc-600'
    const key   = `status_${status.toLowerCase().replace(/\s+/g, '_')}`
    const label = t(key) !== key ? t(key) : status
    return <Badge className={cls}>{label}</Badge>
  }

  const columns: ColumnDef<CalibrationDTO>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={data.length > 0 && data.every(r => selectedIds.includes(r.id))}
          onCheckedChange={checked => setSelectedIds(checked ? data.map(r => r.id) : [])}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={checked =>
              setSelectedIds(prev => checked ? [...prev, row.original.id] : prev.filter(id => id !== row.original.id))
            }
            aria-label="Select row"
          />
        </div>
      ),
      size: 32,
    },
    { accessorKey: 'machineCode', header: t('machine_code'),       cell: ({ row }) => <div className="text-sm">{row.original.machineCode}</div> },
    { accessorKey: 'machineName', header: t('machine_name'),       cell: ({ row }) => <div className="text-sm">{row.original.machineName}</div> },
    { accessorKey: 'years',       header: t('years'),              cell: ({ row }) => <div className="text-sm">{row.original.years}</div> },
    {
      accessorKey: 'dueDate',
      header: t('calibration_due_date'),
      cell: ({ row }) => {
        const d = row.original.dueDate
        if (!d) return <div className="text-sm">-</div>
        const [y, m, day] = d.split('-')
        return <div className="text-sm">{`${day}-${m}-${y}`}</div>
      },
    },
    { accessorKey: 'results',           header: t('results'),           cell: ({ row }) => getResultBadge(row.original.results) },
    { accessorKey: 'calibrationStatus', header: t('calibration_status'), cell: ({ row }) => getStatusBadge(row.original.calibrationStatus) },
    {
      id: 'action', header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view edit delete
          onView={() => router.navigate({ to: '/checklist/calibration/view', search: { id: row.original.id } })}
          onEdit={() => router.navigate({ to: '/checklist/calibration/edit', search: { id: row.original.id } })}
          onDelete={() => { setSelectedIds([row.original.id]); setShowDeleteDialog(true) }}
        />
      ),
      size: 80,
    },
  ]

  useEffect(() => { setSearchValue(debouncedSearch) }, [debouncedSearch])

  useEffect(() => {
    onFetchData(filtersRef.current)
  }, [searchValue, pagination.pageIndex, pagination.pageSize, year])

  useEffect(() => { fetchFilterOptions() }, [])

  const onFetchData = async (currentFilters: CalibrationFilters) => {
    try {
      setLoading(true)
      const pg = paginationRef.current
      const sv = searchValueRef.current
      const yr = yearRef.current

      const params = new URLSearchParams()
      params.set('index', pg.pageIndex.toString())
      params.set('size',  pg.pageSize.toString())
      params.set('year',  String(yr))
      if (sv.trim())                        params.set('keyword',           sv.trim())
      if (currentFilters.department)        params.set('department',        currentFilters.department)
      if (currentFilters.results)           params.set('results',           currentFilters.results)
      if (currentFilters.calibrationStatus) params.set('calibrationStatus', currentFilters.calibrationStatus)

      const response = await api.get<PageResponse<CalibrationDTO>>('/api/calibration/get/page', { params })
      if (response?.success) {
        setData(response.data ?? [])
        setTotalCount(response.totalElements ?? 0)
      } else {
        toast.error(response?.message ?? t('data_fetch_failed'))
        setData([])
      }
    } catch {
      toast.error(t('data_fetch_failed'))
      setData([])
    } finally {
      setLoading(false)
      setSelectedIds([])
    }
  }

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get<FilterOptionsResponse>('/api/calibration/filter-options')
      if (response) {
        setFilterOptions({
          departments:         response.departments         ?? [],
          results:             response.results             ?? [],
          calibrationStatuses: response.calibrationStatuses ?? [],
        })
      }
    } catch {
      console.warn('[CalibrationTable] /api/calibration/filter-options unavailable')
    }
  }

  const handleFilterChange = useCallback((key: keyof CalibrationFilters, value: string) => {
    const newFilters = { ...filtersRef.current, [key]: value }
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    onFetchData(newFilters)
  }, [])

  const handleClearFilters = useCallback(() => {
    const reset: CalibrationFilters = { department: '', results: '', calibrationStatus: '' }
    setFilters(reset)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    onFetchData(reset)
  }, [])

  const onDeleteData = async (): Promise<{ success: boolean }> => {
    if (!selectedIds.length) return { success: false }
    try {
      const response = await api.delete<ResponseDTO<void>>('/api/calibration/delete', {
        headers: { 'Content-Type': 'application/json' },
        data: selectedIds,
      })
      if (response.success) { toast.success(response.message); return { success: true } }
      toast.error(response.message); return { success: false }
    } catch {
      toast.error(t('data_delete_failed')); return { success: false }
    }
  }

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const table = useReactTable({
    data, columns, manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    manualSorting: true, manualFiltering: true,
    state: { pagination },
    getRowId: row => row.id.toString(),
  })

  return (
    <Card className="p-0 overflow-hidden mb-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b px-5 py-4">
        <CardTitle className="font-bold">
          <PencilRuler className="w-5 h-5 text-red-600 inline mr-2" />
          {t('calibration_lists')}
        </CardTitle>
        <CalibrationFilterPanel
          filters={filters}
          options={filterOptions}
          onChange={handleFilterChange}
          onClear={handleClearFilters}
          activeCount={activeFilterCount}
          t={t}
        />
      </CardHeader>
      <TblContainer>
        <div>
          <DataTableToolbar
            table={table} isSync={false}
            isDelete={selectedIds.length > 0}
            onSearch={handleSearch} onDelete={() => setShowDeleteDialog(true)}
            isServerSide={true} searchValue={keyword} breakpoint={1300} className="w-full gap-2"
          />
        </div>
        <div>
          {loading ? (
            <DataTableSkeleton columnCount={columns.length} rowCount={10} filterCount={0}
              cellWidths={['auto']} withViewOptions={false} withPagination={true} shrinkZero={false} className="w-full" />
          ) : (
            <DataTable table={table} emptyText={t('no_result')} />
          )}
        </div>
        <DeleteDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          title={t('delete_calibrations')}
          confirmText="DELETE"
          isAlert={false}
          variant="destructive"
          onConfirm={onDeleteData}
          onSuccess={() => { onFetchData(filtersRef.current); setSelectedIds([]) }}
        />
      </TblContainer>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function Calibration() {
  const { t }         = useTranslation('checklist')
  const [year, setYear]             = useState<number>(new Date().getFullYear())
  const [yearOptions, setYearOptions] = useState<number[]>([new Date().getFullYear()])

  // ── ดึง years จาก filter-options ──
  useEffect(() => {
    api.get<FilterOptionsResponse>('/api/calibration/filter-options')
      .then(res => {
        if (res?.years?.length) {
          setYearOptions(res.years)
          const currentYear = new Date().getFullYear()
          if (!res.years.includes(currentYear)) setYear(res.years[0])
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-background">
      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">

        {/* ── Global year selector ── */}
        <div className="flex items-center gap-2 flex-wrap p-4 rounded-xl border bg-muted/20">
          <span className="text-xs font-medium text-muted-foreground shrink-0">{t('years')}:</span>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            className="h-7 rounded-md border bg-background px-2 text-xs"
          >
            {yearOptions.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <CalibrationDepartmentDashboard year={year} />
        <CalibrationPlanActualCard      year={year} />
        <CalibrationKanbanCard          year={year} />
        <CalibrationCalendarCard />
        <CalibrationTable               year={year} />

      </div>
    </div>
  )
}