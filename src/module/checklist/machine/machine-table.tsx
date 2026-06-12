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
import { TblAction } from '@/components/action/tbl-action'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Drill, Filter, X, ChevronDown } from 'lucide-react'
import { getStatusColor } from '@/utils/status.untils'
import { useAuth } from '@/core/contexts/auth-context'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MachineDTO {
  id: number
  machineCode: string
  machineName: string
  department: string
  machineStatus: string
  checkStatus: string
  responsiblePersonName: string
}

interface MachineFilters {
  department: string
  machineStatus: string
  checkStatus: string
  responsiblePersonName: string
}

interface FilterOptions {
  departments: string[]
  machineStatuses: string[]
  checkStatuses: string[]
  responsiblePersons: string[]
}

type ViewMode = 'overview' | 'mine'

interface MachineTblProps {
  onSelectionChange?: (ids: number[]) => void
  onSearchChange?: (keyword: string) => void
}

// ─── FilterBadge ──────────────────────────────────────────────────────────────

function FilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge
      variant="secondary"
      className="flex items-center gap-1 px-2 py-0.5 text-xs font-normal rounded-full"
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:text-destructive transition-colors"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="w-3 h-3" />
      </button>
    </Badge>
  )
}

// ─── MachineFilterPanel ───────────────────────────────────────────────────────

const EMPTY = '__ALL__'

function MachineFilterPanel({
  filters,
  options,
  onChange,
  onClear,
  activeCount,
  t,
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 h-8 relative"
        >
          <Filter className="w-3.5 h-3.5" />
          {t('filter')}
          {activeCount > 0 && (
            <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-700 text-[10px] font-bold text-white">
              {activeCount}
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{t('filter_by')}</p>
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
              onClick={() => {
                onClear()
                setOpen(false)
              }}
            >
              <X className="w-3 h-3 mr-1" />
              {t('clear_all')}
            </Button>
          )}
        </div>

        <Separator />

        {/* Department */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('department')}
          </label>
          <Select
            value={filters.department || EMPTY}
            onValueChange={v => onChange('department', v === EMPTY ? '' : v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY}>{t('all')}</SelectItem>
              {options.departments.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Machine Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('machine_status')}
          </label>
          <Select
            value={filters.machineStatus || EMPTY}
            onValueChange={v => onChange('machineStatus', v === EMPTY ? '' : v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY}>{t('all')}</SelectItem>
              {options.machineStatuses.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Check Status */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('check_status')}
          </label>
          <Select
            value={filters.checkStatus || EMPTY}
            onValueChange={v => onChange('checkStatus', v === EMPTY ? '' : v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY}>{t('all')}</SelectItem>
              {options.checkStatuses.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Responsible Person */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('responsible')}
          </label>
          <Select
            value={filters.responsiblePersonName || EMPTY}
            onValueChange={v => onChange('responsiblePersonName', v === EMPTY ? '' : v)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder={t('all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={EMPTY}>{t('all')}</SelectItem>
              {options.responsiblePersons.map(p => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── MachineTbl ───────────────────────────────────────────────────────────────

export function MachineTbl({ onSelectionChange, onSearchChange }: MachineTblProps) {
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

  // ✅ ใช้ ref เก็บค่า pagination และ viewMode ล่าสุด เพื่อให้ onFetchData อ่านได้เสมอ
  const paginationRef = useRef(pagination)
  const viewModeRef = useRef(viewMode)
  const searchValueRef = useRef(searchValue)

  useEffect(() => { paginationRef.current = pagination }, [pagination])
  useEffect(() => { viewModeRef.current = viewMode }, [viewMode])
  useEffect(() => { searchValueRef.current = searchValue }, [searchValue])

  const activeFilterCount = Object.values(filters).filter(Boolean).length

  // ─── Emit to parent ───────────────────────────────────────────────────────

  useEffect(() => { onSelectionChange?.(selectedIds) }, [selectedIds])
  useEffect(() => { onSearchChange?.(keyword) }, [keyword])

  // ─── Sync debounced search → fetch ───────────────────────────────────────

  useEffect(() => {
    setSearchValue(debouncedSearch)
  }, [debouncedSearch])

  // ─── Fetch on search / pagination / viewMode change ──────────────────────

  useEffect(() => {
    onFetchData(filters)
  }, [searchValue, pagination.pageIndex, pagination.pageSize, viewMode])

  // ─── Fetch filter options once ────────────────────────────────────────────

  useEffect(() => {
    fetchFilterOptions()
  }, [])

  // ─── Core fetch (รับ filters เป็น param เพื่อหนี stale closure) ──────────

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

      // ✅ ใช้ currentFilters ที่รับมา ไม่ใช่ filters จาก closure
      if (currentFilters.department)            params.set('department', currentFilters.department)
      if (currentFilters.machineStatus)         params.set('machineStatus', currentFilters.machineStatus)
      if (currentFilters.checkStatus)           params.set('checkStatus', currentFilters.checkStatus)
      if (currentFilters.responsiblePersonName) params.set('responsiblePersonName', currentFilters.responsiblePersonName)

      const response = await api.get<PageResponse<MachineDTO>>('/api/machine/get/page', { params })

      if (response?.success) {
        const rows = response.data ?? []
        setData(rows)
        setTotalCount(response.totalElements ?? 0)
        deriveOptionsFromData(rows)
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

  // ─── Filter options ───────────────────────────────────────────────────────

  const fetchFilterOptions = async () => {
    try {
      const response = await api.get<ResponseDTO<FilterOptions>>('/api/machine/filter-options')
      if (response?.success && response.data) {
        setFilterOptions(response.data)
      }
    } catch {
      // fallback: deriveOptionsFromData จะสะสม options เอง
    }
  }

  const deriveOptionsFromData = (rows: MachineDTO[]) => {
    const unique = <T,>(arr: T[]) => [...new Set(arr.filter(Boolean))] as T[]
    setFilterOptions(prev => ({
      departments:        unique([...prev.departments,        ...rows.map(r => r.department)]),
      machineStatuses:    unique([...prev.machineStatuses,    ...rows.map(r => r.machineStatus)]),
      checkStatuses:      unique([...prev.checkStatuses,      ...rows.map(r => r.checkStatus)]),
      responsiblePersons: unique([...prev.responsiblePersons, ...rows.map(r => r.responsiblePersonName)]),
    }))
  }

  // ─── Status label ─────────────────────────────────────────────────────────

  const getStatusLabel = (status: string) => {
    const key = status.toLowerCase().replace(/\s+/g, '_')
    const translated = t(`status_${key}`)
    return translated !== `status_${key}` ? translated : status
  }

  // ─── Columns ──────────────────────────────────────────────────────────────

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
        <div onClick={e => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={checked =>
              setSelectedIds(prev =>
                checked ? [...prev, row.original.id] : prev.filter(id => id !== row.original.id)
              )
            }
            aria-label="Select row"
          />
        </div>
      ),
      size: 32,
    },
    {
      id: 'action',
      header: t('action'),
      cell: ({ row }) => (
        <TblAction
          view edit delete
          onView={() => handleView(row.original.id)}
          onEdit={() => handleEdit(row.original.id)}
          onDelete={() => handleDelete(row.original.id)}
        />
      ),
      size: 80,
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
      cell: ({ row }) => <div className="text-sm">{row.original.department || '-'}</div>,
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

  // ─── Filter handlers ──────────────────────────────────────────────────────

  // ✅ สร้าง newFilters ก่อน แล้วส่งเข้า onFetchData ทันที ไม่รอ setState
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

  const handleRemoveFilter = useCallback(
    (key: keyof MachineFilters) => handleFilterChange(key, ''),
    [handleFilterChange]
  )

  // ─── Other handlers ───────────────────────────────────────────────────────

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

  const handleAdd    = () => router.navigate({ to: '/checklist/machine/add', search: { refId: undefined } })
  const handleView   = (id: number) => router.navigate({ to: '/checklist/machine/view', search: { id } })
  const handleEdit   = (id: number) => router.navigate({ to: '/checklist/machine/edit', search: { id } })
  const handleDelete = (id: number) => { setSelectedIds([id]); setShowDeleteDialog(true) }

  // ─── Table ────────────────────────────────────────────────────────────────

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

  // ─── Filter label map ─────────────────────────────────────────────────────

  const filterLabelMap: Record<keyof MachineFilters, string> = {
    department:            t('department'),
    machineStatus:         t('machine_status'),
    checkStatus:           t('check_status'),
    responsiblePersonName: t('responsible'),
  }

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
              <TabsTrigger
                value="mine"
                className="data-[state=active]:bg-red-700 data-[state=active]:text-white"
              >
                {t('view_mine')}
              </TabsTrigger>
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-red-700 data-[state=active]:text-white"
              >
                {t('view_overview')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </CardHeader>

      <CardContent>
        <TblContainer>

          {/* ─── Toolbar + Filter button ──────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
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
              className="flex-1 gap-2"
            />
            <MachineFilterPanel
              filters={filters}
              options={filterOptions}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
              activeCount={activeFilterCount}
              t={t}
            />
          </div>

          {/* ─── Active filter badges ─────────────────────────────────────── */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-xs text-muted-foreground">{t('active_filters')}:</span>
              {(Object.entries(filters) as [keyof MachineFilters, string][])
                .filter(([, v]) => Boolean(v))
                .map(([key, value]) => (
                  <FilterBadge
                    key={key}
                    label={`${filterLabelMap[key]}: ${value}`}
                    onRemove={() => handleRemoveFilter(key)}
                  />
                ))}
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2 transition-colors"
              >
                {t('clear_all')}
              </button>
            </div>
          )}

          {/* ─── Table ───────────────────────────────────────────────────── */}
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
              <DataTable table={table} emptyText={t('no_result')} />
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