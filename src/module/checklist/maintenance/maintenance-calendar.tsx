import { useEffect, useState, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'
import { useRouter } from '@tanstack/react-router'
import { cn } from '@/core/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaintenanceEvent {
  id:                    number
  machineCode:           string
  machineName:           string
  dueDate:               string
  round?:                number
  status?:               string
  machineDepartmentCode?: string
  machineDepartmentName?: string
}

interface DayCell {
  date:           Date
  isCurrentMonth: boolean
  events:         MaintenanceEvent[]
}

interface PopupPos { top: number; left: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK_KEYS = ['cal_mon','cal_tue','cal_wed','cal_thu','cal_fri','cal_sat','cal_sun']
const MONTH_KEYS = ['january','february','march','april','may','june','july','august','september','october','november','december']

function addMonths(year: number, month: number, delta: number) {
  const d = new Date(year, month + delta, 1)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function buildCalendarGrid(year: number, month: number, events: MaintenanceEvent[]): DayCell[] {
  const firstDay = new Date(year, month, 1)
  const lastDay  = new Date(year, month + 1, 0)
  let startOffset = firstDay.getDay() - 1
  if (startOffset < 0) startOffset = 6
  const cells: DayCell[] = []
  for (let i = startOffset - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month, -i), isCurrentMonth: false, events: [] })
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d)
    const key  = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ date, isCurrentMonth: true, events: events.filter(e => (e.dueDate ?? '').slice(0, 10) === key) })
  }
  const rem = cells.length % 7
  if (rem !== 0)
    for (let d = 1; d <= 7 - rem; d++)
      cells.push({ date: new Date(year, month + 1, d), isCurrentMonth: false, events: [] })
  return cells
}

function calcPopupPos(triggerRect: DOMRect, popupW: number, popupH: number): PopupPos {
  const VW = window.innerWidth, VH = window.innerHeight
  let top = triggerRect.bottom + 6, left = triggerRect.left
  if (top  + popupH > VH - 8) top  = triggerRect.top - popupH - 6
  if (left + popupW > VW - 8) left = VW - popupW - 8
  if (left < 8) left = 8
  if (top  < 8) top  = 8
  return { top, left }
}

// ─── Status helpers ───────────────────────────────────────────────────────────

function getEventDotClass(status?: string) {
  switch (status?.toUpperCase()) {
    case 'ON TIME':   return 'bg-emerald-500'
    case 'OVERDUE':   return 'bg-red-500'
    case 'PENDING':   return 'bg-amber-400'
    case 'COMPLETED': return 'bg-emerald-500'
    default:          return 'bg-blue-400'
  }
}

function getStatusBadgeClass(status?: string) {
  switch (status?.toUpperCase()) {
    case 'ON TIME':   return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
    case 'OVERDUE':   return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    case 'PENDING':   return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    case 'COMPLETED': return 'bg-emerald-100 text-emerald-700'
    default:          return 'bg-zinc-100 text-zinc-600'
  }
}

// ─── Detail popup ─────────────────────────────────────────────────────────────

function EventDetailPopup({ event, pos, onClose, onOpen, t }: {
  event:   MaintenanceEvent
  pos:     PopupPos
  onClose: () => void
  onOpen:  (id: number) => void
  t:       (k: string) => string
}) {
  const [y, m, d] = event.dueDate.split('-')
  const dept = event.machineDepartmentName ?? event.machineDepartmentCode

  return (
    <div
      className="fixed z-[300] w-72 rounded-xl border bg-popover shadow-xl p-4 space-y-3 text-sm"
      style={{ top: pos.top, left: pos.left }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold leading-snug text-foreground">{event.machineCode} – {event.machineName}</p>
        <button onClick={onClose} className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{t('due_date')}: <span className="text-foreground font-medium">{`${d}-${m}-${y}`}</span></span>
        </div>
        {event.round != null && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('round')}:</span>
            <span className="text-foreground font-medium">{event.round}</span>
          </div>
        )}
        {dept && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{t('department')}:</span>
            <Badge variant="outline" className="text-[10px] h-5">{dept}</Badge>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{t('check_status')}:</span>
          {event.status
            ? <Badge className={cn('text-[10px] h-5', getStatusBadgeClass(event.status))}>{event.status}</Badge>
            : <span className="text-muted-foreground">-</span>}
        </div>
      </div>
      <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => onOpen(event.id)}>
        {t('view') || 'View'} →
      </Button>
    </div>
  )
}

// ─── More list popup ──────────────────────────────────────────────────────────

function MoreListPopup({ cell, pos, onClose, onSelectEvent, t }: {
  cell:          DayCell
  pos:           PopupPos
  onClose:       () => void
  onSelectEvent: (e: React.MouseEvent, ev: MaintenanceEvent) => void
  t:             (k: string) => string
}) {
  return (
    <div
      className="fixed z-[300] w-52 max-h-52 overflow-y-auto rounded-lg border bg-popover shadow-xl p-2"
      style={{ top: pos.top, left: pos.left }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-1 sticky top-0 bg-popover pb-1 border-b">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          {cell.date.getDate()}/{cell.date.getMonth() + 1} · {cell.events.length} {t('cal_items')}
        </span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-2"><X className="w-3 h-3" /></button>
      </div>
      <div className="space-y-0.5 pt-0.5">
        {cell.events.map((ev, i) => (
          <button key={`ml-${ev.id}-${i}`} onClick={e => { onClose(); onSelectEvent(e, ev) }}
            className="w-full flex items-center gap-1.5 rounded px-1 py-1 text-left hover:bg-accent/60 transition-colors">
            <span className={cn('shrink-0 w-1.5 h-1.5 rounded-full', getEventDotClass(ev.status))} />
            <span className="truncate text-[10px] leading-tight text-foreground/80 font-medium">{ev.machineName || ev.machineCode}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

function CalendarDayCell({ cell, isToday, onEventClick, onShowMore, t }: {
  cell:         DayCell
  isToday:      boolean
  onEventClick: (e: React.MouseEvent, ev: MaintenanceEvent) => void
  onShowMore:   (e: React.MouseEvent, cell: DayCell) => void
  t:            (k: string) => string
}) {
  const MAX_VISIBLE = 2
  const visible  = cell.events.slice(0, MAX_VISIBLE)
  const overflow = cell.events.length - MAX_VISIBLE

  return (
    <div className={cn('relative min-h-[80px] p-1 border-b border-r text-xs transition-colors select-none', !cell.isCurrentMonth && 'bg-muted/30')}>
      <span className={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium mb-0.5',
        isToday && 'bg-red-600 text-white',
        !cell.isCurrentMonth && 'text-muted-foreground/50')}>
        {cell.date.getDate()}
      </span>
      <div className="space-y-0.5">
        {visible.map((ev, i) => (
          <button key={`${ev.id}-${i}`} onClick={e => onEventClick(e, ev)}
            className="w-full flex items-center gap-1 rounded px-0.5 py-0.5 text-left hover:bg-accent/60 transition-colors">
            <span className={cn('shrink-0 w-1.5 h-1.5 rounded-full', getEventDotClass(ev.status))} />
            <span className="truncate text-[10px] leading-tight text-foreground/80 font-medium">
              {ev.machineName || ev.machineCode}
            </span>
          </button>
        ))}
        {overflow > 0 && (
          <button onClick={e => onShowMore(e, cell)} className="w-full px-0.5 text-[10px] text-blue-500 hover:text-blue-700 text-left font-medium">
            +{overflow} {t('cal_more')}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Month calendar ───────────────────────────────────────────────────────────

function MonthCalendar({ year, month, events, today, onEventClick, onShowMore, t }: {
  year:         number
  month:        number
  events:       MaintenanceEvent[]
  today:        Date
  onEventClick: (e: React.MouseEvent, ev: MaintenanceEvent) => void
  onShowMore:   (e: React.MouseEvent, cell: DayCell) => void
  t:            (k: string) => string
}) {
  const cells = buildCalendarGrid(year, month, events)
  const label = `${t(MONTH_KEYS[month])} ${year}`

  return (
    <div className="flex flex-col min-w-0">
      <div className="py-2 px-3 text-center text-sm font-semibold border-b bg-muted/10">{label}</div>
      <div className="grid grid-cols-7 border-b">
        {DAYS_OF_WEEK_KEYS.map(key => (
          <div key={key} className="py-1.5 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{t(key)}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 border-l flex-1">
        {cells.map((cell, idx) => {
          const isToday =
            cell.date.getDate()     === today.getDate()     &&
            cell.date.getMonth()    === today.getMonth()    &&
            cell.date.getFullYear() === today.getFullYear()
          return (
            <CalendarDayCell key={`${year}-${month}-${idx}`} cell={cell} isToday={isToday}
              onEventClick={onEventClick} onShowMore={onShowMore} t={t} />
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MaintenanceCalendarCard() {
  const { t }  = useTranslation('checklist')
  const router = useRouter()
  const today  = new Date()

  const [anchor, setAnchor]             = useState(addMonths(today.getFullYear(), today.getMonth(), -1))
  const [eventsByMonth, setEventsByMonth] = useState<Record<string, MaintenanceEvent[]>>({})
  const [yearlyStats, setYearlyStats]   = useState({ total: 0, onTime: 0, pending: 0, overdue: 0 })
  const [loading, setLoading]           = useState(false)
  const [detailPopup, setDetailPopup]   = useState<{ event: MaintenanceEvent; pos: PopupPos } | null>(null)
  const [morePopup,   setMorePopup]     = useState<{ cell: DayCell; pos: PopupPos } | null>(null)

  const months = [
    anchor,
    addMonths(anchor.year, anchor.month, 1),
    addMonths(anchor.year, anchor.month, 2),
  ]
  const centreYear = addMonths(anchor.year, anchor.month, 1).year

  const prev3   = () => { setAnchor(a => addMonths(a.year, a.month, -3)); closeAll() }
  const next3   = () => { setAnchor(a => addMonths(a.year, a.month,  3)); closeAll() }
  const goToday = () => { setAnchor(addMonths(today.getFullYear(), today.getMonth(), -1)); closeAll() }
  const closeAll = () => { setDetailPopup(null); setMorePopup(null) }

  const parseRes = (res: unknown): MaintenanceEvent[] => {
    if (Array.isArray(res)) return res as MaintenanceEvent[]
    if (Array.isArray((res as any)?.data)) return (res as any).data
    if (typeof res === 'object' && res !== null) {
      const numeric = Object.entries(res as any)
        .filter(([k]) => !isNaN(Number(k)))
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, v]) => v)
      if (numeric.length > 0) return numeric as MaintenanceEvent[]
    }
    return []
  }

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const yr = addMonths(anchor.year, anchor.month, 1).year
      const visibleTargets = [
        addMonths(anchor.year, anchor.month, 0),
        addMonths(anchor.year, anchor.month, 1),
        addMonths(anchor.year, anchor.month, 2),
      ]
      const allMonthTargets = Array.from({ length: 12 }, (_, i) => ({ year: yr, month: i }))

      const [visibleResults, yearlyResults] = await Promise.all([
        Promise.all(visibleTargets.map(({ year, month }) => {
          const params = new URLSearchParams()
          params.set('year', String(year)); params.set('month', String(month + 1))
          return api.get<unknown>('/api/maintenance/calendar', { params })
            .then(res => ({ year, month, data: parseRes(res) }))
            .catch(() => ({ year, month, data: [] as MaintenanceEvent[] }))
        })),
        Promise.all(allMonthTargets.map(({ year, month }) => {
          const params = new URLSearchParams()
          params.set('year', String(year)); params.set('month', String(month + 1))
          return api.get<unknown>('/api/maintenance/calendar', { params })
            .then(res => parseRes(res))
            .catch(() => [] as MaintenanceEvent[])
        })),
      ])

      const map: Record<string, MaintenanceEvent[]> = {}
      visibleResults.forEach(({ year, month, data }) => { map[`${year}-${month + 1}`] = data })
      setEventsByMonth(map)

      const allYear = yearlyResults.flat()
      setYearlyStats({
        total:   allYear.length,
        onTime:  allYear.filter(e => e.status?.toUpperCase() === 'ON TIME').length,
        pending: allYear.filter(e => e.status?.toUpperCase() === 'PENDING').length,
        overdue: allYear.filter(e => e.status?.toUpperCase() === 'OVERDUE').length,
      })
    } finally {
      setLoading(false)
    }
  }, [anchor.year, anchor.month])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  useEffect(() => {
    const handler = () => closeAll()
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleEventClick = useCallback((e: React.MouseEvent, event: MaintenanceEvent) => {
    e.stopPropagation()
    setMorePopup(null)
    const pos = calcPopupPos((e.currentTarget as HTMLElement).getBoundingClientRect(), 288, 240)
    setDetailPopup(prev => prev?.event.id === event.id ? null : { event, pos })
  }, [])

  const handleShowMore = useCallback((e: React.MouseEvent, cell: DayCell) => {
    e.stopPropagation()
    setDetailPopup(null)
    const pos = calcPopupPos((e.currentTarget as HTMLElement).getBoundingClientRect(), 208, 220)
    setMorePopup(prev => prev?.cell === cell ? null : { cell, pos })
  }, [])

  const allEvents  = Object.values(eventsByMonth).flat()
  const rangeLabel = `${new Date(months[0].year, months[0].month).toLocaleString('default', { month: 'short', year: 'numeric' })} – ${new Date(months[2].year, months[2].month).toLocaleString('default', { month: 'short', year: 'numeric' })}`

  return (
    <>
      <Card className="p-0 mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b px-5 py-4">
          <CardTitle className="font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-red-600" />
            {t('maintenance_calendar')}
          </CardTitle>
          <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="text-muted-foreground">{centreYear} ·</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              {t('status_on_time')} <span className="font-semibold text-foreground">{yearlyStats.onTime}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              {t('status_pending')} <span className="font-semibold text-foreground">{yearlyStats.pending}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
              {t('status_overdue')} <span className="font-semibold text-foreground">{yearlyStats.overdue}</span>
            </span>
            <span className="text-muted-foreground">/ {yearlyStats.total} {t('cal_items')}</span>
          </div>
        </CardHeader>

        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
          <Button variant="outline" size="sm" className="h-8 px-3 text-xs" onClick={goToday}>{t('today')}</Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev3}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-semibold min-w-[200px] text-center">{rangeLabel}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next3}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <span className="text-xs text-muted-foreground">{yearlyStats.total} {t('cal_items')}</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="grid grid-cols-3 min-w-[720px] divide-x border-b">
              {months.map(({ year, month }) => (
                <MonthCalendar key={`month-${year}-${month}`} year={year} month={month}
                  events={eventsByMonth[`${year}-${month + 1}`] ?? []}
                  today={today} onEventClick={handleEventClick} onShowMore={handleShowMore} t={t} />
              ))}
            </div>
          </div>
        )}

        {!loading && allEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground text-sm">
            <Calendar className="w-8 h-8 opacity-30" />
            <p>{t('no_result')}</p>
          </div>
        )}
      </Card>

      {morePopup && (
        <MoreListPopup cell={morePopup.cell} pos={morePopup.pos}
          onClose={() => setMorePopup(null)} onSelectEvent={handleEventClick} t={t} />
      )}
      {detailPopup && (
        <EventDetailPopup event={detailPopup.event} pos={detailPopup.pos}
          onClose={() => setDetailPopup(null)}
          onOpen={id => router.navigate({ to: '/checklist/maintenance/view', search: { id } })}
          t={t} />
      )}
    </>
  )
}