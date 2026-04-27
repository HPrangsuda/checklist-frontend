import { CircleCheck, XCircle, RefreshCw, SendHorizontal } from "lucide-react"

export function StatusBadge({ status }: any) {
    if (status === "PENDING") {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium bg-orange-50 border-orange-200 text-orange-700">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-orange-100">
                    <RefreshCw className="w-3 h-3 text-orange-500 animate-spin" />
                </div>
                <div className="text-xs">Pending</div>
            </div>
        )
    }

    if (status === "SEND") {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium bg-blue-50 border-blue-200 text-blue-700">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100">
                    <SendHorizontal className="w-3 h-3 text-blue-500" />
                </div>
                <div className="text-xs">Send</div>
            </div>
        )
    }

    if (status === "SUCCESS") {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-sm font-medium bg-green-50 border-green-200 text-green-700">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100">
                    <CircleCheck className="w-3 h-3 text-green-500" />
                </div>
                <div className="text-xs">Success</div>
            </div>
        )
    }

    if (status === "FAILED") {
        return (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium bg-red-50 border-red-200 text-red-700">
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-100">
                    <XCircle className="w-3 h-3 text-red-500 animate-ping" />
                </div>
                <div className="text-xs">Failed</div>
            </div>
        )
    }
    return null
}
