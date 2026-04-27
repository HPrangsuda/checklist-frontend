import { EventType, type CalendarEvent } from "@/core/types/common"
import { format, isSameMonth, isToday, addDays } from "date-fns"
import { Sun, Gift, Star } from "lucide-react"

interface AgendaViewProps {
  events: CalendarEvent[]
  eventTypeConfig: Record<string, any>
  onSelectEvent: (event: any) => void
  currentDate?: Date
}

export function AgendaView({
  events,
  eventTypeConfig,
  onSelectEvent,
  currentDate = new Date(),
}: AgendaViewProps) {
  // Filter events for the current month
  const filteredEvents = events.filter((event) => isSameMonth(event.start, currentDate))

  // Group events by date
  const groupedEvents = filteredEvents.reduce(
    (acc, event) => {
      const dateKey = format(event.start, "yyyy-MM-dd")
      if (!acc[dateKey]) {
        acc[dateKey] = []
      }
      acc[dateKey].push(event)
      return acc
    },
    {} as Record<string, CalendarEvent[]>,
  )

  // Sort dates
  const sortedDates = Object.keys(groupedEvents).sort()

  // Get the next 14 days for empty days
  const next14Days = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(currentDate, i)
    return format(date, "yyyy-MM-dd")
  })

  // Combine sorted dates with empty days
  const allDates = [...new Set([...sortedDates, ...next14Days])].sort()

  return (
    <div className="divide-y divide-gray-200">
      {allDates.map((dateKey) => {
        const dayEvents = groupedEvents[dateKey] || []
        const date = new Date(dateKey)
        const isCurrentDay = isToday(date)

        return (
          <div key={dateKey} className="p-4">
            <div className="mb-4">
              <div className="flex items-baseline">
                <h3 className={`text-2xl font-semibold ${isCurrentDay ? "text-red-600" : "text-gray-900"}`}>
                  {format(date, "d")}
                </h3>
                <div className="ml-2">
                  <div className="text-sm font-medium text-gray-500">{format(date, "EEEE")}</div>
                  <div className="text-sm text-gray-500">{format(date, "MMM yyyy")}</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {dayEvents.length > 0 ? (
                dayEvents.map((event) => {
                  const config = eventTypeConfig[event.type]
                  const isAllDay = event.type === EventType.HOLIDAY || event.type === EventType.BIRTHDAY

                  return (
                    <button key={event.id} onClick={() => onSelectEvent(event)} className="w-full text-left group">
                      <div className="flex items-start gap-4">
                        {!isAllDay && (
                          <div className="w-20 flex-shrink-0 text-sm text-gray-500">
                            {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
                          </div>
                        )}
                        {isAllDay && <div className="w-20 flex-shrink-0 text-sm text-gray-500">All day</div>}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: config.dotColor }}
                            />
                            <span
                              className="text-sm font-medium group-hover:text-blue-600"
                              style={{ color: config.color }}
                            >
                              {event.title}
                              {event.important && <Star className="inline-block ml-1 h-3 w-3 text-amber-500" />}
                            </span>
                          </div>
                          {event.type === EventType.HOLIDAY && (
                            <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                              <Sun className="h-3 w-3 text-yellow-500" />
                              <span>Holiday</span>
                            </div>
                          )}
                          {event.type === EventType.BIRTHDAY && (
                            <div className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                              <Gift className="h-3 w-3 text-pink-500" />
                              <span>Birthday</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <div className="text-sm text-gray-400 italic">No events scheduled</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

