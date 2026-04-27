import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X } from "lucide-react"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/upload/file-upload"
import { toast } from "sonner"
import { api } from "@/core/interceptor/api.interceptor"
import type { ResponseDTO } from "@/core/types/common"
import { useTranslation } from "@/core/contexts/language-context"

interface SendSheetProps {
  isOpen: boolean
  invoiceNumber: string
  type: string
  typeCode: string
  onClose: () => void
}

export default function SendSheet({ isOpen, invoiceNumber, type, onClose }: SendSheetProps) {
  const [files, setFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [alertMessage, setAlertMessage] = useState<string>("")
  const { t } = useTranslation();
  
  const onFileReject = (file: File, message: string) => {
    toast.error(message, {
      description: `"${file.name.length > 20 ? `${file.name.slice(0, 20)}...` : file.name}" has been rejected`,
    })
  }

  function detectTypeFromFilename(filename: string): "invoice" | "receipt" | "credit" | null {
    if (filename.includes("ใบกำกับสินค้า") || filename.includes("388")) {
      return "invoice";
    }
    if ((/^R\d+/.test(filename)) || filename.includes("T01")){
      return "receipt";
    }
    if (filename.includes("81")){
      return "credit";
    }
    return null;
  }

  const handleFileChange = (newFiles: File[]) => {
    setFiles(newFiles)
    setAlertMessage("")
    if (newFiles.length > 0) {
      const file = newFiles[0]
      const detectedType = detectTypeFromFilename(file.name)
      if (detectedType && detectedType !== type) {
        setAlertMessage(
          `Check file is match with invoice Type: File type detected as '${detectedType}', but selected type is '${type}'.`
        )
        toast.error("Check file is match with invoice Type", {
          description: `File type detected as '${detectedType}', but selected type is '${type}'.`,
        })
      }
    }
  }

  const handleSend = async () => {
    if (files.length === 0) {
      toast.error("Please upload a file first");
      return;
    }
  
    setIsUploading(true);
  
    try {
      const formData = new FormData();
      formData.append("file", files[0]);
      formData.append("docTypeCode", type);
      formData.append("invoiceNumber", invoiceNumber);
      const response = await api.post<ResponseDTO<void>>('/api/account/inets/send',formData);
      if(response.success){
        toast.success(`${t("message.message", response.code)}`);
      }else{
        toast.error(response.error);
      }
      setFiles([]);
      onClose();
    } catch (error: any) {
      toast.error("Failed to send document", {
        description: error?.message ?? "Please try again later.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setFiles([]);
    onClose();
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
        <div className="flex-shrink-0 border-b bg-white">
          <SheetHeader className="pt-2 pb-2 pr-3 pl-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-400 rounded-lg">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-md font-medium text-gray-600">{t("common.common", "send_document")}</SheetTitle>
                <SheetDescription className="text-sm font-normal text-gray-600">Upload and send your {type}</SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">{t("common.common", "upload_file")} *</Label>
              <FileUpload
                maxFiles={1}
                maxSize={10 * 1024 * 1024}
                accept=".pdf,.jpg,.jpeg,.png"
                value={files}
                onValueChange={handleFileChange}
                onFileReject={onFileReject}
                className="w-full"
              >
                <FileUploadDropzone className="min-h-[120px]">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex items-center justify-center rounded-full border p-3 bg-gray-50">
                      <Upload className="size-6 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900">
                        Drop your file here, or <span className="text-blue-600">{t("common.common", "brows")}</span>
                      </p>
                      <p className="text-gray-500 text-xs mt-1">Supports PDF, JPG, PNG (max 10MB, 1 file only)</p>
                    </div>
                  </div>
                  <FileUploadTrigger asChild>
                    <Button variant="outline" size="sm" className="mt-3 w-fit">
                      {t("common.common", "brows_files")}
                    </Button>
                  </FileUploadTrigger>
                </FileUploadDropzone>
                <FileUploadList>
                  {files.map((file, index) => (
                    <FileUploadItem key={index} value={file} className="bg-gray-50 border-gray-200">
                      <FileUploadItemPreview />
                      <FileUploadItemMetadata />
                      <FileUploadItemDelete asChild>
                        <Button variant="ghost" size="icon" className="size-7 hover:bg-red-50 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </Button>
                      </FileUploadItemDelete>
                    </FileUploadItem>
                  ))}
                </FileUploadList>
              </FileUpload>
            </div>
            <div>
              {alertMessage && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
                  {alertMessage}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 border-t bg-white p-6">
          <div className="flex space-x-3">
            <Button
              onClick={handleSend}
              disabled={files.length === 0 || isUploading}
              className="flex-1 h-10 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  {t("common.common", "sending")}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {t("common.common", "send")}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1 h-10"
              disabled={isUploading}>
              {t("common.common", "cancel")}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
