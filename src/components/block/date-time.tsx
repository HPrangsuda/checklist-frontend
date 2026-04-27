import { format } from "date-fns"

interface DateTimeCellProps {
  date: Date
  className?: string
  showSeconds?: boolean
}

export function DateTimeCell({ date, className = "", showSeconds = true }: DateTimeCellProps) {
  const fullDate = format(date, "yyyy-MM-dd")
  const time = format(date, showSeconds ? "HH:mm:ss" : "HH:mm")

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col">
        <div className="text-xs text-gray-700 dark:text-gray-300">{fullDate}</div>
        <div className="text-xs text-gray-500 dark:text-gray-400">{time}</div>
      </div>
    </div>
  )
}
