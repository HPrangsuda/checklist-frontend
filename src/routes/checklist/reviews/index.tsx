import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, Shuffle,
} from 'lucide-react'

export const Route = createFileRoute('/checklist/reviews/')({
  component: ReviewIndex,
})

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReviewItem {
  id:           number
  machineCode:  string
  machineName:  string
  lastReview:   unknown
  reviewBy:     string | null
  reviewByName: string | null
}

interface ReviewSummary {
  year:              number
  month:             number
  remainingMonths:   number
  totalActive:       number
  poolAtMonthStart:  number
  quota:             number
  reviewedThisYear:  number
  reviewedThisMonth: number
  pendingCount:      number
}

interface ReviewPage {
  items:      ReviewItem[]
  index:      number
  size:       number
  total:      number
  totalPages: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PAGE_SIZES = [10, 20, 50, 100]

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

/** แทนค่า {key} ในข้อความแปล */
const fmt = (text: string, vars: Record<string, string | number>) =>
  Object.entries(vars).reduce((s, [k, v]) => s.split(`{${k}}`).join(String(v)), text)

function formatDate(val: unknown): string {
  if (!val) return '-'
  const parts = Array.isArray(val)
    ? (val as number[])
    : String(val).split('T')[0].split('-').map(Number)
  const [y, m, d] = parts
  if (!y || !m || !d) return '-'
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

// ─── Paged data hook ──────────────────────────────────────────────────────────

function usePagedReview(url: string) {
  const { t } = useTranslation('checklist')
  const [index,   setIndex]   = useState(0)
  const [size,    setSizeRaw] = useState(10)
  const [page,    setPage]    = useState<ReviewPage | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<any>(url, { params: { index, size } })
      if (res?.success === false) throw new Error(res?.message)
      const data: ReviewPage | null = res?.data ?? null
      // หน้าปัจจุบันหายไปหลังมีการตรวจ → ถอยกลับหน้าสุดท้ายที่มีข้อมูล
      if (data && data.totalPages > 0 && index >= data.totalPages) {
        setIndex(data.totalPages - 1)
        return
      }
      setPage(data)
    } catch {
      toast.error(t('review_list_load_failed'))
    } finally {
      setLoading(false)
    }
  }, [url, index, size])

  useEffect(() => { load() }, [load])

  const setSize = (s: number) => { setSizeRaw(s); setIndex(0) }

  return { index, size, page, loading, setIndex, setSize, reload: load }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 100
  return (
    <div className="flex items-center gap-2 min-w-[160px]">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums">{value}/{max}</span>
    </div>
  )
}

function Pagination({
  index, size, total, onIndexChange, onSizeChange,
}: {
  index:         number
  size:          number
  total:         number
  onIndexChange: (index: number) => void
  onSizeChange:  (size: number) => void
}) {
  const { t } = useTranslation('checklist')
  const totalPages = Math.max(1, Math.ceil(total / size))
  const [goTo, setGoTo] = useState(String(index + 1))

  useEffect(() => { setGoTo(String(index + 1)) }, [index])

  const go = (p: number) => onIndexChange(Math.min(totalPages - 1, Math.max(0, p)))

  const commitGoTo = () => {
    const n = Number(goTo)
    if (Number.isFinite(n) && n >= 1) go(n - 1)
    else setGoTo(String(index + 1))
  }

  const isFirst = index <= 0
  const isLast  = index >= totalPages - 1
  const navBtn  =
    'h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background text-foreground ' +
    'hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
      <span className="text-xs text-muted-foreground mr-auto">{fmt(t('total_items'), { count: total })}</span>

      <button type="button" className={navBtn} onClick={() => go(0)} disabled={isFirst} aria-label={t('page_first')}>
        <ChevronsLeft className="h-4 w-4" />
      </button>
      <button type="button" className={navBtn} onClick={() => go(index - 1)} disabled={isFirst} aria-label={t('page_prev')}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <button type="button" className={navBtn} onClick={() => go(index + 1)} disabled={isLast} aria-label={t('page_next')}>
        <ChevronRight className="h-4 w-4" />
      </button>
      <button type="button" className={navBtn} onClick={() => go(totalPages - 1)} disabled={isLast} aria-label={t('page_last')}>
        <ChevronsRight className="h-4 w-4" />
      </button>

      <select
        value={size}
        onChange={e => onSizeChange(Number(e.target.value))}
        aria-label={t('page_size')}
        className="h-9 rounded-md border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {PAGE_SIZES.map(s => <option key={s} value={s}>{s} {t('page_size_suffix')}</option>)}
      </select>

      <label className="flex items-center gap-2 text-sm">
        {t('go_to')}
        <input
          type="number"
          min={1}
          max={totalPages}
          value={goTo}
          onChange={e => setGoTo(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commitGoTo() }}
          onBlur={commitGoTo}
          className="h-9 w-14 rounded-md border bg-background text-center text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </label>
    </div>
  )
}

function ReviewTable({
  items, loading, emptyText, startNo, onOpen,
}: {
  items:     ReviewItem[]
  loading:   boolean
  emptyText: string
  startNo:   number
  onOpen:    (id: number) => void
}) {
  const { t } = useTranslation('checklist')

  if (!loading && items.length === 0)
    return (
      <div className="text-sm text-muted-foreground py-10 text-center border border-dashed rounded-lg">
        {emptyText}
      </div>
    )

  const th = 'text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap'

  return (
    <div className={`rounded-md border overflow-x-auto transition-opacity ${loading ? 'opacity-50' : ''}`}>
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className={`${th} w-12`}>#</th>
            <th className={th}>{t('machine_code')}</th>
            <th className={th}>{t('machine_name')}</th>
            <th className={th}>{t('last_review')}</th>
            <th className={th}>{t('reviewer')}</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.length === 0 && loading ? (
            <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">{t('loading')}</td></tr>
          ) : items.map((item, i) => (
            <tr
              key={item.id}
              tabIndex={0}
              onClick={() => onOpen(item.id)}
              onKeyDown={e => { if (e.key === 'Enter') onOpen(item.id) }}
              className="hover:bg-muted/30 cursor-pointer transition-colors focus-visible:outline-none focus-visible:bg-muted/40"
            >
              <td className="px-4 py-2.5 text-muted-foreground tabular-nums">{startNo + i}</td>
              <td className="px-4 py-2.5 font-medium whitespace-nowrap">{item.machineCode}</td>
              <td className="px-4 py-2.5"><span className="line-clamp-1">{item.machineName}</span></td>
              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(item.lastReview)}</td>
              <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{item.reviewByName || item.reviewBy || '-'}</td>
              <td className="px-2"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function ReviewIndex() {
  const { t }    = useTranslation('checklist')
  const navigate = useNavigate()

  const [summary,        setSummary]        = useState<ReviewSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)

  const pending  = usePagedReview('/api/machine/review/pending')
  const reviewed = usePagedReview('/api/machine/review/reviewed')

  const fetchSummary = async () => {
    setSummaryLoading(true)
    try {
      const res = await api.get<any>('/api/machine/review/summary')
      if (res?.success === false) throw new Error(res?.message)
      setSummary(res?.data ?? null)
    } catch {
      toast.error(t('review_summary_load_failed'))
    } finally {
      setSummaryLoading(false)
    }
  }

  useEffect(() => { fetchSummary() }, [])

  const refreshAll  = () => { fetchSummary(); pending.reload(); reviewed.reload() }
  const openMachine = (id: number) => navigate({ to: '/checklist/reviews/edit', search: { id } })

  const anyLoading = summaryLoading || pending.loading || reviewed.loading
  const monthLabel = summary ? `${t(MONTH_KEYS[summary.month - 1])} ${summary.year}` : ''

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold">{t('review_title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('review_subtitle')}</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" onClick={refreshAll} disabled={anyLoading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${anyLoading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
        </div>

        {/* ── Card 1: รอตรวจสอบเดือนนี้ (สุ่ม) ── */}
        <Card className="p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 shrink-0">
                <Shuffle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">{fmt(t('review_pending_title'), { month: monthLabel })}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {summary
                    ? fmt(t('review_pending_desc'), { quota: summary.quota, pending: summary.pendingCount })
                    : t('loading')}
                </p>
              </div>
            </div>
            {summary && <ProgressBar value={summary.reviewedThisMonth} max={summary.quota} />}
          </div>
          <div className="p-5">
            <ReviewTable
              items={pending.page?.items ?? []}
              loading={pending.loading}
              emptyText={t('review_pending_empty')}
              startNo={pending.index * pending.size + 1}
              onOpen={openMachine}
            />
            <Pagination
              index={pending.index}
              size={pending.size}
              total={pending.page?.total ?? 0}
              onIndexChange={pending.setIndex}
              onSizeChange={pending.setSize}
            />
            {summary && (
              <p className="text-xs text-muted-foreground mt-3">
                {fmt(t('review_quota_formula'), { pool: summary.poolAtMonthStart, months: summary.remainingMonths })}
              </p>
            )}
          </div>
        </Card>

        {/* ── Card 2: ตรวจสอบแล้วทั้งปี ── */}
        <Card className="p-0 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">
                  {fmt(t('review_reviewed_title'), { year: summary?.year ?? new Date().getFullYear() })}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {summary
                    ? fmt(t('review_reviewed_desc'), { reviewed: summary.reviewedThisYear, total: summary.totalActive })
                    : t('loading')}
                </p>
              </div>
            </div>
            {summary && <ProgressBar value={summary.reviewedThisYear} max={summary.totalActive} />}
          </div>
          <div className="p-5">
            <ReviewTable
              items={reviewed.page?.items ?? []}
              loading={reviewed.loading}
              emptyText={t('review_reviewed_empty')}
              startNo={reviewed.index * reviewed.size + 1}
              onOpen={openMachine}
            />
            <Pagination
              index={reviewed.index}
              size={reviewed.size}
              total={reviewed.page?.total ?? 0}
              onIndexChange={reviewed.setIndex}
              onSizeChange={reviewed.setSize}
            />
          </div>
        </Card>
      </main>
    </div>
  )
}