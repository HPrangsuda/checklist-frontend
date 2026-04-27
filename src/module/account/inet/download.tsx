import { useState } from "react"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, FileText, Receipt, CreditCard } from "lucide-react"
import { toast } from "sonner"

interface DownloadSheetProps {
  isOpen: boolean
  onClose: () => void
  isCredit?: boolean
  type: string
}

export default function DownloadSheet({ isOpen, onClose, type, isCredit = false }: DownloadSheetProps) {
  const [selectedType, setSelectedType] = useState<string>(isCredit ? "credit" : "invoice")
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (type: string) => {
    setIsDownloading(true)

    try {
      // Simulate download process
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Create download URL based on type
      const downloadUrl = `/api/download/${type}`

      // Create a temporary link element to trigger download
      const link = document.createElement("a")
      link.href = downloadUrl
      link.download = `${type}-${Date.now()}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success("Download started!", {
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} download has begun.`,
      })

      console.log(`Downloading ${type}`)
    } catch (error) {
      console.error("Download failed:", error)
      toast.error("Download failed", {
        description: "Please try again later.",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCancel = () => {
    setSelectedType(isCredit ? "credit" : "invoice")
    onClose()
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-white">
          <SheetHeader className="pt-2 pb-2 pr-3 pl-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500 rounded-lg">
                <Download className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-md font-medium text-gray-600">Download Document</SheetTitle>
                <SheetDescription className="text-sm font-normal text-gray-600">
                  {isCredit ? "Download credit note" : "Choose document type to download"}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Document Type Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Document Type *</Label>

              {isCredit ? (
                // Credit Note Only
                <div className="grid grid-cols-1 gap-3">
                  <label
                    htmlFor="documentType-credit"
                    className="relative flex items-center justify-center p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 border-orange-500 bg-orange-50 text-orange-900"
                  >
                    <input
                      type="radio"
                      id="documentType-credit"
                      name="documentType"
                      value="credit"
                      checked={selectedType === "credit"}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center space-y-3">
                      <CreditCard className="h-12 w-12" />
                      <div className="text-center">
                        <div className="font-semibold text-lg">Credit Note</div>
                        <div className="text-sm text-orange-600">Adjustment document for refunds</div>
                      </div>
                    </div>
                    <div className="absolute top-3 right-3 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
                    </div>
                  </label>
                </div>
              ) : (
                // Invoice and Receipt Options
                <div className="grid grid-cols-2 gap-3">
                  <label
                    htmlFor="documentType-invoice"
                    className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedType === "invoice"
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      id="documentType-invoice"
                      name="documentType"
                      value="invoice"
                      checked={selectedType === "invoice"}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center space-y-2">
                      <FileText className="h-8 w-8" />
                      <div className="text-center">
                        <div className="font-medium">Invoice</div>
                        <div className="text-xs text-gray-500">Business invoice</div>
                      </div>
                    </div>
                    {selectedType === "invoice" && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </label>

                  <label
                    htmlFor="documentType-receipt"
                    className={`relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedType === "receipt"
                        ? "border-blue-500 bg-blue-50 text-blue-900"
                        : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="radio"
                      id="documentType-receipt"
                      name="documentType"
                      value="receipt"
                      checked={selectedType === "receipt"}
                      onChange={(e) => setSelectedType(e.target.value)}
                      className="sr-only"
                    />
                    <div className="flex flex-col items-center space-y-2">
                      <Receipt className="h-8 w-8" />
                      <div className="text-center">
                        <div className="font-medium">Receipt</div>
                        <div className="text-xs text-gray-500">Payment receipt</div>
                      </div>
                    </div>
                    {selectedType === "receipt" && (
                      <div className="absolute top-2 right-2 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </label>
                </div>
              )}
            </div>
            {/* Selected Document Preview */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3">Selected Document</h4>
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    selectedType === "credit"
                      ? "bg-orange-100"
                      : selectedType === "invoice"
                        ? "bg-blue-100"
                        : "bg-purple-100"
                  }`}
                >
                  {selectedType === "credit" ? (
                    <CreditCard className="h-5 w-5 text-orange-600" />
                  ) : selectedType === "invoice" ? (
                    <FileText className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Receipt className="h-5 w-5 text-purple-600" />
                  )}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {selectedType === "credit" ? "Credit Note" : selectedType === "invoice" ? "Invoice" : "Receipt"}
                  </div>
                  <div className="text-sm text-gray-500">
                    {selectedType === "credit"
                      ? "Adjustment document for refunds and corrections"
                      : selectedType === "invoice"
                        ? "Standard business invoice document"
                        : "Payment receipt document"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 border-t bg-white p-6">
          <div className="flex space-x-3">
            {isCredit ? (
              // Credit Note - Only Download and Cancel
              <>
                <Button
                  onClick={() => handleDownload(selectedType)}
                  disabled={isDownloading}
                  className="flex-1 h-10 bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download Credit Note
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 h-10"
                  disabled={isDownloading}
                >
                  Cancel
                </Button>
              </>
            ) : (
              // Invoice/Receipt - Download and Cancel
              <>
                <Button
                  onClick={() => handleDownload(selectedType)}
                  disabled={isDownloading}
                  className="flex-1 h-10 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download {selectedType === "invoice" ? "Invoice" : "Receipt"}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  className="flex-1 h-10"
                  disabled={isDownloading}
                >
                  Cancel
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
