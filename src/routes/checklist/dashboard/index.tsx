import { KpiTbl } from '@/module/checklist/kpi/kpi-table'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MachineTbl } from '@/module/checklist/machine/machine-table'
import { Card } from '@/components/ui/card'
import { Settings, Clock, PencilRuler, Wrench, Plus, ClipboardList, ClipboardCheckIcon, Drill, QrCode } from 'lucide-react'
import { MaintenanceStats } from '@/module/checklist/dashboard/maintenance-stats'
import { ScheduleList } from '@/module/checklist/dashboard/schedule-list'
import { CalibrationStats } from '@/module/checklist/dashboard/calibration-stats'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { ChecklistStats } from '@/module/checklist/dashboard/checklist-stats'
import { useTranslation } from '@/core/contexts/language-context'

export const Route = createFileRoute('/checklist/dashboard/')({
  component: RouteComponent,
})

interface SummaryData {
  total: number
  totalAvailable: number
  totalMaintenance: number
  totalCalibration: number
}

function RouteComponent() {
  const { t } = useTranslation('checklist')
  const navigate = useNavigate()
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryData>({
    total: 0,
    totalAvailable: 0,
    totalMaintenance: 0,
    totalCalibration: 0,
  })

  useEffect(() => { fetchSummary() }, [])

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true)
      const response = await api.get<SummaryData>('/api/dashboard/get/summary')
      setSummary(response)
    } catch (err) {
      toast.error(t('data_fetch_failed'))
    } finally {
      setSummaryLoading(false)
    }
  }

  if (summaryLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">

      {/* ── Row 1: Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('total_machines')}</p>
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-gray-500">{t('list')}</p>
            </div>
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('available_machines')}</p>
              <p className="text-2xl font-bold">{summary.totalAvailable}</p>
              <p className="text-xs text-gray-500">{t('list')}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('upcoming_maintenance')}</p>
              <p className="text-2xl font-bold">{summary.totalMaintenance}</p>
              <p className="text-xs text-gray-500">{t('within_30_days')}</p>
            </div>
            <Wrench className="w-8 h-8 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('upcoming_calibration')}</p>
              <p className="text-2xl font-bold">{summary.totalCalibration}</p>
              <p className="text-xs text-gray-500">{t('within_30_days')}</p>
            </div>
            <PencilRuler className="w-8 h-8 text-red-400" />
          </div>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <ScheduleList />
          <Card>
            <div className="p-4 space-y-2">
              <button
                onClick={() => navigate({ to: '/checklist/machine' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-800 text-white text-sm font-medium"
              >
                <QrCode className="w-4 h-4" />
                {t('pending')}
              </button>
              <button
                onClick={() => navigate({ to: '/checklist/checklist-records' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-700 hover:bg-neutral-800 text-white text-sm font-medium transition"
              >
                <ClipboardCheckIcon className="w-4 h-4" />
                {t('pending_approval')}
              </button>
            </div>
          </Card>
        </div>
        <div className="lg:col-span-2">
          <KpiTbl />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6">
        <MachineTbl />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CalibrationStats />
        <MaintenanceStats />
      </div>
      <div className="grid grid-cols-1 gap-6">
        <ChecklistStats />
      </div>
    </div>
  )
}