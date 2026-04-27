import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { ClipboardList } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/core/contexts/language-context'


interface QuestionSummary {
  detail:      string
  description: string
}

interface ChecklistItem {
  checkStatus: boolean
  resetTime:   string
  question:    QuestionSummary | null
}

interface ListResponse<T> {
  success: boolean
  data:    T
  hasMore: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChecklistTab({ machineCode }: { machineCode: string }) {
  const { t } = useTranslation('checklist')
  const [items,   setItems]   = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!machineCode) return
    fetchChecklist()
  }, [machineCode])

  const fetchChecklist = async () => {
    try {
      setLoading(true)
      const res = await api.getInstance().get<ListResponse<ChecklistItem[]>>(
        `/api/machine-checklist/by-machine`,
        { params: { machineCode } }
      )
      setItems(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch {
      toast.error('Failed to load checklist')
    } finally {
      setLoading(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  )

  // ── Empty ────────────────────────────────────────────────────────────────

  if (items.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <ClipboardList className="h-10 w-10 opacity-30" />
      <p className="text-sm">No checklist items for this machine</p>
    </div>
  )

  // ── Table ────────────────────────────────────────────────────────────────

  return (
    <Card className="p-6">
      <CardContent className="p-0">
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium w-[45%]">Detail</th>
                <th className="text-left px-4 py-3 font-medium w-[35%]">Description</th>
                <th className="text-left px-4 py-3 font-medium w-[12%]">Reset Time</th>
                <th className="text-left px-4 py-3 font-medium w-[8%]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, idx) => (
                <tr key={idx} className="hover:bg-muted/30 transition-colors">
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