import { ReactNode } from 'react';

import type { ColumnDef, Row } from '@tanstack/react-table';

import { cn } from '../lib/utils';
import { DataTable } from './data-table';
import { TableFiltersBar } from './table-filters-bar';

type DataItem = Record<string, unknown> | object;

interface TableWithSearchProps<TData extends DataItem> {
  columns: ColumnDef<TData>[];
  data: TData[];
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  showFilters?: boolean;
  onToggleFilters?: () => void;
  onClearFilters?: () => void;
  hasActiveFilters?: boolean;
  filters?: ReactNode;
  actions?: ReactNode;
  onRowClick?: (row: TData) => void;
  tableProps?: React.ComponentProps<typeof DataTable>;
  className?: string;
  filtersClassName?: string;
}

export function TableWithSearch<TData extends DataItem = DataItem>({
  columns,
  data,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  showFilters,
  onToggleFilters,
  onClearFilters,
  hasActiveFilters,
  filters,
  actions,
  onRowClick,
  tableProps,
  className,
  filtersClassName,
}: TableWithSearchProps<TData>) {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters Bar */}
      <TableFiltersBar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        searchPlaceholder={searchPlaceholder}
        showFilters={showFilters}
        onToggleFilters={onToggleFilters}
        onClearFilters={onClearFilters}
        hasActiveFilters={hasActiveFilters}
        actions={actions}
        filters={filters}
        className={filtersClassName}
      />

      <DataTable
        columns={columns as ColumnDef<DataItem>[]}
        data={data}
        onClick={
          onRowClick
            ? (row: Row<DataItem>) => onRowClick(row.original as TData)
            : undefined
        }
        {...tableProps}
      />
    </div>
  );
}
