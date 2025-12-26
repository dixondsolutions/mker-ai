'use client';

import { useCallback, useRef, useState } from 'react';
import { useEffect } from 'react';
import { useMemo } from 'react';

import { useSearchParams } from 'react-router';

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type {
  ColumnDef,
  ColumnFiltersState,
  ColumnPinningState,
  PaginationState,
  Table as ReactTable,
  Row,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

import { cn } from '../lib/utils/cn';
import { Button } from '../shadcn/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../shadcn/table';
import { If } from './if.tsx';
import { Trans } from './trans';

type DataItem = Record<string, unknown> | object;

interface ReactTableProps<T extends DataItem> {
  data: T[];
  columns: ColumnDef<T>[];
  renderSubComponent?: (props: { row: Row<T> }) => React.ReactElement;
  pageIndex?: number;
  className?: string;
  pageSize?: number;
  pageCount?: number;
  sorting?: SortingState;
  columnVisibility?: VisibilityState;
  columnPinning?: ColumnPinningState;
  getRowId?: (row: T) => string;
  onPaginationChange?: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onColumnVisibilityChange?: (visibility: VisibilityState) => void;
  onColumnPinningChange?: (pinning: ColumnPinningState) => void;
  onClick?: (row: Row<T>) => void;
  tableProps?: React.ComponentProps<typeof Table> &
    Record<`data-${string}`, string>;
  sticky?: boolean;
  renderRow?: (props: {
    row: Row<T>;
    onClick?: (row: Row<T>) => void;
    className?: string;
  }) => (props: React.PropsWithChildren<object>) => React.ReactNode;
  noResultsMessage?: React.ReactNode;
  containerClassName?: string;
  forcePagination?: boolean; // Force pagination to show even when pageCount <= 1
}

export function DataTableContainer({
  children,
  className,
}: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div
      className={cn(
        'bg-background flex flex-1 flex-col rounded-lg border p-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function DataTable<RecordData extends DataItem>({
  data,
  columns,
  pageIndex,
  pageSize,
  pageCount,
  getRowId,
  onPaginationChange,
  onSortingChange,
  onColumnVisibilityChange,
  onColumnPinningChange,
  onClick,
  tableProps,
  className,
  renderRow,
  noResultsMessage,
  sorting: initialSorting,
  columnVisibility: initialColumnVisibility,
  columnPinning: initialColumnPinning,
  sticky = false,
  containerClassName,
}: ReactTableProps<RecordData>) {
  // TODO: remove when https://github.com/TanStack/table/issues/5567 gets fixed
  'use no memo';

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: pageIndex ?? 0,
    pageSize: pageSize ?? 15,
  });

  const scrollableDivRef = useRef<HTMLTableElement>(null);

  const [sorting, setSorting] = useState<SortingState>(initialSorting ?? []);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    initialColumnVisibility ?? {},
  );

  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
    initialColumnPinning ?? { left: [], right: [] },
  );

  if (pagination.pageIndex !== pageIndex && pageIndex !== undefined) {
    setPagination({
      pageIndex,
      pageSize: pagination.pageSize,
    });
  }

  useEffect(() => {
    if (initialColumnVisibility !== undefined) {
      setColumnVisibility(initialColumnVisibility);
    }
  }, [initialColumnVisibility]);

  useEffect(() => {
    if (initialColumnPinning !== undefined) {
      setColumnPinning(initialColumnPinning);
    }
  }, [initialColumnPinning]);

  const [rowSelection, setRowSelection] = useState({});
  const navigateToPage = useNavigateToNewPage();

  const table = useReactTable({
    data,
    getRowId: getRowId,
    columns,
    getCoreRowModel: getCoreRowModel(),
    enableColumnPinning: true,
    manualPagination: true,
    manualSorting: true,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === 'function') {
        const nextState = updater(columnVisibility);
        setColumnVisibility(nextState);

        if (onColumnVisibilityChange) {
          onColumnVisibilityChange(nextState);
        }
      } else {
        setColumnVisibility(updater);

        if (onColumnVisibilityChange) {
          onColumnVisibilityChange(updater);
        }
      }
    },
    onColumnPinningChange: (updater) => {
      if (typeof updater === 'function') {
        const nextState = updater(columnPinning);
        setColumnPinning(nextState);

        if (onColumnPinningChange) {
          onColumnPinningChange(nextState);
        }
      } else {
        setColumnPinning(updater);

        if (onColumnPinningChange) {
          onColumnPinningChange(updater);
        }
      }
    },
    onRowSelectionChange: setRowSelection,
    pageCount,
    state: {
      pagination,
      sorting,
      columnFilters,
      columnVisibility,
      columnPinning,
      rowSelection,
    },
    onSortingChange: (updater) => {
      if (typeof updater === 'function') {
        const nextState = updater(sorting);

        setSorting(nextState);

        if (onSortingChange) {
          onSortingChange(nextState);
        }
      } else {
        setSorting(updater);

        if (onSortingChange) {
          onSortingChange(updater);
        }
      }
    },
    onPaginationChange: (updater) => {
      const navigate = (page: number) => setTimeout(() => navigateToPage(page));

      if (typeof updater === 'function') {
        setPagination((prevState) => {
          const nextState = updater(prevState);

          if (onPaginationChange) {
            onPaginationChange(nextState);
          } else {
            navigate(nextState.pageIndex);
          }

          return nextState;
        });
      } else {
        setPagination(updater);

        if (onPaginationChange) {
          onPaginationChange(updater);
        } else {
          navigate(updater.pageIndex);
        }
      }
    },
  });

  const { isScrolledY, classNameTop, classNameBottom, canScrollBottom } =
    useScrollableDivShadow(scrollableDivRef, data.length);

  const rows = table.getRowModel().rows;

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <If condition={rows.length === 0}>
        <span className="text-muted-foreground p-2 text-xs">
          {noResultsMessage || <Trans i18nKey={'common:noData'} />}
        </span>
      </If>

      <Table
        data-testid="data-table"
        {...tableProps}
        ref={scrollableDivRef}
        containerClassName={containerClassName}
        className={cn(
          'bg-background border-collapse border-spacing-0',
          className,
        )}
      >
        <TableHeader
          className={cn(
            'outline-border bg-background/70 outline backdrop-blur-md',
            {
              ['sticky top-0 z-10 transition-all duration-300']: sticky,
              [classNameTop]: sticky && isScrolledY,
            },
          )}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-initial h-11">
              {headerGroup.headers.map((header, index) => {
                const isPinned = header.column.getIsPinned();
                const size = header.column.getSize();

                // Calculate proper left offset for pinned columns
                const left = isPinned
                  ? headerGroup.headers
                      .slice(0, index)
                      .filter((h) => h.column.getIsPinned() === isPinned)
                      .reduce((acc, h) => acc + h.column.getSize(), 0)
                  : undefined;

                return (
                  <TableHead
                    key={header.id}
                    className={cn('border-transparent font-bold', {
                      ['border-r-background bg-background/60 sticky top-0 z-10 border-r backdrop-blur-sm']:
                        isPinned,
                      ['relative z-0']: !isPinned,
                      ['px-0']: header.id === 'select',
                      ['hover:bg-muted/50 active:bg-muted cursor-pointer transition-colors duration-100']:
                        header.column.getCanSort(),
                    })}
                    colSpan={header.colSpan}
                    style={{
                      width: `${size}px`,
                      minWidth: `${size}px`,
                      left,
                    }}
                  >
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
          {rows.map((row) => {
            const RowWrapper = renderRow
              ? renderRow({ row, onClick })
              : TableRow;

            const isLastRow = row.index === rows.length - 1;

            const children = row.getVisibleCells().map((cell, index) => {
              const isPinned = cell.column.getIsPinned();
              const size = cell.column.getSize();

              // Calculate proper left offset for pinned columns
              const left = isPinned
                ? row
                    .getVisibleCells()
                    .slice(0, index)
                    .filter((c) => c.column.getIsPinned() === isPinned)
                    .reduce((acc, c) => acc + c.column.getSize(), 0)
                : undefined;

              const className = cn(
                (cell.column.columnDef?.meta as { className?: string })
                  ?.className,
                [],
                {
                  ['border-r-border group-hover/row:bg-muted/50 bg-background/60 sticky z-[1] border-r backdrop-blur-sm']:
                    isPinned,
                  ['relative z-0']: !isPinned,
                },
              );

              return (
                <TableCell
                  style={{
                    left,
                    width: `${size}px`,
                    minWidth: `${size}px`,
                  }}
                  key={cell.id}
                  className={className}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              );
            });

            return (
              <RowWrapper
                className={cn(
                  'active:bg-accent bg-background/80 border-border/80 h-11',
                  {
                    ['hover:bg-accent/60 cursor-pointer']: !row.getIsSelected(),
                    ['!border-b']: isLastRow,
                  },
                )}
                onClick={() => onClick && onClick(row)}
                key={row.id}
                data-state={row.getIsSelected() && 'selected'}
              >
                {children}
              </RowWrapper>
            );
          })}
        </TableBody>
      </Table>

      <div
        className={cn('z-10 border-t', classNameBottom, {
          ['sticky bottom-0 z-10 max-w-full rounded-none']: sticky,
        })}
        style={
          sticky && canScrollBottom
            ? {
                boxShadow:
                  '0 -20px 25px -5px var(--tw-shadow-color, rgb(0 0 0 / 0.08)), 0 8px 10px -6px var(--tw-shadow-color, rgb(0 0 0 / 0.08))',
              }
            : {}
        }
      >
        <div>
          <div className={'px-2.5 py-1.5'}>
            <Pagination table={table} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Pagination<T>({
  table,
}: React.PropsWithChildren<{
  table: ReactTable<T>;
}>) {
  return (
    <div className="flex items-center space-x-4">
      <span className="text-muted-foreground flex items-center text-xs">
        <Trans
          i18nKey={'common:pageOfPages'}
          values={{
            page: table.getState().pagination.pageIndex + 1,
            total: table.getPageCount() || 1,
          }}
        />
      </span>

      <div className="flex items-center space-x-1">
        <Button
          type="button"
          className={'h-6 w-6'}
          size={'icon'}
          variant={'outline'}
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronsLeft className={'h-4'} />
        </Button>

        <Button
          type="button"
          className={'h-6 w-6'}
          size={'icon'}
          variant={'outline'}
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className={'h-4'} />
        </Button>

        <Button
          type="button"
          className={'h-6 w-6'}
          size={'icon'}
          variant={'outline'}
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          <ChevronRight className={'h-4'} />
        </Button>

        <Button
          type="button"
          className={'h-6 w-6'}
          size={'icon'}
          variant={'outline'}
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
        >
          <ChevronsRight className={'h-4'} />
        </Button>
      </div>
    </div>
  );
}

/**
 * Navigates to a new page using the provided page index and optional page parameter.
 */
function useNavigateToNewPage(
  props: { pageParam?: string } = {
    pageParam: 'page',
  },
) {
  const [, setSearchParams] = useSearchParams();
  const param = props.pageParam ?? 'page';

  return useCallback(
    (pageIndex: number) => {
      setSearchParams((params) => {
        const newParams = new URLSearchParams(params);
        newParams.set(param, String(pageIndex + 1));
        return newParams;
      });
    },
    [param, setSearchParams],
  );
}

function useScrollableDivShadow(
  scrollableDivRef: React.RefObject<HTMLElement | null>,
  dataLength: number,
) {
  const subject$ = useMemo(
    () =>
      new Subject<{
        isScrolledY: boolean;
        isScrolledX: boolean;
        canScrollBottom: boolean;
      }>(),
    [],
  );

  const [isScrolledTop, setIsScrolledTop] = useState(false);
  const [isCanScrolledBottom, setCanScrolledBottom] = useState(false);
  const [isScrolledX, setIsScrolledX] = useState(false);

  useEffect(() => {
    // scrollable area
    const element = (scrollableDivRef?.current as HTMLElement)?.parentElement;

    if (!element) {
      return;
    }

    const subscription = subject$
      .pipe(debounceTime(50), distinctUntilChanged())
      .subscribe(({ isScrolledY, isScrolledX, canScrollBottom }) => {
        setIsScrolledTop(isScrolledY);
        setIsScrolledX(isScrolledX);
        setCanScrolledBottom(canScrollBottom);
      });

    const eventHandler = () => {
      subject$.next({
        isScrolledY: element.scrollTop > 0,
        isScrolledX: element.scrollLeft > 0,
        canScrollBottom:
          element.scrollHeight > element.scrollTop + element.clientHeight + 1,
      });
    };

    element.addEventListener('scroll', eventHandler);

    // Initial check
    eventHandler();

    return () => {
      subscription.unsubscribe();
      element.removeEventListener('scroll', eventHandler);
    };
  }, [scrollableDivRef, subject$, dataLength]);

  // Cleanup the subject when component unmounts
  useEffect(() => {
    return () => {
      subject$.complete();
    };
  }, [subject$]);

  return {
    isScrolledY: isScrolledTop,
    isScrolledX,
    canScrollBottom: isCanScrolledBottom,
    classNameTop: cn(
      'transition-all duration-300',
      isScrolledTop && 'dark:shadow-primary/20 shadow-xl',
    ),
    classNameBottom: cn(
      'transition-all duration-300',
      isCanScrolledBottom && 'dark:shadow-primary/20',
    ),
  };
}
