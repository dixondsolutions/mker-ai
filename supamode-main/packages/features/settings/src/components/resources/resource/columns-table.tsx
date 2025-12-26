import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { SubmitTarget, useFetcher } from 'react-router';

import {
  DndContext,
  DragEndEvent,
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
import type { ColumnDef, Row } from '@tanstack/react-table';
import { CheckIcon, GripVertical, XIcon } from 'lucide-react';
import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';

import { tableMetadataLoader } from '@kit/settings/loaders';
import { useBatchSelection } from '@kit/shared/hooks';
import { ColumnMetadata } from '@kit/types';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { DataTypeIcon } from '@kit/ui/datatype-icon';
import { DataTable, DataTableContainer } from '@kit/ui/enhanced-data-table';
import { If } from '@kit/ui/if';
import { Switch } from '@kit/ui/switch';
import { TableRow } from '@kit/ui/table';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { BatchActionsToolbar } from '../../shared/batch-actions-toolbar';
import {
  BatchEditColumnsDialog,
  BatchEditField,
} from '../../shared/batch-edit-dialog';
import { EditColumnMetadataDialog } from './edit-column-metadata-dialog';

type ResourceColumnsTableProps = {
  data: Awaited<ReturnType<typeof tableMetadataLoader>>['data'];
  canUpdate: boolean;
};

export function ResourceColumnsTable({
  data,
  canUpdate,
}: ResourceColumnsTableProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [batchEditOpen, setBatchEditOpen] = useState(false);
  const { t } = useTranslation();

  const fetcher = useFetcher<{
    success: boolean;
    message: string;
    data: ColumnMetadata[];
  }>();

  const initialConfig = useMemo(
    () => setInitialColumnsConfig(Object.values(data.columnsConfig)),
    [data.columnsConfig],
  );

  const [columnsConfig, setColumnsConfig] = useState(initialConfig);
  const [originalColumnsConfig, setOriginalColumnsConfig] =
    useState(initialConfig);
  const [selectedColumn, setSelectedColumn] = useState<ColumnMetadata>();

  // Track if there are unsaved changes
  const hasUnsavedChanges = useMemo(
    () => !isEqual(columnsConfig, originalColumnsConfig),
    [columnsConfig, originalColumnsConfig],
  );

  // Batch selection
  const batchSelection = useBatchSelection(columnsConfig, (item) => item.name);

  const batchEditFields: BatchEditField[] = useMemo(
    () => [
      {
        key: 'is_visible_in_table',
        label: t('settings:table.visibleInTable'),
        description: t('settings:table.visibleInTableDescription'),
        defaultValue: true,
      },
      {
        key: 'is_visible_in_detail',
        label: t('settings:table.visibleInDetail'),
        description: t('settings:table.visibleInDetailDescription'),
        defaultValue: true,
      },
      {
        key: 'is_searchable',
        label: t('settings:searchable'),
        description: t('settings:searchableDescription'),
        defaultValue: true,
      },
      {
        key: 'is_sortable',
        label: t('settings:sortable'),
        description: t('settings:sortableDescription'),
        defaultValue: true,
      },
      {
        key: 'is_filterable',
        label: t('settings:filterable'),
        description: t('settings:filterableDescription'),
        defaultValue: true,
      },
      {
        key: 'is_editable',
        label: t('settings:editable'),
        description: t('settings:editableDescription'),
        defaultValue: true,
      },
    ],
    [t],
  );

  const handleEditColumn = useCallback(
    (column: ColumnMetadata) => {
      if (!canUpdate) {
        return;
      }

      setSelectedColumn(column);
      setDialogOpen(true);
    },
    [setSelectedColumn, setDialogOpen, canUpdate],
  );

  const sensors = useSensors(
    useSensor(MouseSensor, {}),
    useSensor(TouchSensor, {}),
    useSensor(KeyboardSensor, {}),
  );

  // Batch edit handler
  const handleBatchEdit = useCallback(
    (values: Record<string, boolean>) => {
      setColumnsConfig((prev) => {
        const updatedColumns = prev.map((column) => {
          if (batchSelection.selectedIds.has(column.name)) {
            const updatedColumn = {
              ...column,
              is_visible_in_table:
                values['is_visible_in_table'] ?? column.is_visible_in_table,
              is_visible_in_detail:
                values['is_visible_in_detail'] ?? column.is_visible_in_detail,
              is_searchable: values['is_searchable'] ?? column.is_searchable,
              is_sortable: values['is_sortable'] ?? column.is_sortable,
              is_filterable: values['is_filterable'] ?? column.is_filterable,
              is_editable: values['is_editable'] ?? column.is_editable,
            };

            return updatedColumn;
          }

          return column;
        });

        // Create API payload with all columns config
        const payload = updatedColumns.reduce(
          (acc, column) => {
            acc[column.name] = column;
            return acc;
          },
          {} as Record<string, ColumnMetadata>,
        );

        // Submit the batch edit request
        fetcher.submit(
          {
            intent: 'update-table-columns-config' as const,
            data: payload,
          } as unknown as SubmitTarget,
          {
            method: 'POST',
            encType: 'application/json',
          },
        );

        return updatedColumns;
      });

      batchSelection.clearSelection();
    },
    [batchSelection, setColumnsConfig, fetcher],
  );

  const selectedColumnNames = useMemo(() => {
    return columnsConfig
      .filter((column) => batchSelection.selectedIds.has(column.name))
      .map((column) => column.display_name || column.name);
  }, [columnsConfig, batchSelection.selectedIds]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!active?.id || !over?.id || active.id === over.id) {
      return;
    }

    // update columns config
    setColumnsConfig((prev) => {
      const newColumnsConfig = [...prev];

      // Find the indices of the active and over items
      const activeIndex = newColumnsConfig.findIndex(
        (item) => item.name === String(active.id),
      );

      const overIndex = newColumnsConfig.findIndex(
        (item) => item.name === String(over.id),
      );

      if (activeIndex === -1 || overIndex === -1) {
        return prev;
      }

      // Move the active item to the over position (like arrayMove from dnd-kit)
      const [movedItem] = newColumnsConfig.splice(activeIndex, 1);

      if (movedItem) {
        newColumnsConfig.splice(overIndex, 0, movedItem);
      }

      // Reassign ordering values based on new positions
      newColumnsConfig.forEach((item, index) => {
        item.ordering = index + 1;
      });

      return newColumnsConfig;
    });
  }, []);

  // Handle toggle changes for inline editing
  const handleToggleChange = useCallback(
    (columnName: string, field: keyof ColumnMetadata, value: boolean) => {
      if (!canUpdate) {
        return;
      }

      // Clear batch selection when making inline changes
      if (batchSelection.selectedCount > 0) {
        batchSelection.clearSelection();
      }

      setColumnsConfig((prev) =>
        prev.map((col) =>
          col.name === columnName ? { ...col, [field]: value } : col,
        ),
      );
    },
    [canUpdate, batchSelection],
  );

  // Save changes to the server
  const handleSave = useCallback(() => {
    const payload = columnsConfig.reduce(
      (acc, column) => {
        acc[column.name] = column;
        return acc;
      },
      {} as Record<string, ColumnMetadata>,
    );

    fetcher.submit(
      {
        intent: 'update-table-columns-config' as const,
        data: payload,
      } as unknown as SubmitTarget,
      {
        method: 'POST',
        encType: 'application/json',
      },
    );
  }, [columnsConfig, fetcher]);

  // Revert changes to the original state
  const handleRevert = useCallback(() => {
    setColumnsConfig(originalColumnsConfig);
  }, [originalColumnsConfig]);

  // Track last save to update original config
  const lastSavedRef = useRef(false);

  useEffect(() => {
    const justSaved = fetcher.state === 'idle' && fetcher.data?.success;

    if (justSaved && !lastSavedRef.current) {
      // Save succeeded, update the original config
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOriginalColumnsConfig(columnsConfig);
      lastSavedRef.current = true;
    } else if (!justSaved && lastSavedRef.current) {
      // Reset the flag when fetcher becomes active again
      lastSavedRef.current = false;
    }
  }, [fetcher.state, fetcher.data?.success, columnsConfig]);

  // update the columns config when the data changes
  useEffect(() => {
    const newConfig = setInitialColumnsConfig(
      Object.values(data.columnsConfig),
    );
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setColumnsConfig(newConfig);

    setOriginalColumnsConfig(newConfig);
  }, [data.columnsConfig]);

  const isSubmitting = fetcher.state === 'submitting';

  const tableColumns = useMemo<ColumnDef<ColumnMetadata>[]>(
    () => [
      ...(canUpdate
        ? [
            {
              id: 'drag-handle',
              header: '',
              cell: ({ row }) => (
                <RowDragHandleCell rowId={row.original.name} />
              ),
              maxSize: 30,
              enablePinning: true,
              enableSorting: false,
              enableHiding: false,
            } satisfies ColumnDef<ColumnMetadata>,
          ]
        : []),
      ...(canUpdate
        ? [
            {
              id: 'select',
              header: ({ table }) => (
                <label className="flex items-center justify-center">
                  <Checkbox
                    data-testid="columns-select-all-checkbox"
                    checked={
                      batchSelection.isAllSelected ||
                      (batchSelection.isSomeSelected && 'indeterminate')
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
                  className="hover:bg-muted block flex w-full justify-center rounded p-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Checkbox
                    checked={batchSelection.isSelected(row.original.name)}
                    onCheckedChange={(value) => {
                      batchSelection.toggleSelection(row.original.name);
                      row.toggleSelected(!!value);
                    }}
                  />
                </label>
              ),
              meta: {
                className: '!p-0',
              },
              maxSize: 40,
              enablePinning: true,
              enableSorting: false,
              enableHiding: false,
            } satisfies ColumnDef<ColumnMetadata>,
          ]
        : []),
      {
        accessorKey: 'displayName',
        header: t('settings:table.displayName'),
        cell: ({ row }) => (
          <span data-testid={`column-display-name`}>
            {row.original.display_name}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t('settings:table.columnName'),
      },
      {
        id: 'dataType',
        header: t('settings:table.dataType'),
        cell: ({ row }) => {
          const uiConfig = row.original.ui_config;
          const uiDataType = uiConfig?.ui_data_type as string;
          let dataType = uiConfig?.data_type as string;

          if (
            uiConfig?.is_enum ||
            (uiConfig?.data_type as string) === 'USER-DEFINED'
          ) {
            dataType = t('settings:table.list');
          }

          return (
            <div
              className="flex items-center gap-x-2"
              data-testid={`column-data-type`}
            >
              <DataTypeIcon
                type={uiConfig?.data_type}
                className="text-muted-foreground h-3 w-3"
              />

              <span title={dataType} className="max-w-22 truncate capitalize">
                {uiDataType || dataType}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'isRequired',
        header: t('settings:table.required'),
        cell: ({ row }) => <BooleanCell value={row.original.is_required} />,
      },
      {
        accessorKey: 'isVisibleInTable',
        header: t('settings:table.visibleInTable'),
        cell: ({ row }) => {
          const original = originalColumnsConfig.find(
            (col) => col.name === row.original.name,
          );
          return (
            <ToggleCell
              value={row.original.is_visible_in_table}
              onToggle={(value) =>
                handleToggleChange(
                  row.original.name,
                  'is_visible_in_table',
                  value,
                )
              }
              disabled={!canUpdate || isSubmitting}
              isChanged={
                original?.is_visible_in_table !==
                row.original.is_visible_in_table
              }
            />
          );
        },
        meta: {
          className: '!p-2',
        },
      },
      {
        accessorKey: 'isVisibleInDetail',
        header: t('settings:table.visibleInDetail'),
        cell: ({ row }) => {
          const original = originalColumnsConfig.find(
            (col) => col.name === row.original.name,
          );
          return (
            <ToggleCell
              value={row.original.is_visible_in_detail}
              onToggle={(value) =>
                handleToggleChange(
                  row.original.name,
                  'is_visible_in_detail',
                  value,
                )
              }
              disabled={!canUpdate || isSubmitting}
              isChanged={
                original?.is_visible_in_detail !==
                row.original.is_visible_in_detail
              }
            />
          );
        },
        meta: {
          className: '!p-2',
        },
      },
      {
        accessorKey: 'isEditable',
        header: t('settings:table.editable'),
        cell: ({ row }) => {
          const original = originalColumnsConfig.find(
            (col) => col.name === row.original.name,
          );
          return (
            <ToggleCell
              value={row.original.is_editable}
              onToggle={(value) =>
                handleToggleChange(row.original.name, 'is_editable', value)
              }
              disabled={!canUpdate || isSubmitting}
              isChanged={original?.is_editable !== row.original.is_editable}
            />
          );
        },
        meta: {
          className: '!p-2',
        },
      },
      {
        accessorKey: 'isSearchable',
        header: t('settings:table.searchable'),
        cell: ({ row }) => {
          const original = originalColumnsConfig.find(
            (col) => col.name === row.original.name,
          );
          return (
            <ToggleCell
              value={row.original.is_searchable}
              onToggle={(value) =>
                handleToggleChange(row.original.name, 'is_searchable', value)
              }
              disabled={!canUpdate || isSubmitting}
              isChanged={original?.is_searchable !== row.original.is_searchable}
            />
          );
        },
        meta: {
          className: '!p-2',
        },
      },
      {
        accessorKey: 'isSortable',
        header: t('settings:table.sortable'),
        cell: ({ row }) => {
          const original = originalColumnsConfig.find(
            (col) => col.name === row.original.name,
          );
          return (
            <ToggleCell
              value={row.original.is_sortable}
              onToggle={(value) =>
                handleToggleChange(row.original.name, 'is_sortable', value)
              }
              disabled={!canUpdate || isSubmitting}
              isChanged={original?.is_sortable !== row.original.is_sortable}
            />
          );
        },
        meta: {
          className: '!p-2',
        },
      },
      {
        accessorKey: 'isFilterable',
        header: t('settings:table.filterable'),
        cell: ({ row }) => {
          const original = originalColumnsConfig.find(
            (col) => col.name === row.original.name,
          );
          return (
            <ToggleCell
              value={row.original.is_filterable}
              onToggle={(value) =>
                handleToggleChange(row.original.name, 'is_filterable', value)
              }
              disabled={!canUpdate || isSubmitting}
              isChanged={original?.is_filterable !== row.original.is_filterable}
            />
          );
        },
        meta: {
          className: '!p-2',
        },
      },
      {
        id: 'defaultValue',
        header: t('settings:table.defaultValue'),
        cell: ({ row }) => {
          // stripe Postgres data-type specific quotes
          const cleanedValue = row.original.default_value?.replace(
            /^'(.*)'::.*$/,
            '$1',
          );

          return <span>{cleanedValue || '-'}</span>;
        },
      },
      {
        id: 'actions',
        header: t('settings:table.actions'),
        cell: ({ row }) => (
          <Button
            disabled={!canUpdate}
            variant="outline"
            size="sm"
            onClick={() => {
              if (canUpdate) {
                handleEditColumn(row.original);
              }
            }}
          >
            <Trans i18nKey="settings:table.edit" />
          </Button>
        ),
      },
    ],
    [
      t,
      batchSelection,
      handleEditColumn,
      canUpdate,
      handleToggleChange,
      isSubmitting,
      originalColumnsConfig,
    ],
  );

  return (
    <div className={cn('flex w-full flex-1 flex-col space-y-4')}>
      <div className="flex flex-col">
        <p className="text-muted-foreground text-sm">
          <Trans
            i18nKey="settings:table.columnsDescription"
            values={{
              displayName: data.displayName || data.tableName,
            }}
          />
        </p>
      </div>

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
              : 'settings:table.selectedColumns'
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
        title={t('settings:table.batchEditColumns')}
        description={t('settings:table.batchEditColumnsDescription')}
        selectedCount={batchSelection.selectedCount}
        selectedItems={selectedColumnNames}
        fields={batchEditFields}
        onSave={handleBatchEdit}
        isSubmitting={isSubmitting}
      />

      <If condition={!columnsConfig.length}>
        <div className="text-muted-foreground p-4 text-center">
          <Trans i18nKey="settings:table.noColumnsFound" />
        </div>
      </If>

      <If condition={columnsConfig.length > 0}>
        <DataTableContainer>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            modifiers={[restrictToVerticalAxis]}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columnsConfig.map((item) => item.name)}
              strategy={verticalListSortingStrategy}
            >
              <DataTable<ColumnMetadata>
                columns={tableColumns}
                data={columnsConfig}
                getRowId={(row) => row.name}
                sorting={[{ id: 'ordering', desc: true }]}
                columnPinning={{
                  left: ['drag-handle', 'select', 'name'],
                }}
                className={cn('transition-opacity', {
                  'pointer-events-none opacity-50': isSubmitting,
                })}
                onClick={(row) => {
                  // Don't navigate if a column is being selected
                  if (!batchSelection.isSelected(row.original.name)) {
                    handleEditColumn(row.original);
                  }
                }}
                renderRow={({ row, onClick, className }) =>
                  // eslint-disable-next-line react/display-name
                  ({ children }) => (
                    <DraggableRow
                      className={className}
                      onClick={onClick}
                      row={row}
                    >
                      {children}
                    </DraggableRow>
                  )}
                tableProps={{
                  'data-testid': 'resource-columns-table',
                }}
              />
            </SortableContext>
          </DndContext>
        </DataTableContainer>
      </If>

      <If condition={selectedColumn}>
        <EditColumnMetadataDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          column={selectedColumn!}
        />
      </If>
    </div>
  );
}

interface DraggableRowProps {
  row: Row<ColumnMetadata>;
  children: React.ReactNode;
  onClick?: (row: Row<ColumnMetadata>) => void;
  className?: string;
}

function DraggableRow({
  row,
  children,
  onClick,
  className,
}: DraggableRowProps) {
  const { setNodeRef, transform, transition, isDragging } = useSortable({
    id: row.original.name,
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
      ref={setNodeRef}
      style={style}
      className={cn(className, {
        'hover:bg-accent/60 cursor-pointer': !isDragging,
      })}
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

function BooleanCell({ value }: { value: boolean }) {
  return (
    <span>
      {value ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <XIcon className="h-4 w-4 text-red-500" />
      )}
    </span>
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
        data-testid="column-toggle"
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

function RowDragHandleCell({ rowId }: { rowId: string }) {
  const { attributes, listeners } = useSortable({
    id: rowId,
  });

  return (
    <Button
      data-testid={`row-drag-handle`}
      data-id={rowId}
      variant="ghost"
      size="icon"
      className="hover:bg-muted h-8 w-8 cursor-grab p-0"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-4 w-4" />
    </Button>
  );
}

function setInitialColumnsConfig(columnsConfig: ColumnMetadata[]) {
  return columnsConfig.sort((a, b) => {
    if (!a.ordering) {
      return 1;
    }

    if (!b.ordering) {
      return -1;
    }

    return a.ordering - b.ordering;
  });
}
