import { useEffect, useState } from "react"
import { api } from "@/core/interceptor/api.interceptor"
import { toast } from "sonner"
import { useTranslation } from "@/core/contexts/language-context"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChecklistStatsData {
  department: string
  month: number
  year: number
  dailyUse: number
  weeklyCheckDone: number
  weeklyCheckWaitLeader: number
  weeklyCheckWaitManager: number
  weeklyCheckPercent: number
  weeklyApprovePercent: number
  notCheckDone: number
  notCheckDoneNotCheck: number
  notCheckWaitLeader: number
  notCheckWaitManager: number
  notCheckApprovePercent: number
  notCheckApprovePercentFinal: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseResponse(res: any): ChecklistStatsData[] {
  if (res?.success && Array.isArray(res.data)) return res.data
  if (Array.isArray(res)) return res
  if (res?.data && Array.isArray(res.data)) return res.data
  return []
}

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

function getMonthName(m: number) {
  return MONTH_NAMES[(m - 1) % 12]
}

function PercentBar({ value, color }: { value: number; color: "green" | "red" | "blue" }) {
  const colors = {
    green: "bg-emerald-500",
    red:   "bg-rose-400",
    blue:  "bg-blue-500",
  }
  return (
    <div className="flex items-center gap-1.5 w-full">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colors[color]}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold tabular-nums w-8 text-right">{value}%</span>
    </div>
  )
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex items-center justify-center font-semibold text-white text-[11px] tracking-wide uppercase"
      style={{ background: color, writingMode: "vertical-rl", transform: "rotate(180deg)", padding: "8px 6px", borderRadius: "6px 0 0 6px", minHeight: 80 }}
    >
      {label}
    </div>
  )
}

// ─── DepartmentTable ──────────────────────────────────────────────────────────

function DepartmentTable({ deptData }: { deptData: ChecklistStatsData[] }) {
  const { t } = useTranslation("checklist")
  const months = [...deptData].sort((a, b) => a.month - b.month)

  type NumKey = keyof Pick<ChecklistStatsData,
    "dailyUse"|"weeklyCheckDone"|"weeklyCheckWaitLeader"|"weeklyCheckWaitManager"|
    "weeklyCheckPercent"|"weeklyApprovePercent"|"notCheckDone"|"notCheckDoneNotCheck"|
    "notCheckWaitLeader"|"notCheckWaitManager"|"notCheckApprovePercent"|"notCheckApprovePercentFinal">

  const cell = (item: ChecklistStatsData, key: NumKey) => item[key] as number

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-separate border-spacing-0">
        {/* ── Header ── */}
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white w-5" />
            <th className="sticky left-5 z-10 bg-white w-36 text-left py-2 px-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-200">
              {t("metric")}
            </th>
            {months.map(m => (
              <th
                key={m.month}
                className="py-2 px-2 text-center font-semibold text-gray-600 border-b border-gray-200 min-w-[72px]"
              >
                <span className="block text-[11px] text-gray-400 font-normal">{getMonthName(m.month)}</span>
                <span className="text-sm">{m.month}</span>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {/* ── Daily Use ── */}
          <tr className="group">
            <td className="sticky left-0 z-10 bg-white" />
            <td className="sticky left-5 z-10 bg-white py-2.5 px-3 font-semibold text-gray-700 border-b border-gray-100 group-hover:bg-gray-50/80 transition-colors">
              {t("daily_use")}
            </td>
            {months.map(item => (
              <td key={item.month} className="py-2.5 px-2 text-center border-b border-gray-100 group-hover:bg-gray-50/80 transition-colors">
                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
                  {cell(item, "dailyUse")}
                </span>
              </td>
            ))}
          </tr>

          {/* ── Weekly Check section ── */}
          {/* divider */}
          <tr>
            <td colSpan={2 + months.length} className="pt-3 pb-0">
              <div className="flex items-center gap-2 px-3 mb-1">
                <div className="h-px flex-1 bg-gradient-to-r from-emerald-200 to-transparent" />
                <span className="text-[10px] font-bold tracking-widest text-emerald-600 uppercase">{t("weekly_check")}</span>
                <div className="h-px flex-1 bg-gradient-to-l from-emerald-200 to-transparent" />
              </div>
            </td>
          </tr>

          {(
            [
              { key: "weeklyCheckDone",        label: t("done"),         highlight: false },
              { key: "weeklyCheckWaitLeader",  label: t("wait_leader"),  highlight: false },
              { key: "weeklyCheckWaitManager", label: t("wait_manager"), highlight: false },
            ] as { key: NumKey; label: string; highlight: boolean }[]
          ).map(({ key, label }) => (
            <tr key={key} className="group">
              <td className="sticky left-0 z-10 bg-white" />
              <td className="sticky left-5 z-10 bg-white py-2 px-3 text-gray-600 border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors pl-5">
                {label}
              </td>
              {months.map(item => (
                <td key={item.month} className="py-2 px-2 text-center border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors text-gray-700 font-medium">
                  {cell(item, key)}
                </td>
              ))}
            </tr>
          ))}

          {/* percent rows */}
          {(
            [
              { key: "weeklyCheckPercent",   label: t("percent_check") },
              { key: "weeklyApprovePercent", label: t("percent_approve") },
            ] as { key: NumKey; label: string }[]
          ).map(({ key, label }) => (
            <tr key={key} className="group bg-emerald-50/50">
              <td className="sticky left-0 z-10 bg-emerald-50/50" />
              <td className="sticky left-5 z-10 bg-emerald-50/60 py-2 px-3 text-emerald-700 font-semibold border-b border-emerald-100 pl-5">
                {label}
              </td>
              {months.map(item => (
                <td key={item.month} className="py-2 px-3 border-b border-emerald-100">
                  <PercentBar value={cell(item, key)} color="green" />
                </td>
              ))}
            </tr>
          ))}

          {/* ── Not Check section ── */}
          <tr>
            <td colSpan={2 + months.length} className="pt-4 pb-0">
              <div className="flex items-center gap-2 px-3 mb-1">
                <div className="h-px flex-1 bg-gradient-to-r from-rose-200 to-transparent" />
                <span className="text-[10px] font-bold tracking-widest text-rose-500 uppercase">{t("not_check")}</span>
                <div className="h-px flex-1 bg-gradient-to-l from-rose-200 to-transparent" />
              </div>
            </td>
          </tr>

          {(
            [
              { key: "notCheckDone",        label: t("done") },
              { key: "notCheckDoneNotCheck",label: t("done_not_check") },
              { key: "notCheckWaitLeader",  label: t("wait_leader") },
              { key: "notCheckWaitManager", label: t("wait_manager") },
            ] as { key: NumKey; label: string }[]
          ).map(({ key, label }) => (
            <tr key={key} className="group">
              <td className="sticky left-0 z-10 bg-white" />
              <td className="sticky left-5 z-10 bg-white py-2 px-3 text-gray-600 border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors pl-5">
                {label}
              </td>
              {months.map(item => (
                <td key={item.month} className="py-2 px-2 text-center border-b border-gray-50 group-hover:bg-gray-50/60 transition-colors text-gray-700 font-medium">
                  {cell(item, key)}
                </td>
              ))}
            </tr>
          ))}

          {(
            [
              { key: "notCheckApprovePercent",      label: t("percent_approve") },
              { key: "notCheckApprovePercentFinal",  label: t("percent_approve_final") },
            ] as { key: NumKey; label: string }[]
          ).map(({ key, label }) => (
            <tr key={key} className="group bg-rose-50/50">
              <td className="sticky left-0 z-10 bg-rose-50/50" />
              <td className="sticky left-5 z-10 bg-rose-50/60 py-2 px-3 text-rose-600 font-semibold border-b border-rose-100 pl-5">
                {label}
              </td>
              {months.map(item => (
                <td key={item.month} className="py-2 px-3 border-b border-rose-100">
                  <PercentBar value={cell(item, key)} color="red" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-500">
        {[
          { label: t("daily_use"),       note: t("note_daily_use"),       dot: "bg-blue-400" },
          { label: t("weekly_check"),    note: t("note_weekly_check"),    dot: "bg-emerald-400" },
          { label: t("not_check"),       note: t("note_not_check"),       dot: "bg-rose-400" },
          { label: t("percent_check"),   note: t("note_percent_check"),   dot: "bg-emerald-600" },
          { label: t("percent_approve"), note: t("note_percent_approve"), dot: "bg-rose-600" },
        ].map(({ label, note, dot }) => (
          <div key={label} className="flex items-start gap-2">
            <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span><span className="font-semibold text-gray-600">{label}:</span> {note}</span>
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
  const [checklistData, setChecklistData] = useState<ChecklistStatsData[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<string>("all")

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await api.get("/api/checklist/stats")
        setChecklistData(parseResponse(res))
      } catch {
        toast.error(t("error_fetching_checklist_stats"))
        setChecklistData([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const groupedByDept = checklistData.reduce((acc, item) => {
    if (!acc[item.department]) acc[item.department] = []
    acc[item.department].push(item)
    return acc
  }, {} as Record<string, ChecklistStatsData[]>)

  const departments = Object.keys(groupedByDept).sort()

  const averageData = (): ChecklistStatsData[] => {
    const months = [...new Set(checklistData.map(d => d.month))].sort((a, b) => a - b)
    return months.map(month => {
      const md = checklistData.filter(d => d.month === month)
      const n  = md.length || 1
      const avg = (key: keyof ChecklistStatsData) =>
        Math.round(md.reduce((s, d) => s + (d[key] as number), 0) / n)
      return {
        department: "All", month, year: md[0]?.year ?? new Date().getFullYear(),
        dailyUse: avg("dailyUse"),
        weeklyCheckDone: avg("weeklyCheckDone"),
        weeklyCheckWaitLeader: avg("weeklyCheckWaitLeader"),
        weeklyCheckWaitManager: avg("weeklyCheckWaitManager"),
        weeklyCheckPercent: avg("weeklyCheckPercent"),
        weeklyApprovePercent: avg("weeklyApprovePercent"),
        notCheckDone: avg("notCheckDone"),
        notCheckDoneNotCheck: avg("notCheckDoneNotCheck"),
        notCheckWaitLeader: avg("notCheckWaitLeader"),
        notCheckWaitManager: avg("notCheckWaitManager"),
        notCheckApprovePercent: avg("notCheckApprovePercent"),
        notCheckApprovePercentFinal: avg("notCheckApprovePercentFinal"),
      }
    })
  }

  const tabs = [{ key: "all", label: t("all") }, ...departments.map(d => ({ key: d, label: d }))]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t("checklist_stats")}</h2>
          {!loading && checklistData.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {departments.length} {t("departments")} · {[...new Set(checklistData.map(d => d.month))].length} {t("months")}
            </p>
          )}
        </div>
        {/* colored pill legend */}
        <div className="hidden sm:flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-gray-500">{t("weekly_check")}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span className="text-gray-500">{t("not_check")}</span>
          </span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="p-6">
        {loading ? (
          <TableSkeleton />
        ) : checklistData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300 text-2xl">
              📋
            </div>
            <p className="text-sm text-gray-400">{t("no_data_available")}</p>
          </div>
        ) : (
          <>
            {/* ── Tab bar ── */}
            <div className="flex gap-1.5 flex-wrap mb-6">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
                    activeTab === tab.key
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Active tab banner (for "all") ── */}
            {activeTab === "all" && departments.length > 1 && (
              <div className="mb-4 flex items-center gap-2 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded-md font-medium">
                  📊 {t("average_all_departments")}
                </span>
                <span className="text-gray-300">·</span>
                <span>{departments.join(" · ")}</span>
              </div>
            )}

            {/* ── Table ── */}
            <DepartmentTable
              deptData={activeTab === "all" ? averageData() : groupedByDept[activeTab] ?? []}
            />
          </>
        )}
      </div>
    </div>
  )
}