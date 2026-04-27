import { Button } from "@/components/ui/button"
import { Upload, X, Download, Trash2 } from "lucide-react"
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
import { FieldWrapper } from "./FieldWrapper"

interface UploadedFile {
  id: string
  name: string
  size: number
  url: string
  type?: string
}

interface FileUploadFieldProps {
  id?: string
  label?: string
  value: File[]
  onChange: (files: File[]) => void
  uploadedFiles?: UploadedFile[]
  onDownloadFile?: (file: UploadedFile) => void
  onDeleteUploadedFile?: (fileId: string) => void
  maxFiles?: number
  maxSize?: number
  onlyPdf?: boolean
  onFileReject?: (file: File, message: string) => void
  placeholder?: string
  error?: string
  required?: boolean
}

export function FileUploadField({
  id,
  label,
  value,
  onChange,
  uploadedFiles = [],
  onDownloadFile,
  onDeleteUploadedFile,
  maxFiles = 1,
  maxSize = 10 * 1024 * 1024,
  onlyPdf = false,
  onFileReject,
  placeholder = "Drop your file here, or browse",
  error,
  required,
}: FileUploadFieldProps) {
  const totalFiles = uploadedFiles.length + value.length
  const remainingSlots = maxFiles - uploadedFiles.length
  const canUploadMore = totalFiles < maxFiles
  const ACCEPT_ALL = ".pdf,.jpg,.jpeg,.png,.ppt,.pptx,.doc,.docx,.txt,.rtf,.xls,.xlsx";
  const ACCEPT_PDF = ".pdf";
  const accept = onlyPdf ? ACCEPT_PDF : ACCEPT_ALL;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileName: string, fileType?: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase() || '';
    const mimeType = fileType?.toLowerCase() || '';

    // Supported file extensions mapped to icon names
    const iconMap: Record<string, string> = {
      xls: "xls",
      xlsx: "xls",
      csv: "csv",
      jpg: "jpg",
      jpeg: "jpg",
      png: "png",
      gif: "png",
      bmp: "png",
      webp: "png",
      svg: "png",
      ppt: "ppt",
      pptx: "ppt",
      pdf: "pdf",
      txt: "txt",
      rtf: "txt",
      doc: "txt",
      docx: "txt",
      tiff: "tiff",
      zip: "zip",
      rar: "rar"
    };

    // Handle known extensions directly
    if (iconMap[extension]) {
      return `/file-type/${iconMap[extension]}.png`;
    }

    // Handle cases where MIME type implies the file type but extension is missing or different
    if (mimeType.includes('spreadsheet')) {
      return `/file-type/xlsx.png`;
    }

    if (mimeType.includes('image')) {
      return `/file-type/png.png`;
    }

    if (mimeType.includes('presentation')) {
      return `/file-type/pptx.png`;
    }

    if (mimeType.includes('pdf')) {
      return `/file-type/pdf.png`;
    }

    if (mimeType.includes('document') || mimeType.includes('text')) {
      return `/file-type/txt.png`;
    }

    // Default fallback icon
    return `/file-type/other.png`;
  };

  return (
    <FieldWrapper id={id} label={label} required={required} error={error}>
      <div className="space-y-4">
        {/* File upload section */}
        <FileUpload
          maxFiles={remainingSlots}
          maxSize={maxSize}
          accept={accept}
          value={value}
          onValueChange={onChange}
          onFileReject={onFileReject}
          className="w-full">
          {canUploadMore && (
            <FileUploadDropzone className="min-h-[120px]">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="flex items-center justify-center rounded-full border p-3 bg-gray-50">
                  <Upload className="size-6 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-sm text-gray-900">{placeholder}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {onlyPdf
                      ? `Supports PDF only (max ${formatFileSize(maxSize)}, ${remainingSlots} more file${remainingSlots > 1 ? "s" : ""} allowed)`
                      : `Supports PDF, JPG, PNG, PPT, DOC, DOCX, TXT, RTF, XLS, XLSX (max ${formatFileSize(maxSize)}, ${remainingSlots} more file${remainingSlots > 1 ? "s" : ""} allowed)`
                    }
                  </p>
                </div>
              </div>
              <FileUploadTrigger asChild>
                <Button variant="outline" size="sm" className="mt-3 w-fit font-normal">
                  Browse Files
                </Button>
              </FileUploadTrigger>
            </FileUploadDropzone>
          )}
          <FileUploadList>
            {value.map((file, index) => (
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
        <div className="text-xs text-gray-500 text-center">
          <span className="bg-orange-100 text-orange-500 rounded-sm pt-1 pb-1 pl-3 pr-3">
            {totalFiles} of {maxFiles} files {totalFiles === 1 ? "uploaded" : "uploaded"}
          </span>
          {!canUploadMore && (
            <span className="text-amber-600 font-medium"> (Maximum reached)</span>
          )}
        </div>
        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div>
                    <img
                      src={getFileIcon(file.name, file.type)}
                      alt={`${file.name} icon`}
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-normal text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {onDownloadFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 hover:bg-green-100 hover:text-green-600"
                      onClick={() => onDownloadFile(file)}>
                      <Download className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  )}
                  {onDeleteUploadedFile && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 hover:bg-red-50 hover:text-red-600"
                      onClick={() => onDeleteUploadedFile(file.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FieldWrapper>
  )
}