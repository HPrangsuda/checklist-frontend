import { KpiTbl } from '@/module/checklist/kpi/kpi-table'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { MachineTbl } from '@/module/checklist/machine/machine-table'
import { Card } from '@/components/ui/card'
import { Settings, Clock, PencilRuler, Wrench, ClipboardCheckIcon, QrCode, X, Megaphone } from 'lucide-react'
import { MaintenanceStats } from '@/module/checklist/dashboard/maintenance-stats'
import { ScheduleList } from '@/module/checklist/dashboard/schedule-list'
import { CalibrationStats } from '@/module/checklist/dashboard/calibration-stats'
import { useEffect, useState } from 'react'
import { api } from '@/core/interceptor/api.interceptor'
import { toast } from 'sonner'
import { ChecklistStats } from '@/module/checklist/dashboard/checklist-stats'
import { useTranslation } from '@/core/contexts/language-context'
import { useQrScan } from '@/core/contexts/qr-scan-context'
import announcementPdf from '@/assets/file/meeting_11-06-2026.pdf'

export const Route = createFileRoute('/checklist/dashboard/')({
  component: RouteComponent,
})

interface SummaryData {
  total: number
  totalAvailable: number
  totalMaintenance: number
  totalCalibration: number
}

interface AnnouncementPopupProps {
  open: boolean
  onClose: () => void
}

function AnnouncementPopup({ open, onClose }: AnnouncementPopupProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-xl shadow-xl border border-border w-[95%] lg:w-[60%] max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-neutral-700 shrink-0">
          <div className="flex items-center gap-2 text-white">
            <Megaphone className="w-5 h-5" />
            <span className="font-medium text-sm">ประกาศ — สรุปการประชุม การจัดการเครื่องจักรและอุปกรณ์</span>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Meta */}
        <div className="px-5 py-3 bg-neutral-50 border-b border-border shrink-0 flex flex-wrap gap-4 text-xs text-neutral-800">
          <span>📅 วันที่ 11 มิถุนายน 2569</span>
          <span>📍 ห้องประชุมห้อง 1</span>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 overflow-hidden">
          <iframe
            src={`${announcementPdf}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
            className="w-full h-full"
            style={{ minHeight: '70vh', border: 'none', overflowX: 'hidden' }}
            title="สรุปการประชุม"
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-700 hover:bg-neutral-800 text-white text-sm font-medium rounded-lg transition"
          >
            รับทราบ
          </button>
        </div>

      </div>
    </div>
  )
}

function RouteComponent() {
  const { t } = useTranslation('checklist')
  const navigate = useNavigate()
  const { setHideQrButton } = useQrScan()
  const [announcementOpen, setAnnouncementOpen] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [summary, setSummary] = useState<SummaryData>({
    total: 0,
    totalAvailable: 0,
    totalMaintenance: 0,
    totalCalibration: 0,
  })

  useEffect(() => {
    setHideQrButton(announcementOpen)
    return () => setHideQrButton(false)
  }, [announcementOpen])

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
      <AnnouncementPopup
        open={announcementOpen}
        onClose={() => setAnnouncementOpen(false)}
      />

      {/* ── Row 1: Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('total_machines')}</p>
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-neutral-500">{t('list')}</p>
            </div>
            <Settings className="w-8 h-8 text-neutral-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('available_machines')}</p>
              <p className="text-2xl font-bold">{summary.totalAvailable}</p>
              <p className="text-xs text-neutral-500">{t('list')}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('upcoming_maintenance')}</p>
              <p className="text-2xl font-bold">{summary.totalMaintenance}</p>
              <p className="text-xs text-neutral-500">{t('within_30_days')}</p>
            </div>
            <Wrench className="w-8 h-8 text-emerald-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('upcoming_calibration')}</p>
              <p className="text-2xl font-bold">{summary.totalCalibration}</p>
              <p className="text-xs text-neutral-500">{t('within_30_days')}</p>
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