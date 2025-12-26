'use client';

import type { ColumnDef, Row } from '@tanstack/react-table';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';

import { cn } from '../lib/utils/cn';
import { Trans } from '../makerkit/trans';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  tableProps?: Record<string, string>;
  className?: string;
  renderRow?: (
    row: Row<TData>,
  ) => (props: { children: React.ReactNode }) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  renderRow,
  className = '',
  tableProps = {},
}: DataTableProps<TData, TValue>) {
  // TODO: remove when https://github.com/TanStack/table/issues/5567 gets fixed
  'use no memo';

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className={cn('bg-background rounded-md border', className)}>
      <Table {...tableProps}>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => {
              const RowWrapper = renderRow ? renderRow(row) : TableRow;

              return (
                <RowWrapper
                  key={row.id}
                  data-row-id={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </RowWrapper>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                <Trans i18nKey={'common:noData'} />
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
