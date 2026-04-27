import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronUp, Settings, FileText, Edit, Info, Loader2 } from "lucide-react"
import { storageService } from "@/core/service/storage.service"
import { api } from "@/core/interceptor/api.interceptor"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import type React from "react"
import { useTranslation } from "@/core/contexts/language-context"
import type { ResponseDTO } from "@/core/types/common"

interface GenerateFormData {
  docTypeCode: string | null
  invoiceNumber: string | null
  taxId: string | null
  branchId: string | null
  postalCode: string | null
  countryCode: string | null
  vat: string | null
  taxIdType: string | null
  exchangeRate: string | null
  originalAmount: string | null
  adjustAmount: string | null
  purpose: string | null
  referenceId: string | null
  isOverride: boolean
  modify388By: null,
  modifyT01By: null,
  modify81By: string | null
}

interface GenerateFormSheetProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  invoiceId: string
  isCredit: boolean
  invoiceNumber: string
  type: string
  typeCode: string
}

export default function GenerateSheet({ isOpen, onClose, onSuccess, invoiceId, isCredit }: GenerateFormSheetProps) {
  const [invoiceType, setInvoiceType] = useState<string>("388")
  const [showBasic, setShowBasic] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showAdjustment, setShowAdjustment] = useState(false)
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const [formData, setFormData] = useState<GenerateFormData>({
    docTypeCode: null,
    invoiceNumber: null,
    taxId: null,
    branchId: null,
    postalCode: null,
    countryCode: null,
    vat: null,
    taxIdType: null,
    exchangeRate: null,
    originalAmount: null,
    adjustAmount: null,
    purpose: null,
    referenceId: null,
    isOverride: false,
    modify388By: null,
    modifyT01By: null,
    modify81By: null
  })

  useEffect(() => {
    if (isCredit) {
      setShowAdjustment(true)
      setInvoiceType("81")
      setFormData(prev => ({ ...prev, docTypeCode: "81" }))
    } else {
      setFormData(prev => ({ ...prev, docTypeCode: invoiceType }))
    }
  }, [isCredit, invoiceType])

  const handleInputChange = (field: keyof GenerateFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value || null,
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const docTypeCode = isCredit ? "81" : invoiceType;
    if (!docTypeCode || !invoiceId) {
      toast.error('Document type and Invoice ID are required');
      setIsLoading(false);
      return;
    }

    const payload: Record<string, any> = {
      invoiceNumber: invoiceId,
      docTypeCode: docTypeCode,
      isOverride: formData.isOverride,
      modify388By: storageService.getDepartmentId(),
      modifyT01By: storageService.getDepartmentId(),
    };

    if (formData.taxId?.trim()) payload.taxId = formData.taxId.trim();
    if (formData.branchId?.trim()) payload.branchId = formData.branchId.trim();
    if (formData.postalCode?.trim()) payload.postalCode = formData.postalCode.trim();
    if (formData.countryCode?.trim()) payload.countryCode = formData.countryCode.trim();
    if (formData.vat?.trim()) payload.vat = formData.vat.trim();
    if (formData.taxIdType?.trim()) payload.taxIdType = formData.taxIdType.trim();
    if (formData.exchangeRate?.trim()) payload.exchangeRate = formData.exchangeRate.trim();

    if (docTypeCode === "81") {
      if (formData.originalAmount?.trim()) payload.originalAmount = formData.originalAmount.trim();
      if (formData.adjustAmount?.trim()) payload.adjustAmount = formData.adjustAmount.trim();
      if (formData.purpose?.trim()) payload.purpose = formData.purpose.trim();
      if (formData.referenceId?.trim()) payload.referenceId = formData.referenceId.trim();
      if (formData.modify81By?.trim()) payload.modify81By = storageService.getDepartmentId();
    }

    try {
      const response = await api.post<ResponseDTO<void>>('/api/account/inets/generate', payload);
      
      if (response.success) {
        toast.success(`${t("message", response.code)}`);
        onSuccess();
      } else {
        toast.error(`${t("message", response.code)}`);
      }
    } catch (error) {
      toast.error('Generate failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleCancel = () => {
    onClose()
    setShowBasic(false)
    setShowAdvanced(false)
    setShowAdjustment(false)
  }

  const onReset = () => {
    setShowBasic(false)
    setShowAdvanced(false)
    setShowAdjustment(false)
  }

  const isInvoiceType81 = invoiceType === "81" || isCredit

  const getInvoiceTypeInfo = (type: string) => {
    switch (type) {
      case "01":
        return { label: "Standard Invoice", color: "bg-blue-500", icon: FileText }
      case "81":
        return { label: "Adjustment Invoice", color: "bg-orange-500", icon: Settings }
      case "388":
        return { label: "Tax Invoice", color: "bg-green-500", icon: FileText }
      default:
        return { label: "Invoice", color: "bg-gray-500", icon: FileText }
    }
  }

  const invoiceTypeInfo = getInvoiceTypeInfo(isCredit ? "81" : invoiceType)

  return (
    <Sheet open={isOpen} onOpenChange={() => { onClose(); onReset(); }}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col gap-0 h-full">
        {/* Header */}
        <div className="flex-shrink-0 border-b bg-white">
          <SheetHeader className="pt-2 pb-2 pr-3 pl-3">
            <div className="flex items-center space-x-3">
              <div className={`p-2 ${invoiceTypeInfo.color} rounded-md`}>
                <invoiceTypeInfo.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <SheetTitle className="text-md font-medium text-gray-600">{invoiceTypeInfo.label}</SheetTitle>
                <SheetDescription className="text-sm text-gray-600">
                  ID: <span className="font-medium text-gray-600">{invoiceId}</span>
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col h-full">
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3 space-y-3">
              <div className="rounded-lg border border-gray-200 p-1">
                <Collapsible open={showBasic} onOpenChange={setShowBasic}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className={`w-full justify-between p-3 h-auto hover:bg-gray-100 rounded-lg ${showBasic ? "bg-gray-100" : ""}`}>
                      <div className="flex items-center space-x-2">
                        <Info className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-800">Basic Information</span>
                      </div>
                      {showBasic ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4 mt-4 p-3">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="taxId" className="text-sm font-medium text-gray-700">
                          Tax Number
                        </Label>
                        <Input
                          id="taxId"
                          name="taxId"
                          value={formData.taxId || ""}
                          onChange={(e: any) => handleInputChange("taxId", e.target.value)}
                          placeholder="Enter tax number"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label
                          htmlFor="branchId"
                          className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                          <span>Branch ID</span>
                        </Label>
                        <Input
                          id="branchId"
                          name="branchId"
                          value={formData.branchId || ""}
                          onChange={(e: any) => handleInputChange("branchId", e.target.value)}
                          placeholder="Enter branch id"
                          className="h-8"
                          maxLength={6}
                        />
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <div className="rounded-lg border border-gray-200 p-1">
                <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className={`w-full justify-between p-3 h-auto hover:bg-gray-100 rounded-lg ${showAdvanced ? "bg-gray-100" : ""
                        }`}
                    >
                      <div className="flex items-center space-x-2">
                        <Settings className="h-4 w-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-800">Advanced Options</span>
                      </div>
                      {showAdvanced ? (
                        <ChevronUp className="h-4 w-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-600" />
                      )}
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent className="space-y-4 mt-4 p-3">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode" className="text-sm font-medium text-gray-700">
                          Postal Code
                        </Label>
                        <Input
                          id="postalCode"
                          name="postalCode"
                          value={formData.postalCode || ""}
                          onChange={(e: any) => handleInputChange("postalCode", e.target.value)}
                          placeholder="Enter postal code"
                          className="h-10 w-full"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="countryId" className="text-sm font-medium text-gray-700">
                          Country Code
                        </Label>
                        <Input
                          id="countryCode"
                          name="countryCode"
                          value={formData.countryCode || ""}
                          onChange={(e: any) => handleInputChange("countryCode", e.target.value)}
                          placeholder="Enter country code"
                          className="h-10 w-full"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="vat" className="text-sm font-medium text-gray-700">
                            VAT (%)
                          </Label>
                          <Input
                            id="vat"
                            name="vat"
                            type="number"
                            step="0.01"
                            value={formData.vat || ""}
                            onBlur={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value)) {
                                handleInputChange("vat", value.toFixed(2));
                              }
                            }}
                            onChange={(e: any) => handleInputChange("vat", e.target.value)}
                            placeholder="Enter vat percentage"
                            className="h-10"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="taxIdType" className="text-sm font-medium text-gray-700">
                            Tax ID Type
                          </Label>
                          <Select value={formData.taxIdType || ""} onValueChange={(value: any) => handleInputChange("taxIdType", value)}>
                            <SelectTrigger className="h-10 w-full">
                              <SelectValue placeholder="Select tax type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TXID">TXID</SelectItem>
                              <SelectItem value="NIDN">NIDN</SelectItem>
                              <SelectItem value="OTHR">OTHR</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>

              {isInvoiceType81 && (
                <div className="bg-orange-50 rounded-lg border border-orange-200 p-1">
                  <Collapsible open={showAdjustment} onOpenChange={setShowAdjustment}>
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className={`w-full justify-between p-3 h-auto hover:bg-orange-100 rounded-lg ${showAdjustment ? "bg-orange-100" : ""
                          }`}
                      >
                        <div className="flex items-center space-x-2">
                          <Edit className="h-4 w-4 text-orange-600" />
                          <span className="text-base font-medium text-orange-800">Adjustment Details</span>
                        </div>
                        {showAdjustment ? (
                          <ChevronUp className="h-4 w-4 text-orange-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-orange-600" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-4 mt-4 p-3">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="referenceId" className="text-sm font-medium text-gray-700">
                            Reference Invoice ID
                          </Label>
                          <Input
                            id="referenceId"
                            name="referenceId"
                            value={formData.referenceId || ""}
                            onChange={(e: any) => handleInputChange("referenceId", e.target.value)}
                            placeholder="Enter reference invoice number"
                            className="h-10 w-full"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="originalAmount" className="text-sm font-medium text-gray-700">
                              Original Amount
                            </Label>
                            <Input
                              id="originalAmount"
                              name="originalAmount"
                              type="number"
                              step="0.01"
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) {
                                  handleInputChange("originalAmount", value.toFixed(2));
                                }
                              }}
                              value={formData.originalAmount || ""}
                              onChange={(e: any) => handleInputChange("originalAmount", e.target.value)}
                              placeholder="Enter original amount"
                              className="h-10"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="adjustAmount" className="text-sm font-medium text-gray-700">
                              Adjust Amount
                            </Label>
                            <Input
                              id="adjustAmount"
                              name="adjustAmount"
                              type="number"
                              step="0.01"
                              onBlur={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value)) {
                                  handleInputChange("adjustAmount", value.toFixed(2));
                                }
                              }}
                              value={formData.adjustAmount || ""}
                              onChange={(e: any) => handleInputChange("adjustAmount", e.target.value)}
                              placeholder="Enter adjust amount"
                              className="h-10"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="purpose" className="text-sm font-medium text-gray-700">
                            Purpose of Adjustment
                          </Label>
                          <Textarea
                            id="purpose"
                            name="purpose"
                            value={formData.purpose || ""}
                            onChange={(e: any) => handleInputChange("purpose", e.target.value)}
                            placeholder="Please provide a explanation"
                            maxLength={600}
                            rows={3}
                            className="resize-none"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
              {/* Override data checkbox */}
              <div className="bg-red-50 rounded-lg border border-red-200 p-4">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="isOverride"
                    name="isOverride"
                    checked={formData.isOverride}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isOverride: checked === true }))}
                    className="mt-1 border-red-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                  />
                  <div className="flex-1">
                    <label htmlFor="isOverride" className="text-sm font-medium text-red-800 cursor-pointer">
                      Do you want to override this data?
                    </label>
                    <p className="text-xs text-red-600 mt-1">
                      Warning: This will override existing invoice data and cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              {/* Bottom padding for fixed footer */}
              <div className="h-20"></div>
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 border-t bg-white p-6">
            <div className="flex space-x-3">
              <Button
                type="submit"
                className="flex-1 h-10 bg-gray-900 hover:bg-gray-800 text-white"
                disabled={isLoading || !invoiceId}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{t("Generate")}</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel} 
                className="flex-1 h-10 text-gray-700 border-gray-300 hover:bg-gray-50">
                <span>{t("Cancel")}</span>
              </Button>
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}