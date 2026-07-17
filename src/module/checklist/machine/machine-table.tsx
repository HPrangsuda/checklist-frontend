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
import type { PageResponse, ResponseDTO } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
import { DeleteDialog } from '@/components/dialog/delete-dialog'
import { TblContainer } from '@/components/layout/tbl-container'
import { DataTable } from '@/components/data-table/data-table'
import { api } from '@/core/interceptor/api.interceptor'
import { useRouter } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useDebounce } from '@/core/hooks/use-debounce'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Drill, Filter, X, SlidersHorizontal, Check, ChevronsUpDown } from 'lucide-react'
import { getStatusColor } from '@/utils/status.untils'
import { useAuth } from '@/core/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/core/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MachineDTO {
  id: number
  machineCode: string
  machineName: string
  department: string
  departmentName: string
  machineStatus: string
  checkStatus: string
  responsiblePersonName: string
  qrCode?: string
  qr_code?: string
}

interface MachineFilters {
  department: string
  machineStatus: string
  checkStatus: string
  responsiblePersonName: string
}

interface DepartmentOption {
  code: string
  name: string
}

interface FilterOptions {
  departments: DepartmentOption[]
  machineStatuses: string[]
  checkStatuses: string[]
  responsiblePersons: string[]
}

interface FilterOptionsResponse {
  departments: { code: string; name: string }[]
  machineStatuses: string[]
  checkStatuses: string[]
  responsiblePersons: string[]
}

type ViewMode = 'overview' | 'mine'

interface MachineTblProps {
  onSelectionChange?: (ids: number[]) => void
  onSearchChange?: (keyword: string) => void
  /** Called with the full row when a table row is clicked */
  onRowClick?: (machine: MachineDTO) => void
  /** Highlights the row whose id matches */
  selectedRowId?: number | null
}

// ─── LazySearchSelect ─────────────────────────────────────────────────────────

const PAGE_SIZE = 10

interface LazySearchSelectProps<T> {
  value: string
  placeholder: string
  allLabel: string
  items: T[]
  getKey: (item: T) => string
  getLabel: (item: T) => string
  onSelect: (value: string) => void
}

function LazySearchSelect<T>({
  value,
  placeholder,
  allLabel,
  items,
  getKey,
  getLabel,
  onSelect,
}: LazySearchSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const listRef = useRef<HTMLDivElement>(null)
  const debouncedSearch = useDebounce(search, 200)

  const filtered = items.filter(item =>
    getLabel(item).toLowerCase().includes(debouncedSearch.toLowerCase())
  )
  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  useEffect(() => { setPage(1) }, [debouncedSearch])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore) return
    const el = e.currentTarget
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
    if (nearBottom) setPage(p => p + 1)
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

// ─── MachineFilterPanel ───────────────────────────────────────────────────────

function MachineFilterPanel({
  filters, options, onChange, onClear, activeCount, t,
}: {
  filters: MachineFilters
  options: FilterOptions
  onChange: (key: keyof MachineFilters, value: string) => void
  onClear: () => void
  activeCount: number
  t: (key: string) => string
}) {
  const [open, setOpen] = useState(false)

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
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('department')}</label>
            <LazySearchSelect<DepartmentOption>
              value={filters.department} placeholder={t('all')} allLabel={t('all')}
              items={options.departments} getKey={d => d.code} getLabel={d => d.name}
              onSelect={v => onChange('department', v)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('machine_status')}</label>
            <LazySearchSelect<string>
              value={filters.machineStatus} placeholder={t('all')} allLabel={t('all')}
              items={options.machineStatuses} getKey={s => s} getLabel={s => s}
              onSelect={v => onChange('machineStatus', v)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('check_status')}</label>
            <LazySearchSelect<string>
              value={filters.checkStatus} placeholder={t('all')} allLabel={t('all')}
              items={options.checkStatuses} getKey={s => s} getLabel={s => s}
              onSelect={v => onChange('checkStatus', v)}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t('responsible')}</label>
            <LazySearchSelect<string>
              value={filters.responsiblePersonName} placeholder={t('all')} allLabel={t('all')}
              items={options.responsiblePersons} getKey={p => p} getLabel={p => p}
              onSelect={v => onChange('responsiblePersonName', v)}
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

// ─── MachineTbl ───────────────────────────────────────────────────────────────

export function MachineTbl({
  onSelectionChange,
  onSearchChange,
  onRowClick,
  selectedRowId,
}: MachineTblProps) {
  const { t } = useTranslation('checklist')
  const router = useRouter()
  const { role } = useAuth()
  const isManagerOrSupervisor = role === 'MANAGER' || role === 'SUPERVISOR'

  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [data, setData] = useState<MachineDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('mine')
  const debouncedSearch = useDebounce(keyword, 500)

  const [filters, setFilters] = useState<MachineFilters>({
    department: '',
    machineStatus: '',
    checkStatus: '',
    responsiblePersonName: '',
  })

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    departments: [],
    machineStatuses: [],
    checkStatuses: [],
    responsiblePersons: [],
  })

  const paginationRef = useRef(pagination)
  const viewModeRef   = useRef(viewMode)
  const searchValueRef = useRef(searchValue)

  useEffect(() => { paginationRef.current = pagination }, [pagination])
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])
  useEffect(() => { searchValueRef.current = searchValue }, [searchValue])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  useEffect(() => { onSelectionChange?.(selectedIds) }, [selectedIds])
  useEffect(() => { onSearchChange?.(keyword) }, [keyword])
  useEffect(() => { setSearchValue(debouncedSearch) }, [debouncedSearch])
  useEffect(() => { onFetchData(filters) }, [searchValue, pagination.pageIndex, pagination.pageSize, viewMode])
  useEffect(() => { fetchFilterOptions() }, [])

  const onFetchData = async (currentFilters: MachineFilters) => {
    try {
      setLoading(true)
      const pg = paginationRef.current
      const vm = viewModeRef.current
      const sv = searchValueRef.current

      const params = new URLSearchParams()
      params.set('index', pg.pageIndex.toString())
      params.set('size', pg.pageSize.toString())
      if (sv.trim()) params.set('keyword', sv.trim())
      if (isManagerOrSupervisor && vm === 'mine') params.set('mine', 'true')
      if (currentFilters.department)            params.set('department',            currentFilters.department)
      if (currentFilters.machineStatus)         params.set('machineStatus',         currentFilters.machineStatus)
      if (currentFilters.checkStatus)           params.set('checkStatus',           currentFilters.checkStatus)
      if (currentFilters.responsiblePersonName) params.set('responsiblePersonName', currentFilters.responsiblePersonName)

      const response = await api.get<PageResponse<MachineDTO>>('/api/machine/get/page', { params })
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
      const response = await api.get<ResponseDTO<FilterOptionsResponse>>('/api/machine/filter-options')
      if (response?.success && response.data) {
        const d = response.data
        setFilterOptions({
          departments:        d.departments        ?? [],
          machineStatuses:    d.machineStatuses    ?? [],
          checkStatuses:      d.checkStatuses      ?? [],
          responsiblePersons: d.responsiblePersons ?? [],
        })
      }
    } catch {
      console.warn('[MachineTbl] /api/machine/filter-options unavailable')
    }
  }

  const getStatusLabel = (status: string) => {
    const key = status.toLowerCase().replace(/\s+/g, '_')
    const translated = t(`status_${key}`)
    return translated !== `status_${key}` ? translated : status
  }

  // ─── Columns — ลบ action column ออก, เพิ่ม row click แทน ─────────────────

  const columns: ColumnDef<MachineDTO>[] = [
    {
      id: 'select',
      header: () => (
        <Checkbox
          checked={data.length > 0 && data.every(row => selectedIds.includes(row.id))}
          onCheckedChange={checked => setSelectedIds(checked ? data.map(r => r.id) : [])}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        // stopPropagation ป้องกันไม่ให้ checkbox click ไปเปิด sidebar
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={checked =>
              setSelectedIds(prev =>
                checked
                  ? [...prev, row.original.id]
                  : prev.filter(id => id !== row.original.id)
              )
            }
            aria-label="Select row"
          />
        </div>
      ),
      size: 32,
    },
    {
      accessorKey: 'machineCode',
      header: t('machine_code'),
      cell: ({ row }) => <div className="text-sm">{row.original.machineCode}</div>,
    },
    {
      accessorKey: 'machineName',
      header: t('machine_name'),
      cell: ({ row }) => <div className="text-sm">{row.original.machineName}</div>,
    },
    {
      accessorKey: 'department',
      header: t('department'),
      cell: ({ row }) => (
        <div className="text-sm">{row.original.departmentName || row.original.department || '-'}</div>
      ),
    },
    {
      accessorKey: 'machineStatus',
      header: t('machine_status'),
      cell: ({ row }) =>
        row.original.machineStatus ? (
          <Badge className={getStatusColor(row.original.machineStatus)}>
            {getStatusLabel(row.original.machineStatus)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      accessorKey: 'checkStatus',
      header: t('check_status'),
      cell: ({ row }) =>
        row.original.checkStatus ? (
          <Badge className={getStatusColor(row.original.checkStatus)}>
            {getStatusLabel(row.original.checkStatus)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
    {
      accessorKey: 'responsiblePersonName',
      header: t('responsible'),
      cell: ({ row }) =>
        row.original.responsiblePersonName ? (
          <div className="text-sm">{row.original.responsiblePersonName}</div>
        ) : (
          <span className="text-muted-foreground text-sm">-</span>
        ),
    },
  ]

  // ─── Delete ───────────────────────────────────────────────────────────────

  const onDeleteData = async (): Promise<{ success: boolean }> => {
    if (selectedIds.length === 0) return { success: false }
    try {
      const response = await api.delete<ResponseDTO<void>>('/api/machine/delete', {
        headers: { 'Content-Type': 'application/json' },
        data: selectedIds,
      })
      if (response.success) {
        toast.success(response.message)
        return { success: true }
      } else {
        toast.error(response.message)
        return { success: false }
      }
    } catch {
      toast.error(t('data_delete_failed'))
      return { success: false }
    }
  }

  // ─── Filter / search handlers ─────────────────────────────────────────────

  const handleFilterChange = useCallback((key: keyof MachineFilters, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    onFetchData(newFilters)
  }, [filters, searchValue, pagination, viewMode])

  const handleClearFilters = useCallback(() => {
    const empty: MachineFilters = { department: '', machineStatus: '', checkStatus: '', responsiblePersonName: '' }
    setFilters(empty)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
    onFetchData(empty)
  }, [searchValue, pagination, viewMode])

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleViewModeChange = (value: string) => {
    setViewMode(value as ViewMode)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const handleSelectDelete = () => {
    if (selectedIds.length === 0) {
      toast.warning(t('please_select_at_least_one'))
      return
    }
    setShowDeleteDialog(true)
  }

  const handleAdd = () => router.navigate({ to: '/checklist/machine/add', search: { refId: undefined } })

  // ─── Table instance ───────────────────────────────────────────────────────

  const table = useReactTable({
    data,
    columns,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onPaginationChange: setPagination,
    pageCount: Math.ceil(totalCount / pagination.pageSize),
    manualSorting: true,
    manualFiltering: true,
    state: { pagination },
    getRowId: row => row.id.toString(),
  })

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <Card className="shadow-sm border-dashboard-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 flex-wrap gap-2 border-b">
        <CardTitle className="font-bold">
          <Drill className="w-5 h-5 inline mr-2" />
          {t('machine_records')}
        </CardTitle>

        {isManagerOrSupervisor && (
          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList>
              <TabsTrigger value="mine" className="data-[state=active]:bg-red-700 data-[state=active]:text-white">
                {t('view_mine')}
              </TabsTrigger>
              <TabsTrigger value="overview" className="data-[state=active]:bg-red-700 data-[state=active]:text-white">
                {t('view_overview')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent>
        <TblContainer>
          <DataTableToolbar
            table={table}
            isSync={false}
            isAdd={true}
            isDelete={selectedIds.length > 0}
            onSearch={handleSearch}
            onDelete={handleSelectDelete}
            onAdd={handleAdd}
            isServerSide={true}
            searchValue={keyword}
            breakpoint={1300}
          >
            <MachineFilterPanel
              filters={filters}
              options={filterOptions}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              activeCount={activeFilterCount}
              t={t}
            />
          </DataTableToolbar>

          <div>
            {loading ? (
              <DataTableSkeleton
                columnCount={columns.length}
                rowCount={10}
                filterCount={0}
                cellWidths={['auto']}
                withViewOptions={false}
                withPagination={true}
                shrinkZero={false}
                className="w-full"
              />
            ) : (
              /*
               * ส่ง onRowClick + getRowClassName ให้ DataTable
               * เพื่อให้ทุก <tr> clickable และ highlight แถวที่เลือก
               */
              <DataTable
                table={table}
                emptyText={t('no_result')}
                onRowClick={onRowClick}
                getRowClassName={(row) =>
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

          <DeleteDialog
            isOpen={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
            title={t('delete_machines')}
            confirmText="DELETE"
            isAlert={false}
            variant="destructive"
            onConfirm={onDeleteData}
            onSuccess={() => {
              onFetchData(filters)
              setSelectedIds([])
            }}
          />
        </TblContainer>
      </CardContent>
    </Card>
  )
}