import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

const ArrowUp = () => (
  <svg className="w-4 h-4 ml-1 text-green-600 inline" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
)

// ─── DepartmentTable ──────────────────────────────────────────────────────────

function DepartmentTable({ deptData }: { deptData: ChecklistStatsData[] }) {
  const { t } = useTranslation('checklist')

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-gray-300">
              <th className="border border-gray-300 p-2 bg-gray-50" rowSpan={2} />
              <th className="border border-gray-300 p-2 bg-gray-50" rowSpan={2} />
              {deptData.map(item => (
                <th key={item.month} className="border border-gray-300 p-2 bg-blue-50 font-semibold">
                  {item.month}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Daily use */}
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-50">{t('daily_use')}</td>
              <td className="border border-gray-300 p-2" />
              {deptData.map(item => (
                <td key={`daily-${item.month}`} className="border border-gray-300 p-2 text-center font-semibold">
                  {item.dailyUse}
                </td>
              ))}
            </tr>

            {/* Weekly check */}
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-50" rowSpan={5}>{t('weekly_check')}</td>
              <td className="border border-gray-300 p-2 bg-gray-50">{t('done')}</td>
              {deptData.map(item => (
                <td key={`wc-done-${item.month}`} className="border border-gray-300 p-2 text-center">{item.weeklyCheckDone}</td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-50">{t('wait_leader')}</td>
              {deptData.map(item => (
                <td key={`wc-leader-${item.month}`} className="border border-gray-300 p-2 text-center">{item.weeklyCheckWaitLeader}</td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-50">{t('wait_manager')}</td>
              {deptData.map(item => (
                <td key={`wc-manager-${item.month}`} className="border border-gray-300 p-2 text-center">{item.weeklyCheckWaitManager}</td>
              ))}
            </tr>
            <tr className="bg-green-50">
              <td className="border border-gray-300 p-2 bg-green-100">{t('percent_check')}</td>
              {deptData.map(item => (
                <td key={`wc-pct-${item.month}`} className="border border-gray-300 p-2 text-center font-semibold">
                  {item.weeklyCheckPercent}%<ArrowUp />
                </td>
              ))}
            </tr>
            <tr className="bg-green-50">
              <td className="border border-gray-300 p-2 bg-green-100">{t('percent_approve')}</td>
              {deptData.map(item => (
                <td key={`wc-approve-${item.month}`} className="border border-gray-300 p-2 text-center font-semibold">
                  {item.weeklyApprovePercent}%<ArrowUp />
                </td>
              ))}
            </tr>

            {/* Not check */}
            <tr>
              <td className="border border-gray-300 p-2 font-semibold bg-gray-50" rowSpan={6}>{t('not_check')}</td>
              <td className="border border-gray-300 p-2 bg-gray-50">{t('done')}</td>
              {deptData.map(item => (
                <td key={`nc-done-${item.month}`} className="border border-gray-300 p-2 text-center">{item.notCheckDone}</td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-50">{t('done_not_check')}</td>
              {deptData.map(item => (
                <td key={`nc-dnc-${item.month}`} className="border border-gray-300 p-2 text-center">{item.notCheckDoneNotCheck}</td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-50">{t('wait_leader')}</td>
              {deptData.map(item => (
                <td key={`nc-leader-${item.month}`} className="border border-gray-300 p-2 text-center">{item.notCheckWaitLeader}</td>
              ))}
            </tr>
            <tr>
              <td className="border border-gray-300 p-2 bg-gray-50">{t('wait_manager')}</td>
              {deptData.map(item => (
                <td key={`nc-manager-${item.month}`} className="border border-gray-300 p-2 text-center">{item.notCheckWaitManager}</td>
              ))}
            </tr>
            <tr className="bg-red-50">
              <td className="border border-gray-300 p-2 bg-red-100">{t('percent_approve')}</td>
              {deptData.map(item => (
                <td key={`nc-approve-${item.month}`} className="border border-gray-300 p-2 text-center font-semibold">
                  {item.notCheckApprovePercent}%
                </td>
              ))}
            </tr>
            <tr className="bg-red-50">
              <td className="border border-gray-300 p-2 bg-red-100">{t('percent_approve_final')}</td>
              {deptData.map(item => (
                <td key={`nc-approve-final-${item.month}`} className="border border-gray-300 p-2 text-center font-semibold">
                  {item.notCheckApprovePercentFinal}%
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
        <p className="font-semibold mb-1">{t('note')}:</p>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="font-semibold">{t('daily_use')}:</span> {t('note_daily_use')}</li>
          <li><span className="font-semibold">{t('weekly_check')}:</span> {t('note_weekly_check')}</li>
          <li><span className="font-semibold">{t('not_check')}:</span> {t('note_not_check')}</li>
          <li><span className="font-semibold text-green-700">{t('percent_check')}:</span> {t('note_percent_check')}</li>
          <li><span className="font-semibold text-red-700">{t('percent_approve')}:</span> {t('note_percent_approve')}</li>
        </ul>
      </div>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChecklistStats() {
  const { t } = useTranslation('checklist')
  const [checklistData, setChecklistData] = useState<ChecklistStatsData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/checklist/stats')
        setChecklistData(parseResponse(res))
      } catch {
        toast.error(t('error_fetching_checklist_stats'))
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

  const departments = Object.keys(groupedByDept)

  const averageData = (): ChecklistStatsData[] => {
    const months = [...new Set(checklistData.map(d => d.month))].sort((a, b) => a - b)
    return months.map(month => {
      const md = checklistData.filter(d => d.month === month)
      const n  = md.length || 1
      const avg = (key: keyof ChecklistStatsData) =>
        Math.round(md.reduce((s, d) => s + (d[key] as number), 0) / n)
      return {
        department: 'All', month, year: md[0]?.year ?? new Date().getFullYear(),
        dailyUse: avg('dailyUse'),
        weeklyCheckDone: avg('weeklyCheckDone'),
        weeklyCheckWaitLeader: avg('weeklyCheckWaitLeader'),
        weeklyCheckWaitManager: avg('weeklyCheckWaitManager'),
        weeklyCheckPercent: avg('weeklyCheckPercent'),
        weeklyApprovePercent: avg('weeklyApprovePercent'),
        notCheckDone: avg('notCheckDone'),
        notCheckDoneNotCheck: avg('notCheckDoneNotCheck'),
        notCheckWaitLeader: avg('notCheckWaitLeader'),
        notCheckWaitManager: avg('notCheckWaitManager'),
        notCheckApprovePercent: avg('notCheckApprovePercent'),
        notCheckApprovePercentFinal: avg('notCheckApprovePercentFinal'),
      }
    })
  }

  return (
    <Card className="shadow-sm border-dashboard-border">
      <CardHeader className="bg-dashboard-bg/50">
        <CardTitle className="font-semibold">{t('checklist_stats')}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : checklistData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground text-sm">{t('no_data_available')}</p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList
              className="grid w-full mb-6"
              style={{ gridTemplateColumns: `repeat(${departments.length + 1}, minmax(0, 1fr))` }}
            >
              <TabsTrigger value="all" className="font-semibold">{t('all')}</TabsTrigger>
              {departments.map(dept => (
                <TabsTrigger key={dept} value={dept} className="font-semibold">{dept}</TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-semibold text-blue-800">
                  📊 {t('average_all_departments')} ({departments.join(', ')})
                </p>
              </div>
              <DepartmentTable deptData={averageData()} />
            </TabsContent>

            {departments.map(dept => (
              <TabsContent key={dept} value={dept}>
                <DepartmentTable deptData={groupedByDept[dept]} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}