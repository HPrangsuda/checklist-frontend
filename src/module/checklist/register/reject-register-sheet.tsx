import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { Ban, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/core/interceptor/api.interceptor'
import { useTranslation } from '@/core/contexts/language-context'

const MAX_REASON = 1000

export function RejectRegisterSheet({
  registerId,
  machineName,
  open,
  onOpenChange,
  onRejected,
}: {
  registerId: number
  machineName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onRejected: () => void
}) {
  const { t } = useTranslation('checklist')
  const [reason, setReason]         = useState('')
  const [touched, setTouched]       = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) { setReason(''); setTouched(false) }
  }, [open])

  const invalid = reason.trim().length === 0

  const handleSave = async () => {
    setTouched(true)
    if (invalid) return
    setSubmitting(true)
    try {
      const res = await api.put<any>(`/api/register/${registerId}/reject`, { reason: reason.trim() })
      if (res && res.success === false) throw new Error(res.message)
      toast.success(t('reject_success'))
      onOpenChange(false)
      onRejected()
    } catch (err: any) {
      toast.error(err?.message || t('reject_failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={v => !submitting && onOpenChange(v)}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            {t('reject_register')}
          </SheetTitle>
          <SheetDescription>{machineName}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-2 py-6 px-4">
          <label htmlFor="reject-reason" className="text-sm font-medium">
            {t('reject_reason')} <span className="text-destructive">*</span>
          </label>
          <Textarea
            id="reject-reason"
            value={reason}
            rows={8}
            maxLength={MAX_REASON}
            autoFocus
            placeholder={t('reject_reason_placeholder')}
            onChange={e => setReason(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={touched && invalid}
            className={touched && invalid ? 'border-destructive focus-visible:ring-destructive' : ''}
          />
          <div className="flex justify-between text-xs">
            <span className="text-destructive">{touched && invalid ? t('reject_reason_required') : ''}</span>
            <span className="text-muted-foreground">{reason.length}/{MAX_REASON}</span>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('cancel')}
          </Button>
          <Button variant="destructive" onClick={handleSave} disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            {t('save_reject')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}