import { ServerMultiSelect } from "@/components/select/multi-select"
import type { ListItemDTO, ResponseDTO } from "@/core/types/common"
import { useTranslation } from "@/core/contexts/language-context"
import { api } from "@/core/interceptor/api.interceptor"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

interface AlertDialogBoxProps {
    open: boolean
    onCancel: () => void
    onSuccess: () => void
}

interface InvoiceItemDTO {
    id: string
    invoiceNumber: string
}

export function InetSync({
    open,
    onCancel,
    onSuccess
}: AlertDialogBoxProps) {
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const { t } = useTranslation()

    const fetchInvoices = async (keyword: string, offset: number) => {
        try {
            const params: any = {
                offset: offset,
                limit: 10
            };     
            if (keyword.trim()) {
                params.keyword = keyword.trim();
            }
            const response = await api.get<ListItemDTO<InvoiceItemDTO>>(`/api/account/invoices/list`, { params: params });
            const transformedData = response.data.map(invoice => ({
                label: invoice.invoiceNumber.toString(),
                value: invoice.invoiceNumber.toString()
            }));
            return {
                data: transformedData,
                hasMore: response.hasMore || false
            };
        } catch (error) {
            return {
                data: [],
                hasMore: false
            };
        }
    };

    const handleSubmit = async () => {
        if (selectedInvoiceIds.length === 0) {
            toast.error(`${t("Please slect at least one invoice")}`);
            return;
        }

        setIsLoading(true);
        
        try {
            const payload = {
                ids: selectedInvoiceIds
            };
            const response = await api.post<ResponseDTO<void>>('/api/account/inets/sync', payload);
            if (response.success) {
                toast.success(`${t("message", response.code)}`);
                onSuccess();
            } else {
                toast.error(`${t("message", response.code)}`);
            }
        } catch (error) {
            toast.error(`${t("Sync failed try again")}`);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AlertDialog open={open} onOpenChange={onCancel}>
            <AlertDialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>{`${t("Sync Invoices")}`}</AlertDialogTitle>
                    <AlertDialogDescription>{`${t("Sync Invoices Description")}`}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-2 max-h-[400px] overflow-y-auto">
                    <ServerMultiSelect
                        title="Invoices"
                        values={selectedInvoiceIds}
                        onChange={setSelectedInvoiceIds}
                        fetchOptions={fetchInvoices}
                        placeholder={t("Select Invoices")}
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
                    {t("Cancel")}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("Sync")}
                            </>
                        ) : (
                            'Continue'
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}