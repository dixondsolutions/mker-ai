import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useFetcher, useNavigate } from 'react-router';

import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { GripVertical, SettingsIcon } from 'lucide-react';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';

import { useBatchSelection } from '@kit/shared/hooks';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { DataTable, DataTableContainer } from '@kit/ui/enhanced-data-table';
import { If } from '@kit/ui/if';
import { Switch } from '@kit/ui/switch';
import { TableRow } from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { useReorderProtection } from '../../hooks/use-reorder-protection';
import { BatchActionsToolbar } from '../shared/batch-actions-toolbar';
import {
  BatchEditColumnsDialog,
  BatchEditField,
} from '../shared/batch-edit-dialog';

type TableData = {
  schemaName: string;
  tableName: string;
  displayName: string | null;
  isVisible: boolean | null;
  ordering: number | null;
};

type TablesTableProps = {
  data: TableData[];
  canUpdate: boolean;
};

interface DraggableRowProps {
  row: Row<TableData>;
  children: React.ReactNode;
  onClick?: (row: DraggableRowProps['row']) => void;
  className?: string;
}

export function TablesTable({ data, canUpdate }: TablesTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const initialConfig = useMemo(() => {
    if (!data) return [];

    // Sort initial data by ordering
    return [...data].sort((a, b) => {
      const aOrder = a.ordering ?? 0;
      const bOrder = b.ordering ?? 0;

      return aOrder - bOrder;
    });
  }, [data]);

  const [tables, setTables] = useState(initialConfig);
  const [originalTablesConfig, setOriginalTablesConfig] =
    useState(initialConfig);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const queryClient = useQueryClient();

  const { isReordering, startReordering, finishReordering } =
    useReorderProtection();

  const fetcher = useFetcher<{
    success: boolean;
    message: string;
    data: TableData[];
  }>();

  const batchSelection = useBatchSelection(tables, getId);

  // Track if there are unsaved changes
  const hasUnsavedChanges = useMemo(
    () => !isEqual(tables, originalTablesConfig),
    [tables, originalTablesConfig],
  );

  const isSubmitting = fetcher.state === 'submitting';

  // Handle toggle changes for inline editing
  const handleToggleChange = useCallback(
    (tableId: string, value: boolean) => {
      if (!canUpdate) {
        return;
      }

      // Clear batch selection when making inline changes
      if (batchSelection.selectedCount > 0) {
        batchSelection.clearSelection();
      }

      setTables((prev) =>
        prev.map((table) =>
          getId(table) === tableId ? { ...table, isVisible: value } : table,
        ),
      );
    },
    [canUpdate, batchSelection],
  );

  const columns: ColumnDef<TableData>[] = useMemo(
    () => [
      ...(canUpdate
        ? [
            {
              id: 'drag-handle',
              header: '',
              cell: ({ row }) => (
                <RowDragHandleCell rowId={getId(row.original)} />
              ),
              meta: {
                className: 'pl-2 justify-center',
              },
              maxSize: 30,
              enableSorting: false,
              enableHiding: false,
            } satisfies ColumnDef<TableData>,
            {
              id: 'select',
              header: ({ table }) => (
                <label className="flex justify-center">
                  <Checkbox
                    checked={
                      table.getIsAllPageRowsSelected() ||
                      (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) => {
                      if (value) {
                        table.toggleAllPageRowsSelected(true);
                        batchSelection.toggleSelectAll(true);
                      } else {
                        table.toggleAllPageRowsSelected(false);
                        batchSelection.toggleSelectAll(false);
                      }
                    }}
                  />
                </label>
              ),
              cell: ({ row }) => (
                <label
                  className="flex items-center justify-center rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Checkbox
                    checked={batchSelection.isSelected(getId(row.original))}
                    onCheckedChange={(value) => {
                      const tableId = getId(row.original);
                      batchSelection.toggleSelection(tableId);
                      row.toggleSelected(!!value);
                    }}
                  />
                </label>
              ),
              size: 28,
              meta: {
                className: 'px-0',
              },
              enableSorting: false,
              enableHiding: false,
            } satisfies ColumnDef<TableData>,
          ]
        : []),
      {
        id: 'displayName',
        header: () => <Trans i18nKey="settings:table.displayName" />,
        cell: ({ row }) => (
          <span data-testid="table-name-header">
            {row.original.displayName}
          </span>
        ),
      },
      {
        accessorKey: 'schemaName',
        header: () => <Trans i18nKey="settings:table.schemaName" />,
        maxSize: 50,
      },
      {
        accessorKey: 'tableName',
        header: () => <Trans i18nKey="settings:table.tableName" />,
      },
      {
        accessorKey: 'isVisible',
        header: () => <Trans i18nKey="settings:table.visibility" />,
        cell: ({ row }) => {
          const original = originalTablesConfig.find(
            (table) => getId(table) === getId(row.original),
          );
          return (
            <ToggleCell
              value={row.original.isVisible ?? false}
              onToggle={(value) =>
                handleToggleChange(getId(row.original), value)
              }
              disabled={!canUpdate || isSubmitting}
              isChanged={original?.isVisible !== row.original.isVisible}
            />
          );
        },
        meta: {
          className: '!p-2',
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const table = row.original;

          return (
            <div className="flex justify-end">
              <If condition={canUpdate}>
                <Button
                  data-testid="configure-table-button"
                  variant="outline"
                  size="sm"
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link to={`/settings/resources/${getId(table)}?edit=true`}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <Trans i18nKey="settings:table.configureTable" />
                  </Link>
                </Button>
              </If>
            </div>
          );
        },
      },
    ],
    [
      batchSelection,
      canUpdate,
      originalTablesConfig,
      handleToggleChange,
      isSubmitting,
    ],
  );

  // Save changes to the server
  const handleSave = useCallback(() => {
    const payload = tables.map((item) => ({
      table: item.tableName,
      schema: item.schemaName,
      isVisible: item.isVisible ?? false,
      ordering: item.ordering ?? 0,
    }));

    fetcher.submit(
      JSON.stringify({
        intent: 'update-tables-metadata' as const,
        data: payload,
      }),
      {
        method: 'POST',
        encType: 'application/json',
      },
    );
  }, [tables, fetcher]);

  // Revert changes to the original state
  const handleRevert = useCallback(() => {
    setTables(originalTablesConfig);
  }, [originalTablesConfig]);

  // Track last save to update original config
  const lastSavedRef = useRef(false);

  useEffect(() => {
    const justSaved = fetcher.state === 'idle' && fetcher.data?.success;

    if (justSaved && !lastSavedRef.current) {
      // Save succeeded, update the original config
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOriginalTablesConfig(tables);
      lastSavedRef.current = true;
    } else if (!justSaved && lastSavedRef.current) {
      // Reset the flag when fetcher becomes active again
      lastSavedRef.current = false;
    }
  }, [fetcher.state, fetcher.data?.success, tables]);

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  const batchEditFields: BatchEditField[] = useMemo(
    () => [
      {
        key: 'isVisible',
        label: t('settings:table.visible'),
        description: t('settings:table.visibleDescription'),
        defaultValue: true,
      },
    ],
    [t],
  );

  const handleBatchEdit = useCallback(
    (values: Record<string, boolean>) => {
      setTables((prev) => {
        const updatedTables = prev.map((table) => {
          const tableId = getId(table);

          if (batchSelection.selectedIds.has(tableId)) {
            return { ...table, isVisible: values['isVisible'] ?? null };
          }

          return table;
        });

        return updatedTables;
      });

      const payload = tables.map((item) => ({
        table: item.tableName,
        schema: item.schemaName,
        isVisible: values['isVisible'] ?? item.isVisible ?? false,
        ordering: item.ordering ?? 0,
      }));

      fetcher.submit(
        JSON.stringify({
          intent: 'update-tables-metadata' as const,
          data: payload,
        }),
        {
          method: 'POST',
          encType: 'application/json',
        },
      );

      // Clear selection after batch action
      batchSelection.clearSelection();
    },
    [batchSelection, tables, fetcher],
  );

  const selectedTableNames = useMemo(() => {
    return tables
      .filter((table) => batchSelection.selectedIds.has(getId(table)))
      .map((table) => table.displayName || table.tableName);
  }, [tables, batchSelection.selectedIds]);

  const handleDragStart = useCallback(
    (_: DragStartEvent) => {
      startReordering();
    },
    [startReordering],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (!active?.id || !over?.id || active.id === over.id) {
        finishReordering();
        return;
      }

      // Clear batch selection when reordering
      if (batchSelection.selectedCount > 0) {
        batchSelection.clearSelection();
      }

      setTables((prev) => {
        const newTablesConfig = [...prev];

        // Find the indices of the active and over items
        const activeIndex = newTablesConfig.findIndex(
          (item) => getId(item) === String(active.id),
        );
        const overIndex = newTablesConfig.findIndex(
          (item) => getId(item) === String(over.id),
        );

        if (activeIndex === -1 || overIndex === -1) {
          finishReordering();
          return prev;
        }

        // Move the active item to the over position (like arrayMove from dnd-kit)
        const [movedItem] = newTablesConfig.splice(activeIndex, 1);
        if (movedItem) {
          newTablesConfig.splice(overIndex, 0, movedItem);
        }

        // Reassign ordering values based on new positions
        newTablesConfig.forEach((item, index) => {
          item.ordering = index + 1;
        });

        return newTablesConfig;
      });

      finishReordering();
    },
    [finishReordering, batchSelection],
  );

  useEffect(() => {
    // Handle fetcher success to update navigation
    if (fetcher.data?.success && fetcher.data.data) {
      // Sort tables by ordering to ensure correct order
      const sortedTables = [...fetcher.data.data].sort((a, b) => {
        const aOrder = a.ordering ?? 0;
        const bOrder = b.ordering ?? 0;
        return aOrder - bOrder;
      });

      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTables(sortedTables);

      setOriginalTablesConfig(sortedTables);

      queryClient.invalidateQueries({ queryKey: ['navigation'] });

      // Call finishReordering after successful save
      if (isReordering) {
        finishReordering();
      }
    }
  }, [fetcher.data, finishReordering, isReordering, queryClient]);

  // update the tables config when the data changes
  useEffect(() => {
    const newConfig = initialConfig;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTables(newConfig);

    setOriginalTablesConfig(newConfig);
  }, [initialConfig]);

  return (
    <div className="space-y-4">
      <If condition={hasUnsavedChanges || batchSelection.selectedCount > 0}>
        <BatchActionsToolbar
          className="animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-32 z-10 w-full rounded-lg border px-4"
          selectedCount={hasUnsavedChanges ? 0 : batchSelection.selectedCount}
          onClearSelection={
            hasUnsavedChanges ? handleRevert : batchSelection.clearSelection
          }
          selectedItemsLabel={
            hasUnsavedChanges
              ? 'settings:table.unsavedChanges'
              : 'settings:table.selectedTables'
          }
          {...(hasUnsavedChanges
            ? {
                actions: [
                  {
                    label: 'common:save',
                    variant: 'default' as const,
                    onClick: handleSave,
                  },
                ],
              }
            : {
                onBatchEdit: () => setBatchEditOpen(true),
              })}
        />
      </If>

      <BatchEditColumnsDialog
        open={batchEditOpen}
        onOpenChange={setBatchEditOpen}
        title={t('settings:table.batchEditTables')}
        description={t('settings:table.batchEditTablesDescription')}
        selectedCount={batchSelection.selectedCount}
        selectedItems={selectedTableNames}
        fields={batchEditFields}
        onSave={handleBatchEdit}
      />

      <DataTableContainer>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={tables.map((item) => getId(item))}
            strategy={verticalListSortingStrategy}
          >
            <DataTable
              columns={columns}
              getRowId={(row) => getId(row)}
              data={tables}
              columnPinning={{
                left: ['drag-handle', 'select'],
              }}
              sorting={[{ id: 'ordering', desc: true }]}
              sticky={true}
              onClick={(row) => {
                return navigate(`/settings/resources/${getId(row.original)}`);
              }}
              renderRow={({ row, onClick, className }) =>
                // eslint-disable-next-line react/display-name
                ({ children }) => (
                  <DraggableRow
                    row={row}
                    onClick={onClick}
                    className={className}
                  >
                    {children}
                  </DraggableRow>
                )}
              tableProps={{
                'data-testid': 'resources-table',
              }}
            />
          </SortableContext>
        </DndContext>
      </DataTableContainer>
    </div>
  );
}

function DraggableRow({
  row,
  children,
  onClick,
  className,
}: DraggableRowProps) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: getId(row.original),
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        transition,
        opacity: isDragging ? 0.8 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 1 : 0,
      }
    : undefined;

  return (
    <TableRow
      className={cn(className, {
        'hover:bg-accent/60 active:bg-muted cursor-pointer':
          !isDragging && onClick,
      })}
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        // Don't trigger row click if clicking on interactive elements
        const target = e.target as HTMLElement;
        if (
          target.closest('button') ||
          target.closest('[role="switch"]') ||
          target.closest('input[type="checkbox"]') ||
          target.closest('label')
        ) {
          return;
        }

        if (onClick) {
          onClick(row);
        }
      }}
    >
      {children}
    </TableRow>
  );
}

interface ToggleCellProps {
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
  isChanged?: boolean;
}

function ToggleCell({ value, onToggle, disabled, isChanged }: ToggleCellProps) {
  return (
    <div
      className="flex items-center justify-start gap-2"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
      }}
    >
      <Switch
        checked={value}
        onCheckedChange={onToggle}
        disabled={disabled}
        data-testid="table-visibility-toggle"
      />
      {isChanged && (
        <div
          className="h-2 w-2 rounded-full bg-orange-500"
          title="Unsaved change"
        />
      )}
    </div>
  );
}

/**
 * Get the id of a table by combining the schema name and table name
 * @param row
 * @returns
 */
function getId(row: { schemaName: string; tableName: string }) {
  return `${row.schemaName}/${row.tableName}`;
}

// Cell Component for drag handle
function RowDragHandleCell({ rowId }: { rowId: string }) {
  const { attributes, listeners } = useSortable({
    id: rowId,
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      className="hover:bg-muted h-8 w-8 cursor-grab p-0"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4.5 w-4.5" />
    </Button>
  );
}
