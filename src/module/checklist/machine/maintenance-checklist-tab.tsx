import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { ClipboardList } from 'lucide-react'

// ─── Types (ตรงกับ MaintenanceChDTO) ─────────────────────────────────────────

interface MaintenanceChecklistItem {
  id:          number
  machineCode: string
  isChoice:    boolean
  checkStatus: boolean
  resetTime:   string
  question: {
    detail:      string
    description: string
  } | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MaintenanceChecklistTab({ machineCode }: { machineCode: string }) {
  const [items,   setItems]   = useState<MaintenanceChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!machineCode) return
    fetchChecklist()
  }, [machineCode])

  const fetchChecklist = async () => {
    try {
      setLoading(true)
      // endpoint คืน List<MaintenanceChDTO> ตรงๆ ไม่ใช่ ApiResponse wrapper
      const res = await api.getInstance().get<MaintenanceChecklistItem[]>(
        `/api/maintenance-checklist/by-machine`,
        { params: { machineCode } }
      )
      setItems(Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Failed to load maintenance checklist')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  )

  if (items.length === 0) return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-10 gap-3">
        <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No maintenance checklist items</p>
      </CardContent>
    </Card>
  )

  return (
    <Card className="p-6">
        <CardContent className="p-0">
            <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                <tr>
                    <th className="text-left px-4 py-3 font-medium">Detail</th>
                    <th className="text-left px-4 py-3 font-medium w-[30%]">Description</th>
                    <th className="text-left px-4 py-3 font-medium w-[18%]">Reset Time</th>
                    <th className="text-left px-4 py-3 font-medium w-[10%]">Status</th>
                </tr>
                </thead>
                <tbody className="divide-y">
                {items.map(item => (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                        <span className="line-clamp-2">{item.question?.detail ?? '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                        <span className="line-clamp-2">{item.question?.description ?? '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {item.resetTime ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        item.checkStatus
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-zinc-100 text-zinc-500'
                        }`}>
                        {item.checkStatus ? 'Done' : 'Pending'}
                        </span>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </CardContent>
    </Card>
  )
}