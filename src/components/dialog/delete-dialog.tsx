import { DialogFooter } from "@/components/ui/dialog"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/core/contexts/language-context"

interface DeleteDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  name?: string
  confirmText: string
  onConfirm?: () => Promise<{ success: boolean }>
  onSuccess?: () => void
  variant?: "default" | "destructive"
  showFooter?: boolean
  isAlert?: boolean
  alertMessage?: string
  alertType?: "info" | "success" | "warning" | "error"
}

export function DeleteDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmText,
  onConfirm,
  onSuccess,
  variant = "default",
  showFooter = true,
  isAlert = false,
  alertMessage,
  alertType = "info",
}: DeleteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState("")

  const { t } = useTranslation();

  const capitalizedConfirmText = confirmText.toUpperCase()
  const isConfirmEnabled = inputValue.toUpperCase() === capitalizedConfirmText

  const defaultDescription = t("Do you rally want to delete these records?") + t("This process cannot be undone.")

  const displayDescription = description || defaultDescription

  const handleConfirm = async () => {
    if (!onConfirm || !isConfirmEnabled) return

    try {
      setLoading(true)
      const response = await onConfirm()
      if (response.success) {
        setTimeout(() => {
          onSuccess?.()
          handleClose()
        }, 1500)
      }
    } catch (error) {
        setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  const handleClose = () => {
    setLoading(false)
    setInputValue("")
    onClose()
  }

  const getAlertIcon = () => {
    switch (alertType) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      default:
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getAlertVariant = () => {
    return alertType === "error" ? "destructive" : "default"
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-medium text-destructive">{title}</DialogTitle>
          <DialogDescription className="text-left">{displayDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isAlert && alertMessage && (
            <Alert variant={getAlertVariant()}>
              <div className="flex items-center gap-2">
                {getAlertIcon()}
                <AlertDescription>{alertMessage}</AlertDescription>
              </div>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="confirmation" className="text-sm font-medium">
            {`${t("Type")} ${capitalizedConfirmText} ${t("to confirm")}`}
            </Label>
            <Input
              id="confirmation"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={capitalizedConfirmText}
              disabled={loading}
              className="font-mono"
            />
          </div>

        </div>

        {showFooter && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={loading}>
                {t("Cancel")}
            </Button>
            {onConfirm && (
              <Button
                onClick={handleConfirm}
                disabled={loading || !isConfirmEnabled}
                variant={variant === "destructive" ? "destructive" : "default"}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("Processing")}
                  </>
                ) : (
                    t("Confirm")
                )}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}