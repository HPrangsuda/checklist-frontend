import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/core/interceptor/api.interceptor"
import { toast } from "sonner"
import { useTranslation } from "@/core/contexts/language-context"

interface MaintenanceStatsDTO {
  month: string
  year: number
  on_time: number
  overdue: number
}

const MONTH_MAP: Record<string, string> = {
  Jan: 'jan', Feb: 'feb', Mar: 'mar', Apr: 'apr',
  May: 'may_short', Jun: 'jun', Jul: 'jul', Aug: 'aug',
  Sep: 'sep', Oct: 'oct', Nov: 'nov', Dec: 'dec',
}

function parseResponse(res: any): MaintenanceStatsDTO[] {
  if (res?.success && Array.isArray(res.data)) return res.data
  if (Array.isArray(res)) return res
  if (res?.data && Array.isArray(res.data)) return res.data
  return []
}

export function MaintenanceStats() {
  const { t } = useTranslation('checklist')
  const [data, setData] = useState<MaintenanceStatsDTO[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/dashboard/get/maintenance-stats')
        setData(parseResponse(res).map(item => ({
          ...item,
          month: t(MONTH_MAP[item.month] ?? item.month),
        })))
      } catch {
        toast.error(t('error_fetching_maintenance_stats'))
        setData([])
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  return (
    <Card className="shadow-sm border-dashboard-border">
      <CardHeader className="bg-dashboard-bg/50">
        <CardTitle className="font-semibold">
          {t('maintenance_stats')} — {data[0]?.year || new Date().getFullYear()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-[200px] flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center">
            <p className="text-muted-foreground text-sm">{t('no_data_available')}</p>
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(217, 33%, 25%)" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(215, 20%, 65%)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(215, 20%, 65%)" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(217, 33%, 17%)",
                    border: "1px solid hsl(217, 33%, 25%)",
                    borderRadius: "8px",
                    color: "hsl(210, 40%, 98%)",
                  }}
                />
                <Bar dataKey="on_time" fill="hsl(173, 80%, 40%)" radius={[4, 4, 0, 0]} name={t('on_time')} />
                <Bar dataKey="overdue" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name={t('overdue')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}