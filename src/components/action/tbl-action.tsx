import React from 'react'
import { MoreVertical } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useTranslation } from '@/core/contexts/language-context';

interface TblActionProps {
  view?: boolean
  edit?: boolean
  copy?: boolean
  delete?: boolean
  onView?: () => void
  onEdit?: () => void
  onCopy?: () => void
  onDelete?: () => void
}

export const TblAction: React.FC<TblActionProps> = ({
  view = false,
  edit = false,
  copy = false,
  delete: canDelete = false,
  onView,
  onEdit,
  onCopy,
  onDelete,
}) => {
  const { t } = useTranslation();
  const hasActions = view || edit || copy || canDelete

  if (!hasActions) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground data-[state=open]:bg-muted"
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">{t("Open Menu")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {view && <DropdownMenuItem onClick={onView}>{t("View")}</DropdownMenuItem>}
        {edit && <DropdownMenuItem onClick={onEdit}>{t("Edit")}</DropdownMenuItem>}
        {copy && <DropdownMenuItem onClick={onCopy}>{t("Copy")}</DropdownMenuItem>}
        {(view || edit || copy) && canDelete && <DropdownMenuSeparator />}
        {canDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-700">
            {t("Delete")}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
