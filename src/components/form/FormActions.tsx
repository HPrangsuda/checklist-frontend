import { Button } from "@/components/ui/button"
import { useTranslation } from "@/core/contexts/language-context";
import { useRouter } from "@tanstack/react-router"

interface FormActionsProps {
  isSubmitting: boolean
  isEdit?: boolean
  cancelTo?: string
  onCancel?: () => void
  createLabel?: string
  updateLabel?: string
  creatingLabel?: string
  updatingLabel?: string
}

export function FormActions({
  isSubmitting,
  isEdit = false,
  cancelTo = "/",
  onCancel,
  createLabel = "Create",
  updateLabel = "Update",
  creatingLabel = "Creating...",
  updatingLabel = "Updating...",
}: FormActionsProps) {
  const { t } = useTranslation();
  const router = useRouter()

  return (
    <div className="flex justify-end gap-4 mt-10">
      <Button
        type="button"
        variant="outline"
        onClick={() => (onCancel ? onCancel() : router.navigate({ to: cancelTo }))}
        className="px-6"
      >
      {t("Cancel")}
      </Button>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="px-8 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
      >
        {isSubmitting ? (
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span>{isEdit ? updatingLabel : creatingLabel}</span>
          </div>
        ) : isEdit ? (
          updateLabel
        ) : (
          createLabel
        )}
      </Button>
    </div>
  )
}