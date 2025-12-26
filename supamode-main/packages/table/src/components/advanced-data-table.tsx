import { useMemo } from "react";

import type {
  CellContext,
  ColumnDef,
  ColumnPinningState,
  Row,
  VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";

import type { ColumnMetadata, RelationConfig } from "@kit/types";

import { Button } from "@kit/ui/button";
import { Checkbox } from "@kit/ui/checkbox";
import { DataTable } from "@kit/ui/enhanced-data-table";
import { cn } from "@kit/ui/utils";

type DataItem = Record<string, unknown> | object;

export interface RelationData {
  column: string;
  original: unknown;
  formatted: string | null | undefined;
  link: string | null | undefined;
}

export interface ColumnManagementState {
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  toggleColumnVisibility: (columnId: string) => void;
  toggleColumnPin: (columnId: string, side?: "left" | "right") => void;
  isColumnPinned: (columnId: string) => "left" | "right" | false;
  resetPreferences: () => void;
}

export interface BatchSelectionState<T> {
  selectedIds: Set<string>;
  selectedRecords: Map<string, T>;
  selectedCount: number;
  isSelected: (id: string) => boolean;
  isAnySelected: boolean;
  isAllSelected: boolean;
  isSomeSelected: boolean;
  toggleSelection: (id: string) => void;
  toggleSelectAll: (selectAll: boolean) => void;
  clearSelection: () => void;
  getSelectedRecords: () => T[];
}

export interface AdvancedDataTableProps<RecordData extends DataItem> {
  // Core data
  columns: ColumnMetadata[];
  data: RecordData[];

  // Pagination
  pagination: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
  };

  onPaginationChange?: (pagination: {
    pageIndex: number;
    pageSize: number;
  }) => void;

  forcePagination?: boolean;

  columnManagement?: ColumnManagementState;
  batchSelection?: BatchSelectionState<RecordData>;

  // Sorting state
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (column: string) => void;

  buildRelationLink?: (
    record: RecordData,
    column: string,
  ) => RelationData | undefined;

  buildCellAction?: (record: RecordData) => string;

  onCellUpdate?: (
    record: RecordData,
    columnName: string,
    newValue: unknown,
  ) => Promise<void>;

  // Cell renderer injection
  CellRenderer?: React.ComponentType<{
    column: ColumnMetadata;
    value: unknown;
    action?: string;
    relationConfig?: RelationConfig;
    relation?: RelationData;
    onUpdate?: (data: Record<string, unknown>) => void;
  }>;

  // Feature toggles
  enableBatchSelection?: boolean;
  enableInlineEditing?: boolean;
  enableSorting?: boolean;

  // Configuration
  relationsConfig?: RelationConfig[];
  canDeleteRecord?: boolean;
  getRecordId: (record: RecordData) => string;

  // UI props
  className?: string;
  onRowClick?: (row: Row<DataItem>) => void;

  // Table props
  sticky?: boolean;

  tableProps?: Partial<React.ComponentProps<typeof DataTable>> &
    Record<`data-${string}`, string>;

  containerClassName?: string;
}

/**
 * Advanced Data Table - Pure UI component with dependency injection
 *
 * This component provides advanced table functionality while remaining
 * completely reusable through inversion of control patterns.
 */
export function AdvancedDataTable<RecordData extends DataItem>(
  props: AdvancedDataTableProps<RecordData>,
) {
  const {
    columns,
    data,
    pagination,
    onPaginationChange,
    forcePagination = false,
    columnManagement,
    batchSelection,
    sortColumn,
    sortDirection,
    onSortChange,
    buildRelationLink,
    buildCellAction,
    onCellUpdate,
    CellRenderer,
    enableBatchSelection = false,
    enableInlineEditing = false,
    enableSorting = true,
    relationsConfig = [],
    canDeleteRecord = false,
    getRecordId,
    className,
    onRowClick,
    sticky = false,
    tableProps,
    containerClassName,
  } = props;

  // Ensure select column is always first in left pinned columns
  const correctedColumnPinning = useMemo(() => {
    if (!columnManagement?.columnPinning) return undefined;

    const { left, right } = columnManagement.columnPinning;

    // If left has columns and includes 'select', ensure 'select' is first
    if (
      left &&
      left.length > 0 &&
      left.includes("select") &&
      left[0] !== "select"
    ) {
      return {
        left: ["select", ...left.filter((id) => id !== "select")],
        right,
      };
    }

    return columnManagement.columnPinning;
  }, [columnManagement?.columnPinning]);

  // Build table columns with advanced features
  const tableColumns = useMemo(() => {
    return (
      columns
        .filter((item) => item.is_visible_in_table)
        // Apply user visibility preferences if column management is available
        .filter((item) =>
          columnManagement
            ? columnManagement.columnVisibility[item.name] !== false
            : true,
        )
        .sort((a, b) => {
          if (!a.ordering) {
            return 1;
          }

          if (!b.ordering) {
            return -1;
          }

          return a.ordering - b.ordering;
        })
        .map((col) => {
          return {
            id: col.name,
            accessorKey: col.name,
            enablePinning: true,
            header: () => {
              // Only show sort UI for sortable columns when sorting is enabled
              if (col.is_sortable && enableSorting && onSortChange) {
                return (
                  <span
                    className="flex items-center gap-x-1"
                    onClick={() => onSortChange(col.name)}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 p-0 font-medium hover:bg-transparent"
                    >
                      <span>{col.display_name ?? col.name}</span>

                      {sortColumn === col.name && (
                        <div className="flex flex-col">
                          <ChevronUp
                            className={cn(
                              "h-3 w-3 ml-2",
                              sortDirection === "asc"
                                ? "text-foreground"
                                : "text-muted-foreground/50",
                            )}
                          />
                          <ChevronDown
                            className={cn(
                              "-mt-1 h-3 w-3 ml-2",
                              sortDirection === "desc"
                                ? "text-foreground"
                                : "text-muted-foreground/50",
                            )}
                          />
                        </div>
                      )}
                    </Button>
                  </span>
                );
              }

              return <span>{col.display_name ?? col.name}</span>;
            },
            cell: (cellContext: CellContext<RecordData, unknown>) => {
              const { row } = cellContext;

              // Get relation data if available
              const relation = buildRelationLink?.(row.original, col.name);

              // Find relation config
              const relationConfig = relationsConfig.find(
                (relation) => relation.source_column === col.name,
              );

              // Use injected cell renderer or default to simple display
              if (CellRenderer) {
                const action = buildCellAction?.(row.original);

                return (
                  <CellRenderer
                    column={col}
                    value={row.original[col.name as keyof typeof row.original]}
                    relation={relation}
                    relationConfig={relationConfig}
                    action={action}
                    onUpdate={
                      enableInlineEditing && onCellUpdate
                        ? (data) => {
                            onCellUpdate(
                              row.original,
                              col.name,
                              data[col.name],
                            );
                          }
                        : undefined
                    }
                  />
                );
              }

              // Default simple cell renderer
              const value = row.original[col.name as keyof typeof row.original];

              const text =
                value === null || value === undefined ? "—" : String(value);

              return (
                <span className="text-muted-foreground block w-max max-w-48 truncate text-xs">
                  {text}
                </span>
              );
            },
          };
        })
    );
  }, [
    columns,
    columnManagement,
    enableSorting,
    onSortChange,
    sortColumn,
    sortDirection,
    buildRelationLink,
    relationsConfig,
    CellRenderer,
    buildCellAction,
    enableInlineEditing,
    onCellUpdate,
  ]);

  // Add selection column if batch selection is enabled
  const columnsWithSelection = useMemo(() => {
    const columns = [...tableColumns];

    if (enableBatchSelection && batchSelection && canDeleteRecord) {
      const checkboxState = batchSelection.isAllSelected
        ? true
        : batchSelection.isSomeSelected
          ? "indeterminate"
          : false;

      const selectionColumn = {
        id: "select",
        accessorKey: "select",
        header: () => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={checkboxState}
              onCheckedChange={(checked) => {
                batchSelection.toggleSelectAll(!!checked);
              }}
            />
          </div>
        ),
        cell: (cellContext: CellContext<RecordData, unknown>) => {
          const { row } = cellContext;

          return (
            <label
              className="flex w-full justify-center"
              onClick={(e) => {
                e.stopPropagation(); // Prevent row click when clicking checkbox
              }}
            >
              <Checkbox
                checked={batchSelection.isSelected(getRecordId(row.original))}
                onCheckedChange={() => {
                  batchSelection.toggleSelection(getRecordId(row.original));
                }}
              />
            </label>
          );
        },
        meta: {
          className: "!p-0 border-b",
        },
        enableSorting: false,
        enableHiding: false,
        enablePinning: true,
        size: 28,
      };

      columns.unshift(selectionColumn as unknown as (typeof columns)[number]);
    }

    return columns as ColumnDef<DataItem>[];
  }, [
    enableBatchSelection,
    batchSelection,
    getRecordId,
    tableColumns,
    canDeleteRecord,
  ]);

  return (
    <DataTable
      sticky={sticky}
      className={className}
      columns={columnsWithSelection}
      data={data as DataItem[]}
      pageIndex={pagination.pageIndex}
      pageSize={pagination.pageSize}
      pageCount={pagination.pageCount}
      onPaginationChange={onPaginationChange}
      forcePagination={forcePagination}
      columnVisibility={columnManagement?.columnVisibility}
      columnPinning={correctedColumnPinning}
      onClick={onRowClick}
      containerClassName={containerClassName}
      onColumnVisibilityChange={
        columnManagement
          ? (visibility: VisibilityState) => {
              // Sync visibility changes to column management
              Object.entries(visibility).forEach(([col, visible]) => {
                if (columnManagement.columnVisibility[col] !== visible) {
                  columnManagement.toggleColumnVisibility(col);
                }
              });
            }
          : undefined
      }
      onColumnPinningChange={
        columnManagement
          ? (newPinning) => {
              const currentLeft = columnManagement.columnPinning.left || [];
              const currentRight = columnManagement.columnPinning.right || [];

              const newLeft = newPinning.left || [];
              const newRight = newPinning.right || [];

              // Find columns that were pinned/unpinned
              const addedToLeft = newLeft.filter(
                (id: string) => !currentLeft.includes(id),
              );

              const removedFromLeft = currentLeft.filter(
                (id: string) => !newLeft.includes(id),
              );

              const addedToRight = newRight.filter(
                (id: string) => !currentRight.includes(id),
              );

              const removedFromRight = currentRight.filter(
                (id: string) => !newRight.includes(id),
              );

              // Apply changes through column management interface
              [
                ...addedToLeft,
                ...removedFromLeft,
                ...addedToRight,
                ...removedFromRight,
              ].forEach((columnId: string) => {
                if (addedToLeft.includes(columnId)) {
                  columnManagement.toggleColumnPin(columnId, "left");
                } else if (addedToRight.includes(columnId)) {
                  columnManagement.toggleColumnPin(columnId, "right");
                } else {
                  // This column was removed, toggle it to unpin
                  columnManagement.toggleColumnPin(columnId);
                }
              });
            }
          : undefined
      }
      {...tableProps}
    />
  );
}
