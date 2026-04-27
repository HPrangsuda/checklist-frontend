import { useState, useEffect } from "react"
import { X, Star, Calendar, Clock, Users, Phone, UserCircle, Gift } from "lucide-react"
import { format } from "date-fns"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { EventType, type CalendarEvent } from "@/core/types/common"

interface EventDrawerProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  onUpdate: (event: CalendarEvent) => void
}

// Event type configuration
const eventTypeConfig = {
  [EventType.MEETING]: {
    color: "#F97316", // Orange
    icon: Calendar,
    label: "Meeting",
  },
  [EventType.CALL]: {
    color: "#10B981", // Green
    icon: Phone,
    label: "Call",
  },
  [EventType.INTERNAL_MEETING]: {
    color: "#3B82F6", // Blue
    icon: Users,
    label: "Internal Meeting",
  },
  [EventType.SERVICE_USER]: {
    color: "#EF4444", // Red
    icon: UserCircle,
    label: "Service User",
  },
  [EventType.BIRTHDAY]: {
    color: "#EC4899", // Pink
    icon: Gift,
    label: "Birthday",
  },
}

export function EventDrawer({ isOpen, onClose, event, onUpdate }: EventDrawerProps) {
  const [editedEvent, setEditedEvent] = useState<CalendarEvent | null>(null)

  useEffect(() => {
    if (event) {
      setEditedEvent({ ...event })
    }
  }, [event])

  const handleChange = (field: keyof CalendarEvent, value: any) => {
    if (editedEvent) {
      setEditedEvent({ ...editedEvent, [field]: value })
    }
  }

  const handleSave = () => {
    if (editedEvent) {
      onUpdate(editedEvent)
    }
  }

  if (!editedEvent) return null

  // Don't allow editing holidays
  if (editedEvent.type === EventType.HOLIDAY) return null

  const EventIcon = editedEvent.type ? eventTypeConfig[editedEvent.type]?.icon : null

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader className="space-y-0 pb-4 border-b">
          <div className="flex justify-between items-center">
            <SheetTitle className="text-md font-normal flex items-center gap-2">
              {EventIcon && (
                <EventIcon className="h-5 w-5" style={{ color: eventTypeConfig[editedEvent.type]?.color }} />
              )}
              {editedEvent.type === EventType.BIRTHDAY ? "Birthday" : "Edit Event"}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6 px-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Event Title
            </Label>
            <Input
              id="title"
              value={editedEvent.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="h-9"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-500" />
              Date & Time
            </Label>
            <div className="bg-slate-50 dark:bg-slate-900 rounded-md p-3 text-sm">
              <div className="font-medium">{format(new Date(editedEvent.start), "EEEE, MMMM d, yyyy")}</div>
              <div className="text-slate-500 dark:text-slate-400 mt-1">
                {format(new Date(editedEvent.start), "h:mm a")} -{format(new Date(editedEvent.end), " h:mm a")}
              </div>
            </div>
          </div>

          {editedEvent.type !== EventType.BIRTHDAY && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Event Type</Label>
              <RadioGroup
                value={editedEvent.type}
                onValueChange={(value) => handleChange("type", value)}
                className="grid grid-cols-1 gap-2"
              >
                {Object.entries(eventTypeConfig)
                  .filter(([type]) => type !== EventType.BIRTHDAY && type !== EventType.HOLIDAY)
                  .map(([type, config]) => (
                    <div
                      key={type}
                      className={`flex items-center space-x-2 border rounded-md p-2 ${
                        editedEvent.type === type
                          ? "border-slate-400 bg-slate-50 dark:bg-slate-800 dark:border-slate-600"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      <RadioGroupItem value={type} id={type} className="sr-only" />
                      <Label htmlFor={type} className="flex items-center gap-2 text-sm cursor-pointer flex-1">
                        <div
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: config.color }}
                        ></div>
                        <div className="flex items-center gap-1.5">
                          {config.icon && <config.icon className="h-4 w-4" />}
                          <span>{config.label}</span>
                        </div>
                      </Label>
                    </div>
                  ))}
              </RadioGroup>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox
              id="important"
              checked={editedEvent.important}
              onCheckedChange={(checked) => handleChange("important", !!checked)}
            />
            <Label htmlFor="important" className="text-sm font-medium flex items-center gap-1">
              Mark as important
              <Star className="h-4 w-4 text-amber-500" />
            </Label>
          </div>

          <Button className="w-full h-9" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

