import { Zap, Send, Download, Lock, Trash2, MoreHorizontal, Eye } from "lucide-react"
import { useTranslation } from "@/core/contexts/language-context"
import { useRouter } from "@tanstack/react-router"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import GenerateSheet from "./generate"
import SendSheet from "./send"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "@/core/interceptor/api.interceptor"
import type { ResponseDTO } from "@/core/types/common"

interface ButtonConfig {
  icon: React.FC<any>
  action: string
  label: string
  handler: () => void
  disabled?: boolean
  color?: "red" | "orange" | "green" | "gray"
}

interface InetTblActionProps {
  id: string
  type: string
  typeCode: string
  isCredit?: boolean
  isLeft?: boolean
  disableGenerate?: boolean
  disableSend?: boolean
  disableDownload?: boolean
  disableEmail?: boolean
  disableDelete?: boolean
  disableView?: boolean
  onDataChangeSuccess?: () => void
}

const MinimalCleanButtonGroup: React.FC<{
  buttons: ButtonConfig[]
  size?: "sm" | "md" | "lg"
  variant?: "default" | "rounded" | "square" | "soft"
  className?: string
}> = ({ buttons, size = "md", variant = "default", className = "" }) => {
  const [activeButton, setActiveButton] = useState<string | null>(null)

  const handleClick = (action: string, handler: () => void) => {
    setActiveButton(action)
    setTimeout(() => setActiveButton(null), 150)
    handler()
  }

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "h-8 w-8"
      case "lg":
        return "h-14 w-14"
      default:
        return "h-10 w-10"
    }
  }

  const getIconSize = () => {
    switch (size) {
      case "sm":
        return "h-3.5 w-3.5"
      case "lg":
        return "h-5 w-5"
      default:
        return "h-4 w-4"
    }
  }

  const getColorClasses = (color: string | undefined, isActive: boolean, disabled: boolean) => {
    switch (color) {
      case "red":
        return `bg-red-50 text-red-400 border-red-200 hover:bg-red-100 hover:text-red-500 hover:border-red-300 ${
          isActive ? "bg-red-200 border-red-300" : ""
        }`
      case "orange":
        return `bg-orange-50 text-orange-400 border-orange-200 hover:bg-orange-100 hover:text-orange-500 hover:border-orange-300 ${
          isActive ? "bg-orange-200 border-orange-300" : ""
        }`
      case "green":
        return `bg-green-50 text-green-400 border-green-200 hover:bg-green-100 hover:text-green-500 hover:border-green-300 ${
          isActive ? "bg-green-200 border-green-400" : ""
        }`
      case "gray":
      default:
        return `bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100 hover:text-gray-500 hover:border-gray-300 ${
          isActive ? "bg-gray-200 border-gray-300" : ""
        }`
    }
  }

  const getVariantClasses = (action: string, disabled: boolean, color?: string) => {
    const isActive = activeButton === action
    const baseClasses = `
      ${getSizeClasses()}
      flex items-center justify-center border
      transition-all duration-200 ease-in-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      ${disabled ? "cursor-not-allowed" : ""}
      ${isActive ? "scale-95" : ""}
    `

    switch (variant) {
      case "rounded":
        return `${baseClasses} ${getColorClasses(color, isActive, disabled)} rounded-full hover:shadow-sm`
      case "square":
        return `${baseClasses} ${getColorClasses(color, isActive, disabled)} rounded-none hover:shadow-sm`
      case "soft":
        return `${baseClasses} ${getColorClasses(color, isActive, disabled)} rounded-xl hover:shadow-md ${
          isActive ? "shadow-inner" : ""
        }`
      default:
        return `${baseClasses} ${getColorClasses(color, isActive, disabled)} rounded-lg hover:shadow-sm`
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {buttons.map(({ icon: Icon, action, label, handler, disabled = false, color }) => (
        <button
          key={action}
          onClick={() => handleClick(action, handler)}
          className={getVariantClasses(action, disabled, color)}
          title={label}
          aria-label={label}
          disabled={disabled}>
          {disabled ? (
            <div className="absolute">
              <Lock className={`${getIconSize()} flex-shrink-0`} />
            </div>
          ) : (
            <div>
              <Icon className={`${getIconSize()} flex-shrink-0`} />
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

export const InetActions: React.FC<InetTblActionProps> = ({
  id,
  type,
  typeCode,
  isCredit = false,
  isLeft = true,
  disableGenerate = false,
  disableSend = false,
  disableDownload = false,
  disableEmail = false,
  disableDelete = false,
  disableView = false,
  onDataChangeSuccess,
}) => {
  const [currentInvoice, setCurrentInvoice] = useState<{ id: any; type: string; isCredit: boolean } | null>(null)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [isSendOpen, setIsSendOpen] = useState(false)
  const router = useRouter()
  const { t } = useTranslation()
  
  const handleGenerate = () => {
    setCurrentInvoice({ id, type, isCredit })
    setIsGenerateOpen(true)
  }

  const handleView = () => {
    router.navigate({
        to: "/account/inets/json",
        search: { 
          id: id,
          type: typeCode
        }
    });
  }

  const handleSend = () => {
    setCurrentInvoice({ id, type, isCredit })
    setIsSendOpen(true)
  }

  const handleDownload = () => {
    const fileName = `${id}_${typeCode}.pdf`
    const fileUrl = `https://storage.cloud.google.com/ac_storage/account/${id}/${fileName}`
    window.open(fileUrl, "_blank")
  }

  const handleRemove = async () => {
    try {
      const response = await api.post<ResponseDTO<void>>(`/api/account/inets/remove/${id}/${typeCode}`);
      if (response.status) {
        toast.success(t("message", response.message));
        handleSuccess();
      } else {
        toast.error(t("message", response.message));
      }
    } catch (error) {
      toast.error(t("Data fetch failed"))
    }
  }

  const handleSuccess = () => {
    if (onDataChangeSuccess) {
      onDataChangeSuccess()
    }
  }

  const handleCloseSheet = () => {
    setIsGenerateOpen(false)
    setIsSendOpen(false)
  }

  const mainButtons: ButtonConfig[] = [
    { icon: Send, action: "send", label: "Send", handler: handleSend, disabled: disableSend, color: "orange" },
    {
      icon: Download,
      action: "download",
      label: "Download",
      handler: handleDownload,
      disabled: disableDownload,
      color: "green",
    },
  ]

  return (
    <div>
      {(typeCode === "81" && isCredit === false) || (isCredit === true && typeCode !== "81") ? (
        <div className={`flex items-center gap-1 ${!isLeft ? "float-right" : ""}`}>
          <button
            disabled
            className="h-8 px-3 bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed w-[112px] text-sm rounded-lg"
            title={t("No Action")}>
            {t("No Action")}
          </button>
        </div>
      ) : (
        <div className={`flex items-center gap-2 ${!isLeft ? "float-right" : ""}`}>
          <MinimalCleanButtonGroup buttons={mainButtons} size="sm" variant="default" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 flex items-center justify-center border rounded-lg bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-900 hover:border-gray-300"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              className="w-35 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
            >
              <DropdownMenuItem
                onClick={handleGenerate}
                disabled={disableGenerate}
                className={`flex items-center gap-2 ${disableGenerate ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Zap className="h-4 w-4" />
                <span>{t("Generate")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleView}
                disabled={disableView}
                className={`flex items-center gap-2 ${disableView ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Eye className="h-4 w-4" />
                <span>{t("View")}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleRemove}
                disabled={disableDelete}
                className={`flex items-center gap-2 ${disableDelete ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Trash2 className="h-4 w-4" />
                <span>{t("Remove")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
      {currentInvoice && (
        <>
          <GenerateSheet
            isOpen={isGenerateOpen}
            onClose={handleCloseSheet}
            onSuccess={handleSuccess}
            invoiceId={currentInvoice.id}
            invoiceNumber={id}
            type={type}
            typeCode={typeCode}
            isCredit={currentInvoice.isCredit}
          />
          <SendSheet
            isOpen={isSendOpen}
            onClose={handleCloseSheet}
            invoiceNumber={id}
            type={type}
            typeCode={typeCode}
          />
        </>
      )}
    </div>
  )
}