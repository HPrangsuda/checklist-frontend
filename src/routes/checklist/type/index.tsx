import { getCoreRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton'
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar'
import type { PageResponse } from '@/core/types/common'
import { useTranslation } from '@/core/contexts/language-context'
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
import { Button } from '@/components/ui/button'
import { Check, ChevronDown, Search } from 'lucide-react'
import { cn } from '@/core/lib/utils'

export const Route = createFileRoute('/checklist/type/')({
  component: DataTbl,
})

interface MachineTypeDTO {
  id: number
  machineGroupId: string
  machineGroupName: string
  machineTypeId: string
  machineTypeName: string
  status: string
}

interface GroupOption {
  machineGroupId: string
  machineGroupName: string
}

/* =======================
   Group Filter Dropdown
======================= */
function GroupFilter({
  groups,
  selectedGroupIds,
  onChange,
}: {
  groups: GroupOption[]
  selectedGroupIds: string[]
  onChange: (ids: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = groups.filter(g =>
    g.machineGroupName.toLowerCase().includes(search.toLowerCase())
  )

  const toggle = (id: string) => {
    if (selectedGroupIds.includes(id)) {
      onChange(selectedGroupIds.filter(x => x !== id))
    } else {
      onChange([...selectedGroupIds, id])
    }
  }

  return (
    <div className="relative pb-2" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'gap-1.5 h-8 text-sm font-normal',
          selectedGroupIds.length > 0 && 'border-primary text-primary'
        )}
      >
        <span>Group</span>
        {selectedGroupIds.length > 0 && (
          <span className="bg-primary text-primary-foreground rounded-full text-xs w-4 h-4 flex items-center justify-center leading-none">
            {selectedGroupIds.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 w-56 rounded-md border bg-popover shadow-md">
          {/* Search */}
          <div className="flex items-center border-b px-3 py-2 gap-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results found.</div>
            ) : (
              filtered.map(g => {
                const checked = selectedGroupIds.includes(g.machineGroupId)
                return (
                  <button
                    key={g.machineGroupId}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent text-left"
                    onClick={() => toggle(g.machineGroupId)}
                  >
                    <div className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center shrink-0',
                      checked ? 'bg-primary border-primary' : 'border-input'
                    )}>
                      {checked && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <span className="truncate">{g.machineGroupName}</span>
                  </button>
                )
              })
            )}
          </div>

          {/* Clear */}
          {selectedGroupIds.length > 0 && (
            <div className="border-t px-3 py-1.5">
              <button
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => { onChange([]); setOpen(false) }}
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* =======================
   Main Table
======================= */
function DataTbl() {
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 })
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [data, setData] = useState<MachineTypeDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [groups, setGroups] = useState<GroupOption[]>([])
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const debouncedSearch = useDebounce(keyword, 500)
  const router = useRouter()
  const { t } = useTranslation()

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-emerald-100 text-emerald-600 dark:text-emerald-100'
      case 'inactive': return 'bg-red-100 text-red-600 dark:text-red-100'
      default: return 'bg-zinc-100 text-zinc-600 dark:text-zinc-100'
    }
  }

  const columns: ColumnDef<MachineTypeDTO>[] = [
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
      accessorKey: 'machineGroupId',
      header: 'Group ID',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.machineGroupId}</div>
      ),
    },
    {
      accessorKey: 'machineGroupName',
      header: 'Group Name',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.machineGroupName}>
          {row.original.machineGroupName}
        </div>
      ),
    },
    {
      accessorKey: 'machineTypeId',
      header: 'Type ID',
      cell: ({ row }) => <div>{row.original.machineTypeId}</div>,
    },
    {
      accessorKey: 'machineTypeName',
      header: 'Type Name',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.machineTypeName}>
          {row.original.machineTypeName}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={getStatusColor(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'action',
      header: 'Action',
      cell: ({ row }) => (
        <TblAction edit onEdit={() => handleEdit(row.original.id)} />
      ),
      size: 80,
    },
  ]

  // Fetch distinct groups for filter dropdown
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await api.getInstance().get<GroupOption[]>('/api/type/groups/distinct')
        if (Array.isArray(res.data)) setGroups(res.data)
      } catch {
        // silent fail — filter just won't have options
      }
    }
    fetchGroups()
  }, [])

  // Fetch table data
  useEffect(() => {
    onFetchData()
  }, [debouncedSearch, pagination.pageIndex, pagination.pageSize, selectedGroupIds])

  const onFetchData = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = {
        index: pagination.pageIndex,
        size: pagination.pageSize,
      }
      if (debouncedSearch.trim()) params.keyword = debouncedSearch.trim()

      // ถ้าเลือก group filter → ใช้ endpoint by-group (loop แต่ละ group แล้วรวม)
      // แต่เนื่องจาก backend มี /list ที่รับ ids ได้ ใช้ /list กับ group filter แทน
      // ถ้าไม่มี group filter → ใช้ /list ปกติ
      // สร้าง URLSearchParams เองเพื่อให้ array ส่งเป็น ?groupIds=aa&groupIds=aaa
      // แทนที่จะเป็น ?groupIds[]=aa&groupIds[]=aaa ที่ axios ทำโดย default
      const searchParams = new URLSearchParams()
      searchParams.set('index', String(params.index))
      searchParams.set('size', String(params.size))
      if (params.keyword) searchParams.set('keyword', params.keyword)
      selectedGroupIds.forEach(id => searchParams.append('groupIds', id))

      const response = await api.get<PageResponse<MachineTypeDTO>>(
        `/api/type/list?${searchParams.toString()}`
      )

      if (response.success) {
        setData(response.data ?? [])
        setTotalCount(response.totalElements ?? 0)
      } else {
        toast.error(response.message ?? 'Failed to load data')
      }
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Data fetch failed')
    } finally {
      setLoading(false)
      setSelectedIds([])
    }
  }

  const handleSearch = useCallback((value: string) => {
    setKeyword(value || '')
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  const handleGroupFilter = (ids: string[]) => {
    setSelectedGroupIds(ids)
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }

  const handleAdd = () => router.navigate({ to: '/checklist/type/add' })
  const handleEdit = (id: number) => router.navigate({ to: '/checklist/type/edit', search: { id } })

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

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Card className="p-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-bold">Group & Type List</CardTitle>
          </CardHeader>
          <TblContainer>
            <div className="flex items-center gap-2 flex-wrap">
              <DataTableToolbar
                table={table}
                isSync={false}
                isAdd={true}
                onSearch={handleSearch}
                onAdd={handleAdd}
                isServerSide={true}
                searchValue={keyword}
                breakpoint={1300}
                className="w-full gap-2"
              />
              {/* Group filter — วางต่อจาก toolbar */}
              <GroupFilter
                groups={groups}
                selectedGroupIds={selectedGroupIds}
                onChange={handleGroupFilter}
              />
            </div>
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
                <DataTable
                  table={table}
                  emptyText={t('No Result')}
                />
              )}
            </div>
          </TblContainer>
        </Card>
      </main>
    </div>
  )
}