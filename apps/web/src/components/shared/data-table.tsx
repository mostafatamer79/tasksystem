'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from './empty-state';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
  sortable?: boolean;
  sortKey?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (sortKey: string) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  emptyTitle,
  emptyDescription,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  selectable,
  selectedKeys = new Set(),
  onSelectionChange,
}: DataTableProps<T>) {
  const t = useTranslations('Common');

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (selectedKeys.size === data.length && data.length > 0) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(data.map(rowKey)));
    }
  };

  const toggleRow = (key: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    onSelectionChange(next);
  };

  return (
    <div className="glass overflow-x-auto rounded-2xl shadow-soft">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            {selectable && (
              <th className="px-4 py-3 text-left w-12">
                <input
                  type="checkbox"
                  className="rounded border-input text-primary focus:ring-primary cursor-pointer"
                  checked={data.length > 0 && selectedKeys.size === data.length}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                  col.className,
                )}
              >
                {col.sortable && onSort ? (
                  <button
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground cursor-pointer"
                    onClick={() => onSort(col.sortKey ?? col.key)}
                  >
                    {col.header}
                    <span
                      className={cn(
                        'text-[9px] transition-opacity',
                        sortBy === (col.sortKey ?? col.key) ? 'opacity-100' : 'opacity-0',
                      )}
                    >
                      {sortOrder === 'asc' ? '▲' : '▼'}
                    </span>
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b last:border-0">
                  {selectable && <td className="px-4 py-3.5"><Skeleton className="h-4 w-4 rounded" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <Skeleton className="h-4 w-full max-w-[140px]" />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row, i) => {
                const key = rowKey(row);
                return (
                  <motion.tr
                    key={key}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.35), duration: 0.3 }}
                    className={cn(
                      'border-b last:border-0 transition-colors hover:bg-accent/50',
                      onRowClick && 'cursor-pointer',
                      selectedKeys.has(key) && 'bg-primary/5 hover:bg-primary/10'
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-input text-primary focus:ring-primary cursor-pointer"
                          checked={selectedKeys.has(key)}
                          onChange={() => toggleRow(key)}
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-4 py-3.5', col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
        </tbody>
      </table>
      {!loading && data.length === 0 && (
        <EmptyState title={emptyTitle ?? t('nothingHere')} description={emptyDescription} className="py-14" />
      )}
    </div>
  );
}
