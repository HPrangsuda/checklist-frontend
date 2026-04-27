import type { Column, Table } from "@tanstack/react-table";
import { X, Plus, Import, FileDown, Search, RefreshCw, XCircle, Zap, Trash2 } from "lucide-react";
import { DataTableDateFilter } from "@/components/data-table/data-table-date-filter";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableSliderFilter } from "@/components/data-table/data-table-slider-filter";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/core/lib/utils";
import { useCallback, useMemo } from "react";
import { useTranslation } from "@/core/contexts/language-context";

interface DataTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  isSync?: boolean;
  isAdd?: boolean;
  isImport?: boolean;
  isExport?: boolean;
  isView?: boolean;
  isDelete?: boolean;
  isGenerate?: boolean;
  isServerSide?: boolean;
  breakpoint?: number;
  searchValue?: string;
  onSync?: () => void;
  onAdd?: () => void;
  onGenerate?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onSearch?: (value: string) => void;
}

export function DataTableToolbar<TData>({
  table,
  children,
  className,
  isSync = false,
  isAdd = false,
  isImport = false,
  isExport = false,
  isView = false,
  isDelete = false,
  isGenerate = false,
  isServerSide = false,
  breakpoint = 1300,
  searchValue,
  onSync,
  onAdd,
  onGenerate,
  onImport,
  onExport,
  onSearch,
  onDelete,
  ...props
}: DataTableToolbarProps<TData>) {
  const { t } = useTranslation();
  const isFiltered = table.getState().columnFilters.length > 0;
  const columns = useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const onReset = useCallback(() => {
    table.resetColumnFilters();
    if (onSearch) onSearch("");
  }, [table, onSearch]);

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      if (onSearch) {
        onSearch(value);
      }
      if (!isServerSide) {
        table.setGlobalFilter(value);
      }
    },
    [table, onSearch, isServerSide],
  );

  const handleClearSearch = useCallback(() => {
    if (onSearch) {
      onSearch("");
    }
    if (!isServerSide) {
      table.setGlobalFilter("");
    }
  }, [table, onSearch, isServerSide]);

  const ActionButtons = () => (
    <>
      {isDelete && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="h-8 px-3 whitespace-nowrap text-red-600 border-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t("Delete")}
        </Button>
      )}
      {isGenerate && (
        <Button
          variant="outline"
          size="sm"
          onClick={onGenerate}
          className="h-8 px-3 whitespace-nowrap"
        >
          <Zap className="mr-2 h-4 w-4" />
          {t("Generate")}
        </Button>
      )}
      {isSync && (
        <Button
          variant="outline"
          size="sm"
          onClick={onSync}
          className="h-8 px-3 whitespace-nowrap"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("Sync")}
        </Button>
      )}
      {isAdd && (
        <Button
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="h-8 px-3 whitespace-nowrap"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("Add")}
        </Button>
      )}
      {isImport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onImport}
          className="h-8 px-3 whitespace-nowrap"
        >
          <Import className="mr-2 h-4 w-4" />
          {t("Import")}
        </Button>
      )}
      {isExport && (
        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-8 px-3 whitespace-nowrap"
        >
          <FileDown className="mr-2 h-4 w-4" />
          {t("Export")}
        </Button>
      )}
      {isView && (
        <DataTableViewOptions table={table} />
      )}
    </>
  );

  return (
    <div
      role="toolbar"
      aria-orientation="vertical"
      className={cn("flex w-full flex-col gap-4 pt-1 pb-3", className)}
      {...props}>
      <div className="hidden xl:grid xl:grid-cols-[minmax(250px,300px)_1fr_auto] xl:items-center xl:gap-4">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("Search")}
            value={searchValue}
            onChange={handleSearch}
            className="w-full pl-8"
          />
          {searchValue && (
            <XCircle
              className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={handleClearSearch}
            />
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          {columns.map((column) => (
            <DataTableToolbarFilter key={column.id} column={column} />
          ))}
          {children}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <ActionButtons />
        </div>
      </div>

      {/* Responsive Layout (< xl) */}
      <div className="grid xl:hidden gap-4 grid-cols-[repeat(auto-fit,minmax(110px,1fr))]">
        {/* Search - Full Width */}
        <div className="relative col-span-full min-w-[250px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("Export")}
            value={searchValue}
            onChange={handleSearch}
            className="w-full pl-8 shadow-none"
          />
        </div>

        {/* Filters - Auto Grid */}
        <div className="col-span-full grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          {columns.map((column) => (
            <DataTableToolbarFilter key={column.id} column={column} />
          ))}
          {children}
          {isFiltered && (
            <Button
              aria-label={t("Reset filters")}
              variant="outline"
              size="sm"
              className="h-8 px-3 border-dashed whitespace-nowrap"
              onClick={onReset}>
              <X className="mr-2 h-4 w-4" />
              {t("Reset")}
            </Button>
          )}
        </div>

        {/* Action Buttons - Auto Grid */}
        <div className="col-span-full grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-4">
          {isGenerate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onGenerate}
              className="h-8 px-3 whitespace-nowrap"
            >
              <Zap className="mr-2 h-4 w-4" />
              {t("Generate")}
            </Button>
          )}
          {isAdd && (
            <Button
              variant="outline"
              size="sm"
              onClick={onAdd}
              className="h-8 px-3 whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" />
              {t("Add")}
            </Button>
          )}
          {isImport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onImport}
              className="h-8 px-3 whitespace-nowrap"
            >
              <Import className="mr-2 h-4 w-4" />
              {t("Import")}
            </Button>
          )}
          {isExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="h-8 px-3 whitespace-nowrap"
            >
              <FileDown className="mr-2 h-4 w-4" />
              {t("Export")}
            </Button>
          )}
          {isView && (
            <DataTableViewOptions table={table} />
          )}
        </div>
      </div>
    </div>
  );
}

interface DataTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

function DataTableToolbarFilter<TData>({
  column,
}: DataTableToolbarFilterProps<TData>) {
  {
    const columnMeta = column.columnDef.meta;

    const onFilterRender = useCallback(() => {
      if (!columnMeta?.variant) return null;

      switch (columnMeta.variant) {
        case "text":
          return (
            <Input
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(event) => column.setFilterValue(event.target.value)}
              className="h-8 w-40 lg:w-56"
            />
          );

        case "number":
          return (
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder={columnMeta.placeholder ?? columnMeta.label}
                value={(column.getFilterValue() as string) ?? ""}
                onChange={(event) => column.setFilterValue(event.target.value)}
                className={cn("h-8 w-[120px]", columnMeta.unit && "pr-8")}
              />
              {columnMeta.unit && (
                <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                  {columnMeta.unit}
                </span>
              )}
            </div>
          );

        case "range":
          return (
            <DataTableSliderFilter
              column={column}
              title={columnMeta.label ?? column.id}
            />
          );

        case "date":
        case "dateRange":
          return (
            <DataTableDateFilter
              column={column}
              title={columnMeta.label ?? column.id}
              multiple={columnMeta.variant === "dateRange"}
            />
          );

        case "select":
        case "multiSelect":
          return (
            <DataTableFacetedFilter
              column={column}
              title={columnMeta.label ?? column.id}
              options={columnMeta.options ?? []}
              multiple={columnMeta.variant === "multiSelect"}
            />
          );

        default:
          return null;
      }
    }, [column, columnMeta]);
    return onFilterRender();
  }
}