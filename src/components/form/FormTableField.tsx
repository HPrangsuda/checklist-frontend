import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Database, ChevronRight, ChevronLeft, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { FieldWrapper } from "./FieldWrapper"

export interface TableColumn {
  key: string
  label: string
  render?: (value: any, row: any) => React.ReactNode
}

interface CustomBadgeProps {
  item: any
  onRemove: () => void
  displayKey?: string
}

interface TableSelectorInputProps {
  id?: string
  label?: string
  error?: string
  required?: boolean
  data: any[]
  columns: TableColumn[]
  pageSize?: number
  placeholder?: string
  limit?: number
  width?: number
  onSelectionChange?: (selectedItems: any[]) => void
  displayKey?: string
  searchKeys?: string[]
  className?: string
  value?: any | any[]
  customBadge?: (props: CustomBadgeProps) => React.ReactNode
}

export function TableSelectorInput({
  id,
  label,
  data,
  columns,
  placeholder = "Select items...",
  limit,
  width,
  pageSize = 10,
  onSelectionChange,
  displayKey = "name",
  searchKeys,
  error,
  required,
  className,
  value,
  customBadge,
}: TableSelectorInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedItems, setSelectedItems] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    if (value) {
      const initialSelected = Array.isArray(value)
        ? value
        : value.id
          ? [value]
          : []
      setSelectedItems(initialSelected)
    } else {
      setSelectedItems([])
    }
  }, [value])

  const filteredData = data.filter((item) => {
    if (!searchQuery) return true
    const keysToSearch =
      searchKeys ||
      Object.keys(item).filter((key) => typeof item[key] === "string")
    return keysToSearch.some((key) =>
      String(item[key]).toLowerCase().includes(searchQuery.toLowerCase())
    );
  })

  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = filteredData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const handleItemSelect = (item: any, checked: boolean) => {
    let newSelection: any[]
    if (checked) {
      if (!limit || selectedItems.length < limit) {
        newSelection = [...selectedItems, item]
      }
      else if (limit === 1) {
        newSelection = [item]
      }
      else {
        return;
      }
    } else {
      newSelection = selectedItems.filter((selected) => selected.id !== item.id);
    }
    setSelectedItems(newSelection);
    onSelectionChange?.(newSelection);
  }

  const handleSubmit = () => {
    onSelectionChange?.(selectedItems);
    setIsOpen(false);
    setSearchQuery("");
    setCurrentPage(1);
  }

  const isItemSelected = (item: any) => selectedItems.some((selected) => selected.id === item.id);

  const getDisplayValue = () => {
    if (selectedItems.length === 0) return "";
    if (selectedItems.length === 1) return String(selectedItems[0][displayKey]);
    return `${selectedItems.length} items selected`;
  }

  const resetDialog = () => {
    setSearchQuery("");
    setCurrentPage(1);
  }

  return (
    <FieldWrapper id={id} label={label} required={required} error={error}>
      <div className={`relative ${className}`}>
        <div className="relative">
          <Input
            value={getDisplayValue()}
            placeholder={placeholder}
            readOnly
            onClick={() => {
              resetDialog();
              setIsOpen(true);
            }}
            className="cursor-pointer pr-10 w-full"
          />
          <Database
            className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground cursor-pointer"
            onClick={() => {
              resetDialog();
              setIsOpen(true);
            }}
          />
        </div>

        {selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedItems.map((item) => {
              const onRemove = () => {
                const updated = selectedItems.filter((s) => s.id !== item.id);
                setSelectedItems(updated);
                onSelectionChange?.(updated);
              }
              if (customBadge) {
                return (
                  <div key={item.id}>
                    {customBadge({ item, onRemove, displayKey })}
                  </div>
                )
              }
              return (
                <Badge key={item.id} variant="secondary" className="flex items-center gap-1 px-2 py-1">
                  {item[displayKey]}
                  <button
                    type="button"
                    onClick={onRemove}
                    className="ml-1 text-red-500 hover:text-red-700 text-sm"
                    aria-label={`Remove ${item[displayKey]}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-h-[80vh] flex flex-col"
          style={{ maxWidth: width ? `${width}px` : '600px' }}
        >
          <DialogHeader>
            <DialogTitle className="font-normal text-md">
              Select Items
            </DialogTitle>
            <DialogDescription>
              Select items from the list below.
              {limit && ` (Maximum: ${limit} item${limit > 1 ? 's' : ''})`}
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-10"
            />
          </div>

          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span className={`text-sm ${limit && selectedItems.length >= limit ? "text-red-600" : "text-gray-700"}`}>
              {selectedItems.length} selected
              {limit && ` of ${limit} max`}
            </span>
            <span>{filteredData.length} total items</span>
          </div>

          <div className="flex-1 overflow-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <span className="sr-only">Select</span>
                  </TableHead>
                  {columns.map((column) => (
                    <TableHead key={column.key}>{column.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item) => {
                  const selected = isItemSelected(item)
                  const canSelect = !limit || selectedItems.length < limit || selected
                  return (
                    <TableRow
                      key={item.id}
                      className={selected ? "bg-muted/50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selected}
                          disabled={!canSelect}
                          onCheckedChange={(checked) =>
                            handleItemSelect(item, checked as boolean)
                          }
                        />
                      </TableCell>
                      {columns.map((column) => (
                        <TableCell key={column.key}>
                          {column.render
                            ? column.render(item[column.key], item)
                            : String(item[column.key] || "")}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                })}

                {paginatedData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={columns.length + 1} className="text-center py-6 text-muted-foreground">
                      {searchQuery ? "No items found matching your search." : "No items available."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex justify-between items-center mt-3">
            <div className="flex items-center gap-4">
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="flex items-center px-3 text-sm">
                    Page {currentPage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                Add {selectedItems.length > 0 && `(${selectedItems.length})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FieldWrapper>
  )
}