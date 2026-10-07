import { useEffect, useMemo, useState } from "react"
import { api } from "@/core/interceptor/api.interceptor"
import { toast } from "sonner"
import { useTranslation } from "@/core/contexts/language-context"

// ─── Types ────────────────────────────────────────────────────────────────────

// ตรงกับ ChecklistStatsDTO เดิม (ดูความหมาย field ใน ChecklistService → STATS MAPPING)
interface ChecklistStatsData {
  department: string
  month: number
  year: number
  dailyUse: number
  weeklyCheckDone: number
  weeklyCheckWaitLeader: number
  weeklyCheckWaitManager: number
  weeklyCheckPercent: number | null
  weeklyApprovePercent: number | null
  notCheckDone: number
  notCheckDoneNotCheck: number
  notCheckWaitLeader: number
  notCheckWaitManager: number
  notCheckApprovePercent: number | null
  notCheckApprovePercentFinal: number | null
}

// ค่าที่แสดงในตาราง (คำนวณจาก DTO)
interface ReportRow {
  month: number
  noData: boolean
  dailyUse: number
  checkAll: number
  checked: number
  approved: number
  waitSupervisor: number
  waitManager: number
  missed: number
  autoNotPerformed: number
  offCycle: number
  checkPercent: number | null
  approvePercent: number | null
  missedPercent: number | null
}

type CountKey =
  | "checkAll" | "checked" | "approved" | "waitSupervisor" | "waitManager"
  | "missed" | "autoNotPerformed" | "offCycle"
type PercentKey = "checkPercent" | "approvePercent" | "missedPercent"

const ALL_KEY = "__ALL__"
const UNASSIGNED_KEY = "UNASSIGNED"
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toRow(d: ChecklistStatsData): ReportRow {
  const checked = d.weeklyCheckDone + d.weeklyCheckWaitLeader + d.weeklyCheckWaitManager
  return {
    month: d.month,
    noData: d.weeklyCheckPercent === null,
    dailyUse: d.dailyUse,
    checkAll: checked + d.notCheckDone,
    checked,
    approved: d.weeklyCheckDone,
    waitSupervisor: d.weeklyCheckWaitLeader,
    waitManager: d.weeklyCheckWaitManager,
    missed: d.notCheckDone,
    autoNotPerformed: d.notCheckDoneNotCheck,
    offCycle: Math.max(d.dailyUse - checked - d.notCheckDoneNotCheck, 0),
    checkPercent: d.weeklyCheckPercent,
    approvePercent: d.weeklyApprovePercent,
    missedPercent: d.notCheckApprovePercent,
  }
}

function parseResponse(res: any): ChecklistStatsData[] {
  if (res?.success && Array.isArray(res.data)) return res.data
  if (Array.isArray(res)) return res
  return []
}

function PercentBar({ value, color }: { value: number | null; color: "green" | "red" }) {
  if (value === null) return <span className="block text-center text-gray-300">-</span>
  const bar = color === "green" ? "bg-emerald-500" : "bg-rose-400"
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums w-9 text-right">{value}%</span>
    </div>
  )
}

function SectionDivider({ label, tone, colSpan }: { label: string; tone: "green" | "red"; colSpan: number }) {
  // ใช้ class เต็ม เพื่อให้ Tailwind สร้าง CSS ได้ (ห้ามต่อ string)
  const fromL = tone === "green" ? "from-emerald-200" : "from-rose-200"
  const text = tone === "green" ? "text-emerald-600" : "text-rose-500"
  return (
    <tr>
      <td colSpan={colSpan} className="pt-4 pb-0">
        <div className="flex items-center gap-2 px-3 mb-1">
          <div className={`h-px flex-1 bg-gradient-to-r ${fromL} to-transparent`} />
          <span className={`text-[11px] font-bold ${text}`}>{label}</span>
          <div className={`h-px flex-1 bg-gradient-to-l ${fromL} to-transparent`} />
        </div>
      </td>
    </tr>
  )
}

// ─── ReportTable ──────────────────────────────────────────────────────────────

function ReportTable({ rows, currentMonth }: { rows: ReportRow[]; currentMonth: number | null }) {
  const { t } = useTranslation("checklist")
  const months = [...rows].sort((a, b) => a.month - b.month)
  const colSpan = months.length + 1

  const monthBg = (m: number) => (m === currentMonth ? "bg-blue-50/60" : "")

  const countRow = (
    key: CountKey,
    label: string,
    opts: { sub?: boolean; strong?: boolean; alert?: boolean } = {},
  ) => (
    <tr key={key} className="group">
      <td
        className={`sticky left-0 z-10 bg-white py-2 px-3 border-b border-gray-50 group-hover:bg-gray-50/60 ${
          opts.sub ? "pl-8 text-gray-500" : opts.strong ? "font-semibold text-gray-800" : "text-gray-600"
        }`}
      >
        {label}
      </td>
      {months.map((item) => {
        const value = item[key]
        const noData = item.noData
        return (
          <td
            key={item.month}
            className={`py-2 px-2 text-center border-b border-gray-50 group-hover:bg-gray-50/60 tabular-nums ${monthBg(item.month)} ${
              opts.strong ? "font-semibold text-gray-800" : "font-medium text-gray-700"
            } ${opts.alert && value > 0 ? "text-rose-600" : ""}`}
          >
            {noData ? (
              <span className="text-gray-300">-</span>
            ) : (
              value
            )}
          </td>
        )
      })}
    </tr>
  )

  const percentRow = (key: PercentKey, label: string, tone: "green" | "red") => {
    const rowBg = tone === "green" ? "bg-emerald-50/50" : "bg-rose-50/50"
    const labelCls = tone === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : "bg-rose-50 text-rose-600 border-rose-100"
    const border = tone === "green" ? "border-emerald-100" : "border-rose-100"
    return (
      <tr key={key} className={rowBg}>
        <td className={`sticky left-0 z-10 py-2 px-3 font-semibold border-b ${labelCls}`}>
          {label}
        </td>
        {months.map((item) => (
          <td key={item.month} className={`py-2 px-3 border-b ${border}`}>
            <PercentBar value={item.noData ? null : item[key]} color={tone} />
          </td>
        ))}
      </tr>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-xs border-separate border-spacing-0">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white w-48 text-left py-2 px-3 text-[11px] font-semibold text-gray-500 border-b border-gray-200">
              {t("metric")}
            </th>
            {months.map((m) => (
              <th
                key={m.month}
                className={`py-2 px-2 text-center font-semibold text-gray-600 border-b border-gray-200 min-w-[72px] ${monthBg(m.month)}`}
              >
                <span className="block text-[11px] text-gray-400 font-normal">{MONTH_NAMES[m.month - 1]}</span>
                <span className="text-sm">{m.month}</span>
                {m.month === currentMonth && (
                  <span className="block text-[10px] font-normal text-blue-600">{t("current_month")}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ── Daily use ── */}
          <tr className="group">
            <td className="sticky left-0 z-10 bg-white py-2.5 px-3 font-semibold text-gray-700 border-b border-gray-100">
              {t("daily_use")}
            </td>
            {months.map((item) => (
              <td key={item.month} className={`py-2.5 px-2 text-center border-b border-gray-100 ${monthBg(item.month)}`}>
                {item.noData ? (
                  <span className="text-gray-300">-</span>
                ) : (
                  <span className="inline-flex items-center justify-center min-w-8 h-8 px-1.5 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                    {item.dailyUse}
                  </span>
                )}
              </td>
            ))}
          </tr>

          {/* ── Weekly check ── */}
          <SectionDivider label={t("weekly_check")} tone="green" colSpan={colSpan} />
          {countRow("checkAll", t("target_checks"))}
          {countRow("checked", t("checked_total"), { strong: true })}
          {countRow("approved", t("approved"), { sub: true })}
          {countRow("waitSupervisor", t("wait_leader"), { sub: true })}
          {countRow("waitManager", t("wait_manager"), { sub: true })}
          {percentRow("checkPercent", t("percent_check"), "green")}
          {percentRow("approvePercent", t("percent_approve"), "green")}

          {/* ── Not checked ── */}
          <SectionDivider label={t("not_check")} tone="red" colSpan={colSpan} />
          {countRow("missed", t("missed_checks"), { strong: true, alert: true })}
          {countRow("autoNotPerformed", t("auto_not_performed"), { sub: true })}
          {countRow("offCycle", t("off_cycle"))}
          {percentRow("missedPercent", t("percent_missed"), "red")}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-500">
        {[
          { label: t("daily_use"), note: t("note_daily_use"), dot: "bg-blue-400" },
          { label: t("weekly_check"), note: t("note_weekly_check"), dot: "bg-emerald-400" },
          { label: t("percent_check"), note: t("note_percent_check"), dot: "bg-emerald-600" },
          { label: t("percent_approve"), note: t("note_percent_approve"), dot: "bg-emerald-600" },
          { label: t("missed_checks"), note: t("note_missed_checks"), dot: "bg-rose-400" },
          { label: t("off_cycle"), note: t("note_off_cycle"), dot: "bg-gray-400" },
        ].map(({ label, note, dot }) => (
          <div key={label} className="flex items-start gap-2">
            <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span>
              <span className="font-semibold text-gray-600">{label}:</span> {note}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-8 bg-gray-100 rounded-lg w-3/4" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-2">
          <div className="h-6 bg-gray-100 rounded w-36 flex-shrink-0" />
          {Array.from({ length: 6 }).map((_, j) => (
            <div key={j} className="h-6 bg-gray-50 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChecklistStats() {
  const { t } = useTranslation("checklist")
  const now = new Date()
  const currentYear = now.getFullYear()

  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<ChecklistStatsData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>(ALL_KEY)

  useEffect(() => {
    let cancelled = false
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await api.get(`/api/checklist/stats?year=${year}`)
        if (!cancelled) setData(parseResponse(res))
      } catch {
        if (!cancelled) {
          toast.error(t("error_fetching_checklist_stats"))
          setData([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchData()
    return () => {
      cancelled = true
    }
  }, [year])

  const grouped = useMemo(
    () =>
      data.reduce((acc, d) => {
        ;(acc[d.department] ??= []).push(toRow(d))
        return acc
      }, {} as Record<string, ReportRow[]>),
    [data],
  )

  const departments = Object.keys(grouped)
    .filter((d) => d !== ALL_KEY)
    .sort((a, b) => (a === UNASSIGNED_KEY ? 1 : b === UNASSIGNED_KEY ? -1 : a.localeCompare(b)))

  const tabLabel = (key: string) =>
    key === ALL_KEY ? t("all") : key === UNASSIGNED_KEY ? t("unassigned_department") : key

  const tabs = [ALL_KEY, ...departments]
  const selected = grouped[activeTab] ? activeTab : ALL_KEY
  const hasData = (grouped[ALL_KEY] ?? []).some((r) => !r.noData)
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t("checklist_stats")}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t("checklist_stats_subtitle")}</p>
        </div>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          aria-label={t("year")}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* ── Body ── */}
      <div className="p-6">
        {loading ? (
          <TableSkeleton />
        ) : !hasData ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-sm text-gray-400">{t("no_data_available")}</p>
          </div>
        ) : (
          <>
            <div className="flex gap-1.5 flex-wrap mb-6">
              {tabs.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={[
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold",
                    selected === key
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700",
                  ].join(" ")}
                >
                  {tabLabel(key)}
                </button>
              ))}
            </div>

            <ReportTable
              rows={grouped[selected] ?? []}
              currentMonth={year === currentYear ? now.getMonth() + 1 : null}
            />
          </>
        )}
      </div>
    </div>
  )
}