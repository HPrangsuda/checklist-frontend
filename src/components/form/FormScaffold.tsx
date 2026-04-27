import type { FormEvent, ReactNode } from "react"
import { FormActions } from "./FormActions"

interface FormScaffoldProps {
  title?: string
  description?: string
  isSubmitting: boolean
  isEdit?: boolean
  onSubmit: (e: FormEvent) => void
  onCancel?: () => void
  cancelTo?: string
  children: ReactNode
}

export function FormScaffold({
  title,
  description,
  isSubmitting,
  isEdit = false,
  onSubmit,
  onCancel,
  cancelTo = "/",
  children,
}: FormScaffoldProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {title && (
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}

      <div className="space-y-4">{children}</div>

      <FormActions
        isSubmitting={isSubmitting}
        isEdit={isEdit}
        cancelTo={cancelTo}
        onCancel={onCancel}
        createLabel="Create"
        updateLabel="Update"
        creatingLabel="Creating..."
        updatingLabel="Updating..."
      />
    </form>
  )
}
