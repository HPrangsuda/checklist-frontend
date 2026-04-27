import type { ColumnDef, ColumnSort, Row, RowData } from "@tanstack/react-table";

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string;
    placeholder?: string;
    variant?: "text" | "number" | "dateRange" | "multiSelect" | "select" | "date" | "range";
    options?: Option[];
    range?: [number, number];
    unit?: string;
    icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  }
}

export interface Option {
  label: string;
  value: string;
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

export interface ExtendedColumnSort<TData> extends Omit<ColumnSort, "id"> {
  id: Extract<keyof TData, string>;
}

export interface DataTableRowAction<TData> {
  row: Row<TData>;
  variant: "update" | "delete";
}

export interface QueryParams {
  page: number
  pageSize: number
  sort?: string
  order?: 'asc' | 'desc'
  search?: string
  filters?: Record<string, string | string[]>
}

export type AcmeColumnDef<T> = ColumnDef<T> & { visible?: boolean };