import { Button } from "@/components/ui/button"
import { ArrowLeft, FileDiff, Pencil, Trash2 } from "lucide-react"
import { useRouter } from "@tanstack/react-router"

export interface ViewLayoutProps {
  backLink: string
  title: string
  createdOn: string
  createdBy: string

  // Button visibility props
  isConvert?: boolean
  isEdit?: boolean
  isDelete?: boolean

  // Button actions
  onConvert?: () => void
  onEdit?: () => void
  onDelete?: () => void
}

export function CrmViewHeader({
  backLink,
  title,
  createdOn,
  createdBy,
  isConvert = false,
  isEdit = false,
  isDelete = false,
  onConvert,
  onEdit,
  onDelete,
}: ViewLayoutProps) {
  const router = useRouter()

  const handleBackClick = () => {
    router.navigate({ to: backLink })
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-20 px-4 py-3 flex items-center justify-between">
      {/* Left Section - Back & Title */}
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="outline"
          size="sm"
          className="text-xs sm:text-sm font-normal bg-transparent shrink-0"
          onClick={handleBackClick}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          <span className="hidden xs:inline">Back</span>
        </Button>

        <div className="min-w-0">
          <span className="text-md font-normal truncate">{title}</span>
          <p className="text-sm text-gray-500 truncate">
            Updated on {createdOn} by <span>{createdBy}</span>
          </p>
        </div>
      </div>

      {/* Right Section - Action Buttons */}
      <div className="flex items-center gap-2">
        {isConvert && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm font-normal"
            onClick={onConvert}
          >
            <FileDiff className="h-4 w-4 mr-1" />
            Convert
          </Button>
        )}
        {isEdit && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs sm:text-sm font-normal"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        {isDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="text-xs sm:text-sm font-normal"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        )}
      </div>
    </div>
  )
}