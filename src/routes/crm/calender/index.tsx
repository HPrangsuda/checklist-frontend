import { createFileRoute } from '@tanstack/react-router'
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from "react-big-calendar"
import { addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, isSameDay, format, parse, startOfWeek, getDay } from "date-fns"
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react"
import { enUS } from 'date-fns/locale/en-US'
import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { EventType, type CalendarEvent } from '@/core/types/common'
import { AgendaView } from '@/module/crm/calendar/agenda-view'
import { EventDrawer } from '@/module/crm/calendar/event-drawer'

import "react-big-calendar/lib/css/react-big-calendar.css"

const locales = {
    "en-US": enUS
}
const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
})

const initialEvents: CalendarEvent[] = [
    // Meetings
    {
      id: "1",
      title: "Team Standup",
      start: new Date(2025, 2, 12, 9, 0),
      end: new Date(2025, 2, 12, 9, 30),
      type: EventType.MEETING,
    },
    {
      id: "2",
      title: "Project Kickoff",
      start: new Date(2025, 2, 12, 10, 30),
      end: new Date(2025, 2, 12, 11, 30),
      type: EventType.MEETING,
    },
    {
      id: "3",
      title: "Client Presentation",
      start: new Date(2025, 2, 12, 13, 0),
      end: new Date(2025, 2, 12, 14, 0),
      type: EventType.MEETING,
      important: true,
    },
  
    // Internal Meetings
    {
      id: "4",
      title: "Sprint Planning",
      start: new Date(2025, 2, 13, 9, 0),
      end: new Date(2025, 2, 13, 10, 0),
      type: EventType.INTERNAL_MEETING,
    },
    {
      id: "5",
      title: "Design Review",
      start: new Date(2025, 2, 13, 10, 30),
      end: new Date(2025, 2, 13, 11, 30),
      type: EventType.INTERNAL_MEETING,
    },
    {
      id: "6",
      title: "Team Retrospective",
      start: new Date(2025, 2, 13, 13, 0),
      end: new Date(2025, 2, 13, 14, 0),
      type: EventType.INTERNAL_MEETING,
    },
  
    // Calls
    {
      id: "7",
      title: "Vendor Call",
      start: new Date(2025, 2, 14, 9, 0),
      end: new Date(2025, 2, 14, 9, 30),
      type: EventType.CALL,
    },
    {
      id: "8",
      title: "Support Call",
      start: new Date(2025, 2, 14, 10, 30),
      end: new Date(2025, 2, 14, 11, 0),
      type: EventType.CALL,
    },
    {
      id: "9",
      title: "Partner Check-in",
      start: new Date(2025, 2, 14, 13, 0),
      end: new Date(2025, 2, 14, 13, 30),
      type: EventType.CALL,
    },
  
    // Service Users
    {
      id: "10",
      title: "User Interview",
      start: new Date(2025, 2, 15, 9, 0),
      end: new Date(2025, 2, 15, 10, 0),
      type: EventType.SERVICE_USER,
    },
    {
      id: "11",
      title: "User Testing",
      start: new Date(2025, 2, 15, 10, 30),
      end: new Date(2025, 2, 15, 11, 30),
      type: EventType.SERVICE_USER,
      important: true,
    },
    {
      id: "12",
      title: "User Onboarding",
      start: new Date(2025, 2, 15, 13, 0),
      end: new Date(2025, 2, 15, 14, 0),
      type: EventType.SERVICE_USER,
    },
  
    // Birthdays
    {
      id: "13",
      title: "Sarah's Birthday",
      start: new Date(2025, 2, 16),
      end: new Date(2025, 2, 16),
      type: EventType.BIRTHDAY,
    },
    {
      id: "14",
      title: "Michael's Birthday",
      start: new Date(2025, 2, 20),
      end: new Date(2025, 2, 20),
      type: EventType.BIRTHDAY,
    },
  
    // Holidays
    {
      id: "15",
      title: "Company Holiday",
      start: new Date(2025, 2, 17),
      end: new Date(2025, 2, 17),
      type: EventType.HOLIDAY,
    },
    {
      id: "16",
      title: "Public Holiday",
      start: new Date(2025, 2, 25),
      end: new Date(2025, 2, 25),
      type: EventType.HOLIDAY,
    },
  
    // Additional events for different days
    {
      id: "17",
      title: "Quarterly Review",
      start: new Date(2025, 2, 18, 10, 0),
      end: new Date(2025, 2, 18, 12, 0),
      type: EventType.MEETING,
      important: true,
    },
    {
      id: "18",
      title: "Team Lunch",
      start: new Date(2025, 2, 18, 12, 30),
      end: new Date(2025, 2, 18, 13, 30),
      type: EventType.INTERNAL_MEETING,
    },
    {
      id: "19",
      title: "Product Demo",
      start: new Date(2025, 2, 19, 14, 0),
      end: new Date(2025, 2, 19, 15, 0),
      type: EventType.MEETING,
    },
    {
      id: "20",
      title: "Client Call",
      start: new Date(2025, 2, 19, 16, 0),
      end: new Date(2025, 2, 19, 16, 30),
      type: EventType.CALL,
    },
    {
      id: "21",
      title: "User Workshop",
      start: new Date(2025, 2, 21, 9, 0),
      end: new Date(2025, 2, 21, 12, 0),
      type: EventType.SERVICE_USER,
      important: true,
    },
    {
      id: "22",
      title: "Strategy Session",
      start: new Date(2025, 2, 22, 10, 0),
      end: new Date(2025, 2, 22, 11, 30),
      type: EventType.INTERNAL_MEETING,
    },
    {
      id: "23",
      title: "Vendor Meeting",
      start: new Date(2025, 2, 23, 13, 0),
      end: new Date(2025, 2, 23, 14, 0),
      type: EventType.MEETING,
    },
    {
      id: "24",
      title: "Team Building",
      start: new Date(2025, 2, 24, 15, 0),
      end: new Date(2025, 2, 24, 17, 0),
      type: EventType.INTERNAL_MEETING,
      important: true,
    },
]
const eventTypeConfig = {
    [EventType.MEETING]: {
      color: "#F08712",
      bgColor: "rgb(255 241 222)",
      borderColor: "rgb(255 211 152)",
      dotColor: "#F97316",
    },
    [EventType.CALL]: {
      color: "#0E7B46",
      bgColor: "#E0F2E9",
      borderColor: "#A7D5BE",
      dotColor: "#10B981",
    },
    [EventType.INTERNAL_MEETING]: {
      color: "#1E40AF",
      bgColor: "#E0F0FF",
      borderColor: "#A4CAFE",
      dotColor: "#3B82F6",
    },
    [EventType.SERVICE_USER]: {
      color: "#B91C1C",
      bgColor: "#FEE2E2",
      borderColor: "#FCA5A5",
      dotColor: "#EF4444",
    },
    [EventType.BIRTHDAY]: {
      color: "#9D174D",
      bgColor: "#FCE7F3",
      borderColor: "#F9A8D4",
      dotColor: "#EC4899",
    },
    [EventType.HOLIDAY]: {
      color: "#3F6212",
      bgColor: "#ECFCCB",
      borderColor: "#BEF264",
      dotColor: "#84CC16",
    },
}

const CustomToolbar = () => null

export const Route = createFileRoute('/crm/calender/')({
  component: Calendar,
})

function Calendar() {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [view, setView] = useState<string>(Views.MONTH)
  const [date, setDate] = useState(new Date(2025, 2, 15))
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  const handleViewChange = (newView: string) => {
    setView(newView)
  }

  const handleNavigate = (action: string) => {
    switch (action) {
      case "PREV":
        if (view === Views.DAY) setDate(subDays(date, 1))
        else if (view === Views.WEEK) setDate(subWeeks(date, 1))
        else setDate(subMonths(date, 1))
        break
      case "NEXT":
        if (view === Views.DAY) setDate(addDays(date, 1))
        else if (view === Views.WEEK) setDate(addWeeks(date, 1))
        else setDate(addMonths(date, 1))
        break
      case "TODAY":
        setCalendarOpen(true)
        break
      default:
        break
    }
  }

  const handleSelectEvent = (event: any) => {
    if (event.type !== EventType.HOLIDAY) {
      setSelectedEvent(event)
      setIsDrawerOpen(true)
    }
  }

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedEvent(null)
  }

  const handleUpdateEvent = (updatedEvent: CalendarEvent) => {
    setEvents(events.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)))
    setIsDrawerOpen(false)
    setSelectedEvent(null)
  }

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate)
      setCalendarOpen(false)
    }
  }

  const eventStyleGetter = (event: CalendarEvent) => {
    const config = eventTypeConfig[event.type]

    const style: React.CSSProperties = {
      backgroundColor: config.bgColor,
      color: config.color,
      borderRadius: "3px",
      border: `1px solid ${config.borderColor}`,
      fontSize: "12px",
      padding: "1px 4px",
      fontWeight: 500,
      height: "20px",
      display: "flex",
      alignItems: "center",
    }

    return { style }
  }

  const EventComponent = ({ event }: { event: CalendarEvent }) => {
    const config = eventTypeConfig[event.type]

    return (
      <div className="flex items-center gap-2 h-full w-full overflow-hidden">
        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.dotColor }} />
        <span className="truncate">{event.title}</span>
      </div>
    )
  }

  const dayPropGetter = (date: Date) => {
    const isToday = isSameDay(date, new Date())

    // Check if the day is a holiday
    const isHoliday = events.some((event) => event.type === EventType.HOLIDAY && isSameDay(new Date(event.start), date))

    let backgroundColor = ""
    if (isToday) {
      backgroundColor = "rgba(254, 226, 226, 0.2)"
    } else if (isHoliday) {
      backgroundColor = "rgba(236, 252, 203, 0.3)" // Light green for holidays
    }

    return {
      className: isToday ? "rbc-today" : isHoliday ? "rbc-holiday" : "",
      style: {
        backgroundColor,
      },
    }
  }

  const renderHeader = () => (
    <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200">
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" size="icon" onClick={() => handleNavigate("PREV")} className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 font-normal">
              <CalendarDays className="h-4 w-4 mr-2" />
              Today
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            
          </PopoverContent>
        </Popover>

        <Button variant="ghost" size="icon" onClick={() => handleNavigate("NEXT")} className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-slate-200 mx-2" />

        <div className="font-normal text-slate-900">
          {format(date, view === Views.DAY ? "MMMM d, yyyy" : "MMMM yyyy")}
        </div>
      </div>

      <Tabs defaultValue={view} onValueChange={handleViewChange} value={view} className="h-8">
        <TabsList className="h-8 p-0.5">
          <TabsTrigger value={Views.MONTH} className="h-7 px-2.5 text-xs">
            Month
          </TabsTrigger>
          <TabsTrigger value={Views.WEEK} className="h-7 px-2.5 text-xs">
            Week
          </TabsTrigger>
          <TabsTrigger value={Views.DAY} className="h-7 px-2.5 text-xs">
            Day
          </TabsTrigger>
          <TabsTrigger value="agenda" className="h-7 px-2.5 text-xs">
            Agenda
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  )

  if (view === "agenda") {
    return (
      <div className="flex flex-col h-[85vh] bg-white rounded-md overflow-hidden border border-slate-200">
        {renderHeader()}
        <div className="flex-grow overflow-auto">
          <AgendaView
            events={events}
            eventTypeConfig={eventTypeConfig}
            onSelectEvent={handleSelectEvent}
            currentDate={date}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[85vh] bg-white rounded-md overflow-hidden border border-slate-200 m-4">
      {renderHeader()}
      <div className="flex-grow p-[2px]">
        <BigCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          onView={handleViewChange}
          date={date}
          onNavigate={(newDate) => setDate(newDate)}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          dayPropGetter={dayPropGetter}
          components={{
            event: EventComponent,
            toolbar: CustomToolbar,
          }}
          formats={{
            dayFormat: "dd",
            weekdayFormat: "eee",
            monthHeaderFormat: "MMMM yyyy",
            dayHeaderFormat: "MMMM d, yyyy",
            dayRangeHeaderFormat: ({ start, end }) => `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`,
          }}
          className="modern-calendar"
        />
      </div>
      <EventDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        event={selectedEvent}
        onUpdate={handleUpdateEvent}
      />
    </div>
  )
}
