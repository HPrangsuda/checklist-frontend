import { useState, useEffect } from 'react';
import type { VisibilityState } from '@tanstack/react-table';
import type { AcmeColumnDef } from '@/core/types/data-table';

interface UseColumnVisibilityProps {
  storageKey: string;
  defaultVisibility: VisibilityState;
}

export function useColumnVisibility({ storageKey, defaultVisibility }: UseColumnVisibilityProps) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...defaultVisibility, ...parsed };
      }
    } catch (error) {
      // Silently ignore errors
    }
    return defaultVisibility;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnVisibility));
    } catch (error) {
      // Silently ignore errors
    }
  }, [columnVisibility, storageKey]);

  return [columnVisibility, setColumnVisibility] as const;
} 
interface UseTableColumnVisibilityProps<T> {
  storageKey: string;
  columns: AcmeColumnDef<T>[];
}

export function useTableColumnVisibility<T>({ storageKey, columns }: UseTableColumnVisibilityProps<T>) {
  const defaultVisibility = Object.fromEntries(
    columns
      .filter(col => typeof col.id === 'string' && col.id.trim() !== '')
      .map(col => [col.id as string, col.visible !== false])
  );

  return useColumnVisibility({ storageKey, defaultVisibility });
}