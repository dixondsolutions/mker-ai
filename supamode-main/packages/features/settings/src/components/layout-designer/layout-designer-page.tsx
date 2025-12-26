import { useCallback, useMemo, useState } from 'react';

import { Link, useFetcher, useLoaderData } from 'react-router';

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  Edit,
  Eye,
  GripVertical,
  Info,
  Plus,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { ColumnMetadata } from '@kit/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Form } from '@kit/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';

import { tableMetadataLoader } from '../../loaders';
import { SortableGroup } from './components/layout';
import { DraggablePaletteItem } from './components/palette';
import {
  COLUMN_SIZE_HALF,
  COLUMN_SIZE_SINGLE,
  DEFAULT_GROUP_LABEL,
  DEFAULT_LAYOUT_NAME,
  DRAG_ACTIVATION_DELAY,
  DRAG_ACTIVATION_DISTANCE,
  DRAG_TOLERANCE,
  GROUP_SWAP_DEBOUNCE_TIME,
  ID_LENGTH,
  MAX_COLUMNS_PER_ROW,
} from './constants';
import {
  AvailableColumnDragItem,
  ColumnDragItem,
  ColumnSize,
  DragItem,
  LayoutColumn,
  LayoutGroup,
  LayoutMode,
  LayoutRow,
} from './types';
import { customCollisionDetection } from './utils/collision-detection';
import { getDraggedRowId } from './utils/drag-helpers';

function generateId(): string {
  return Math.random()
    .toString(36)
    .substring(2, 2 + ID_LENGTH);
}

// Helper to calculate total size of columns in a row
function calculateRowTotalSize(columns: LayoutColumn[]): number {
  return columns.reduce((total, column) => total + column.size, 0);
}

// Helper to get grid class based on column count
function getGridClass(columnCount: number): string {
  if (columnCount === 1) return 'grid-cols-1';
  if (columnCount === 2) return 'grid-cols-2';
  if (columnCount === 3) return 'grid-cols-3';
  if (columnCount === 4) return 'grid-cols-4';

  return 'grid-cols-2'; // fallback
}

// Zod schema for form validation
const LayoutDesignerSchema = z.object({
  id: z.string(),
  name: z.string(),
  display: z.array(z.custom<LayoutGroup>()),
  edit: z.array(z.custom<LayoutGroup>()),
});

type LayoutDesignerFormData = z.infer<typeof LayoutDesignerSchema>;

export function LayoutDesignerPage() {
  const { t } = useTranslation();
  const { data } = useLoaderData<typeof tableMetadataLoader>();
  const fetcher = useFetcher<{ success: boolean }>();

  const isSubmitting = fetcher.state === 'submitting';

  // Check if experimental layout designer is enabled
  // To enable: set VITE_ENABLE_EXPERIMENTAL_LAYOUT_DESIGNER=true in your .env file
  const isLayoutDesignerEnabled =
    import.meta.env['VITE_ENABLE_EXPERIMENTAL_LAYOUT_DESIGNER'] === 'true';

  const [currentMode, setCurrentMode] = useState<LayoutMode>('display');

  // Create initial layout config for form
  const initialLayoutConfig = useMemo<LayoutDesignerFormData>(() => {
    const existingLayout = data.uiConfig?.recordLayout;

    if (existingLayout) {
      // Extract only the fields we need for the form
      return {
        id: existingLayout.id,
        name: existingLayout.name,
        display: existingLayout.display,
        edit: existingLayout.edit,
      };
    }

    return {
      id: generateId(),
      name: DEFAULT_LAYOUT_NAME,
      display: [
        {
          id: generateId(),
          label: t('settings:layoutDesigner.mainFields') || DEFAULT_GROUP_LABEL,
          rows: [{ id: generateId(), columns: [] }],
          isCollapsed: false,
        },
      ],
      edit: [
        {
          id: generateId(),
          label: t('settings:layoutDesigner.mainFields') || DEFAULT_GROUP_LABEL,
          rows: [{ id: generateId(), columns: [] }],
          isCollapsed: false,
        },
      ],
    };
  }, [data.uiConfig?.recordLayout, t]);

  // Initialize form with React Hook Form
  const form = useForm({
    resolver: zodResolver(LayoutDesignerSchema),
    defaultValues: initialLayoutConfig,
  });

  // Get current form values
  const layoutConfig = useWatch({ control: form.control });

  // Check if form has changes
  const hasChanges = form.formState.isDirty;

  // Helper function to update layout config
  const updateLayoutConfig = useCallback(
    (updateFn: (prev: LayoutDesignerFormData) => LayoutDesignerFormData) => {
      const currentValues = form.getValues();
      const newValues = updateFn(currentValues);

      form.setValue('display', newValues.display, { shouldDirty: true });
      form.setValue('edit', newValues.edit, { shouldDirty: true });

      // Update other fields if they changed
      if (newValues.id !== currentValues.id) {
        form.setValue('id', newValues.id, { shouldDirty: true });
      }

      if (newValues.name !== currentValues.name) {
        form.setValue('name', newValues.name, { shouldDirty: true });
      }
    },
    [form],
  );

  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  const [lastGroupSwapTime, setLastGroupSwapTime] = useState<number>(0);

  const [preDragGroupStates, setPreDragGroupStates] = useState<
    Record<string, boolean>
  >({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: DRAG_ACTIVATION_DISTANCE,
        delay: DRAG_ACTIVATION_DELAY,
        tolerance: DRAG_TOLERANCE,
      },
    }),
  );

  // Get current groups based on mode
  const currentGroups = useMemo(
    () => layoutConfig[currentMode] ?? [],
    [layoutConfig, currentMode],
  );

  // Convert columns config to array
  const availableColumns = useMemo(() => {
    return Object.entries(data.columnsConfig).map(([name, config]) => ({
      ...config,
      name,
      data_type: config.ui_config.data_type,
    }));
  }, [data.columnsConfig]);

  const usedColumns = useMemo(() => {
    return new Set(
      currentGroups.flatMap((group) =>
        group.rows?.flatMap((row) => row.columns?.map((col) => col.fieldName)),
      ),
    );
  }, [currentGroups]);

  const unusedColumns = useMemo(() => {
    return availableColumns.filter((col) => !usedColumns.has(col.name));
  }, [availableColumns, usedColumns]);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const dragData = active.data.current;

      setDraggedItem(dragData as DragItem);

      // Auto-collapse all groups when dragging a group for better visibility
      if (dragData?.['type'] === 'group') {
        const currentGroupStates: Record<string, boolean> = {};

        updateLayoutConfig((prevConfig) => {
          const newConfig = { ...prevConfig };
          const currentGroups = newConfig[currentMode];

          // Store current collapse states before modifying
          currentGroups.forEach((group) => {
            currentGroupStates[group.id] = group.isCollapsed ?? false;
          });

          // Collapse all groups
          newConfig[currentMode] = currentGroups.map((group) => ({
            ...group,
            isCollapsed: true,
          }));

          return newConfig;
        });

        // Store the original states for restoration
        setPreDragGroupStates(currentGroupStates);
      }
    },
    [currentMode, updateLayoutConfig],
  );

  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Row reordering is now handled via proper drop zones in handleDragEnd
    // This function can be used for other real-time feedback if needed
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Always clear drag state at the end, regardless of what happens
      const clearDragState = () => {
        setDraggedItem(null);
      };

      // Clear immediately to prevent UI lag
      clearDragState();

      if (!over || !draggedItem) {
        return;
      }

      const overData = over.data.current;
      const activeData = active.data.current;

      // Handle column sorting within rows
      if (
        draggedItem['type'] === 'column' &&
        activeData?.['type'] === 'column' &&
        overData?.['type'] === 'column'
      ) {
        const sourceMode = activeData['mode'];
        const targetMode = overData['mode'];

        if (sourceMode === targetMode && sourceMode === currentMode) {
          // Find the source and target positions
          const sourceColumn = activeData['data'];
          const targetColumn = overData['data'];

          updateLayoutConfig((prev) => {
            // Create a deep copy of the groups to avoid reference issues
            const newGroups = prev[currentMode].map((group) => ({
              ...group,
              rows: group.rows.map((row) => ({
                ...row,
                columns: [...row.columns],
              })),
            }));

            // Find source and target positions
            let sourceGroupIndex = -1;
            let sourceRowIndex = -1;
            let targetGroupIndex = -1;
            let targetRowIndex = -1;
            let sourceColumnIndex = -1;
            let targetColumnIndex = -1;

            newGroups.forEach((group, gi) => {
              group.rows.forEach((row, ri) => {
                row.columns.forEach((col, ci) => {
                  if (col.id === sourceColumn.id) {
                    sourceGroupIndex = gi;
                    sourceRowIndex = ri;
                    sourceColumnIndex = ci;
                  }
                  if (col.id === targetColumn.id) {
                    targetGroupIndex = gi;
                    targetRowIndex = ri;
                    targetColumnIndex = ci;
                  }
                });
              });
            });

            if (
              sourceGroupIndex >= 0 &&
              sourceRowIndex >= 0 &&
              targetGroupIndex >= 0 &&
              targetRowIndex >= 0 &&
              sourceColumnIndex >= 0 &&
              targetColumnIndex >= 0
            ) {
              if (
                sourceGroupIndex === targetGroupIndex &&
                sourceRowIndex === targetRowIndex
              ) {
                // Same row - reorder columns

                const sourceGroup = newGroups[sourceGroupIndex];
                const row = sourceGroup?.rows[sourceRowIndex];

                if (row) {
                  const newColumns = arrayMove(
                    row.columns,
                    sourceColumnIndex,
                    targetColumnIndex,
                  );

                  row.columns = newColumns;
                }
              } else {
                // Different row (or group) – move the column

                const sourceGroup = newGroups[sourceGroupIndex];
                const targetGroup = newGroups[targetGroupIndex];
                const sourceRow = sourceGroup?.rows[sourceRowIndex];
                const targetRow = targetGroup?.rows[targetRowIndex];

                if (sourceRow && targetRow) {
                  // Enforce max columns constraint when moving to a different row
                  const targetRowTotalSize = calculateRowTotalSize(
                    targetRow.columns,
                  );
                  if (targetRowTotalSize >= MAX_COLUMNS_PER_ROW) {
                    return prev;
                  }

                  // Remove from source
                  const movedColumn = sourceRow.columns[sourceColumnIndex];
                  if (movedColumn) {
                    sourceRow.columns = sourceRow.columns.filter(
                      (_, index) => index !== sourceColumnIndex,
                    );

                    // Add to target at the target position
                    targetRow.columns.splice(targetColumnIndex, 0, movedColumn);
                  }
                }
              }
            } else {
              return prev;
            }

            return {
              ...prev,
              [currentMode]: newGroups,
            };
          });
        }
      }

      // Handle group sorting
      if (
        draggedItem['type'] === 'group' &&
        overData?.['type'] === 'group' &&
        activeData?.['mode'] === currentMode &&
        overData?.['mode'] === currentMode
      ) {
        const sourceGroup = activeData['group'];
        const targetGroup = overData['group'];

        // Debounce group swapping to prevent jittery behavior
        const now = Date.now();
        if (now - lastGroupSwapTime < GROUP_SWAP_DEBOUNCE_TIME) {
          return;
        }

        updateLayoutConfig((prev) => {
          const newGroups = [...prev[currentMode]];
          const sourceIndex = newGroups.findIndex(
            (g) => g.id === sourceGroup.id,
          );
          const targetIndex = newGroups.findIndex(
            (g) => g.id === targetGroup.id,
          );

          if (
            sourceIndex >= 0 &&
            targetIndex >= 0 &&
            sourceIndex !== targetIndex
          ) {
            setLastGroupSwapTime(now);

            const reorderedGroups = arrayMove(
              newGroups,
              sourceIndex,
              targetIndex,
            );
            return {
              ...prev,
              [currentMode]: reorderedGroups,
            };
          }

          return prev;
        });
      }

      // Handle row insertion via drop zones
      if (
        overData?.['type'] === 'row-insert-zone' &&
        overData['mode'] === currentMode &&
        draggedItem['type'] === 'row' &&
        activeData
      ) {
        const { groupId, rowIndex } = overData;
        const sourceRow = activeData['row'];
        const sourceGroupId = activeData['groupId'];

        // Only allow moving within the same group
        if (sourceGroupId === groupId && sourceRow) {
          updateLayoutConfig((prev) => {
            const newGroups = prev[currentMode].map((group) => ({
              ...group,
              rows: group.rows.map((row) => ({
                ...row,
                columns: [...row.columns],
              })),
            }));

            const groupIndex = newGroups.findIndex((g) => g.id === groupId);
            if (groupIndex >= 0) {
              const group = newGroups[groupIndex];
              if (group) {
                const sourceIndex = group.rows.findIndex(
                  (r) => r.id === sourceRow.id,
                );

                if (sourceIndex >= 0) {
                  // Remove from source position
                  const removedRows = group.rows.splice(sourceIndex, 1);
                  const movedRow = removedRows[0];

                  if (movedRow) {
                    // Calculate target index (adjust if source was before target)
                    let targetIndex = rowIndex;
                    if (sourceIndex < rowIndex) {
                      targetIndex = rowIndex - 1;
                    }

                    // Insert at target position
                    group.rows.splice(targetIndex, 0, movedRow);

                    newGroups[groupIndex] = group;
                  }
                }
              }
            }

            return {
              ...prev,
              [currentMode]: newGroups,
            };
          });
        }
      }

      // Handle dropping columns on empty rows
      if (
        overData?.['type'] === 'row-drop-zone' &&
        overData['mode'] === currentMode
      ) {
        const { groupId, rowId } = overData;

        if (
          draggedItem['type'] === 'available-column' &&
          (draggedItem as AvailableColumnDragItem)['mode'] === currentMode
        ) {
          const columnMetadata = draggedItem['data'] as ColumnMetadata;

          updateLayoutConfig((prev) => ({
            ...prev,
            [currentMode]: prev[currentMode].map((group) => {
              if (group.id === groupId) {
                return {
                  ...group,
                  rows: group.rows.map((row) => {
                    if (row.id === rowId) {
                      // Calculate remaining space and use appropriate size
                      const currentTotalSize = calculateRowTotalSize(
                        row.columns,
                      );
                      const remainingSpace =
                        MAX_COLUMNS_PER_ROW - currentTotalSize;

                      // Use size 1 if only 1 slot remains, otherwise use default half size
                      const columnSize =
                        remainingSpace === 1
                          ? COLUMN_SIZE_SINGLE
                          : COLUMN_SIZE_HALF;

                      const newColumn: LayoutColumn = {
                        id: generateId(),
                        fieldName: columnMetadata.name,
                        size: columnSize,
                        metadata: columnMetadata,
                      };

                      // Check if the new column fits
                      if (
                        currentTotalSize + newColumn.size >
                        MAX_COLUMNS_PER_ROW
                      ) {
                        return row;
                      }
                      return {
                        ...row,
                        columns: [newColumn], // Replace any existing columns (should be empty anyway)
                      };
                    }
                    return row;
                  }),
                };
              }
              return group;
            }),
          }));
        }
        // Handle moving existing columns to empty rows
        else if (draggedItem['type'] === 'column') {
          if ((draggedItem as ColumnDragItem)['mode'] !== currentMode) {
            return;
          }

          const sourceColumn = draggedItem['data'];

          // Find the source location of the column
          let sourceGroupId = '';
          let sourceRowId = '';
          let sourceColumnIndex = -1;

          for (const group of currentGroups) {
            for (const row of group.rows ?? []) {
              const colIndex = row.columns?.findIndex(
                (col) => col.id === sourceColumn.id,
              );

              if (colIndex !== undefined && colIndex >= 0) {
                sourceGroupId = group.id as string;
                sourceRowId = row.id as string;
                sourceColumnIndex = colIndex;
                break;
              }
            }
            if (sourceGroupId) break;
          }

          if (sourceGroupId && sourceRowId && sourceColumnIndex >= 0) {
            updateLayoutConfig((prev) => {
              const newGroups = prev[currentMode].map((group) => ({
                ...group,
                rows: group.rows.map((row) => ({
                  ...row,
                  columns: [...row.columns],
                })),
              }));

              // Remove from source
              const sourceGroup = newGroups.find((g) => g.id === sourceGroupId);
              if (sourceGroup) {
                const sourceRow = sourceGroup.rows.find(
                  (r) => r.id === sourceRowId,
                );
                if (sourceRow) {
                  sourceRow.columns.splice(sourceColumnIndex, 1);
                }
              }

              // Add to target row (should be empty)
              const targetGroup = newGroups.find((g) => g.id === groupId);
              if (targetGroup) {
                const targetRow = targetGroup.rows.find((r) => r.id === rowId);
                if (targetRow) {
                  const currentTotalSize = calculateRowTotalSize(
                    targetRow.columns,
                  );
                  if (
                    currentTotalSize + sourceColumn.size <=
                    MAX_COLUMNS_PER_ROW
                  ) {
                    targetRow.columns = [sourceColumn];
                  }
                }
              }

              return {
                ...prev,
                [currentMode]: newGroups,
              };
            });
          }
        }
      }

      // Handle dropping columns in insert zones
      if (
        overData?.['type'] === 'column-insert-zone' &&
        overData['mode'] === currentMode
      ) {
        const { groupId, rowId, columnIndex } = overData;

        if (
          draggedItem['type'] === 'available-column' &&
          (draggedItem as AvailableColumnDragItem)['mode'] === currentMode
        ) {
          const columnMetadata = draggedItem['data'] as ColumnMetadata;

          updateLayoutConfig((prev) => ({
            ...prev,
            [currentMode]: prev[currentMode].map((group) => {
              if (group.id === groupId) {
                return {
                  ...group,
                  rows: group.rows.map((row) => {
                    if (row.id === rowId) {
                      // Calculate remaining space and use appropriate size
                      const currentTotalSize = calculateRowTotalSize(
                        row.columns,
                      );
                      const remainingSpace =
                        MAX_COLUMNS_PER_ROW - currentTotalSize;

                      // Use size 1 if only 1 slot remains, otherwise use default half size
                      const columnSize =
                        remainingSpace === 1
                          ? COLUMN_SIZE_SINGLE
                          : COLUMN_SIZE_HALF;

                      const newColumn: LayoutColumn = {
                        id: generateId(),
                        fieldName: columnMetadata.name,
                        size: columnSize,
                        metadata: columnMetadata,
                      };

                      // Check if the new column fits
                      if (
                        currentTotalSize + newColumn.size >
                        MAX_COLUMNS_PER_ROW
                      ) {
                        return row;
                      }

                      const newColumns = [...row.columns];
                      newColumns.splice(columnIndex, 0, newColumn);

                      return {
                        ...row,
                        columns: newColumns,
                      };
                    }

                    return row;
                  }),
                };
              }
              return group;
            }),
          }));
        }
        // Handle moving existing columns to insert zones
        else if (draggedItem['type'] === 'column') {
          if ((draggedItem as ColumnDragItem)['mode'] !== currentMode) {
            return;
          }

          const sourceColumn = draggedItem['data'];

          // Find the source location of the column
          let sourceGroupId = '';
          let sourceRowId = '';
          let sourceColumnIndex = -1;

          for (const group of currentGroups) {
            for (const row of group.rows ?? []) {
              const colIndex = row.columns?.findIndex(
                (col) => col.id === sourceColumn.id,
              );

              if (colIndex !== undefined && colIndex >= 0) {
                sourceGroupId = group.id as string;
                sourceRowId = row.id as string;
                sourceColumnIndex = colIndex;
                break;
              }
            }
            if (sourceGroupId) break;
          }

          if (sourceGroupId && sourceRowId && sourceColumnIndex >= 0) {
            updateLayoutConfig((prev) => {
              const newGroups = prev[currentMode].map((group) => ({
                ...group,
                rows: group.rows.map((row) => ({
                  ...row,
                  columns: [...row.columns],
                })),
              }));

              // Remove from source
              const sourceGroup = newGroups.find((g) => g.id === sourceGroupId);
              if (sourceGroup) {
                const sourceRow = sourceGroup.rows.find(
                  (r) => r.id === sourceRowId,
                );
                if (sourceRow) {
                  sourceRow.columns.splice(sourceColumnIndex, 1);
                }
              }

              // Add to target at specific index
              const targetGroup = newGroups.find((g) => g.id === groupId);
              if (targetGroup) {
                const targetRow = targetGroup.rows.find((r) => r.id === rowId);
                if (targetRow) {
                  // Enforce size limit (but allow moving within the same row)
                  const isMovingWithinSameRow =
                    sourceGroupId === groupId && sourceRowId === rowId;
                  if (!isMovingWithinSameRow) {
                    const targetRowTotalSize = calculateRowTotalSize(
                      targetRow.columns,
                    );
                    if (
                      targetRowTotalSize + sourceColumn.size >
                      MAX_COLUMNS_PER_ROW
                    ) {
                      return prev;
                    }
                  }

                  // Adjust index if moving within same row and source was before target
                  let adjustedIndex = columnIndex;
                  if (
                    sourceGroupId === groupId &&
                    sourceRowId === rowId &&
                    sourceColumnIndex < columnIndex
                  ) {
                    adjustedIndex = columnIndex - 1;
                  }
                  targetRow.columns.splice(adjustedIndex, 0, sourceColumn);
                }
              }

              return {
                ...prev,
                [currentMode]: newGroups,
              };
            });
          }
        }
      }

      // Restore group collapse states if we were dragging a group
      if (
        draggedItem?.['type'] === 'group' &&
        Object.keys(preDragGroupStates).length > 0
      ) {
        updateLayoutConfig((prevConfig) => {
          const newConfig = { ...prevConfig };
          const currentGroups = newConfig[currentMode];

          // Restore original collapse states
          newConfig[currentMode] = currentGroups.map((group) => ({
            ...group,
            isCollapsed:
              preDragGroupStates[group.id] ?? group.isCollapsed ?? false,
          }));

          return newConfig;
        });

        // Clear the stored states
        setPreDragGroupStates({});
      }
    },
    [
      draggedItem,
      currentMode,
      currentGroups,
      preDragGroupStates,
      lastGroupSwapTime,
      updateLayoutConfig,
    ],
  );

  const handleAddGroup = () => {
    const newRow: LayoutRow = {
      id: generateId(),
      columns: [],
    };

    const newGroup: LayoutGroup = {
      id: generateId(),
      label: t('settings:layoutDesigner.groupNumber', {
        number: currentGroups.length + 1,
      }),
      rows: [newRow],
      isCollapsed: false,
    };

    updateLayoutConfig((prev) => ({
      ...prev,
      [currentMode]: [...prev[currentMode], newGroup],
    }));
  };

  const handleAddRow = (groupId: string) => {
    const newRow: LayoutRow = {
      id: generateId(),
      columns: [],
    };

    updateLayoutConfig((prev) => ({
      ...prev,
      [currentMode]: prev[currentMode].map((group) =>
        group.id === groupId
          ? { ...group, rows: [...group.rows, newRow] }
          : group,
      ),
    }));
  };

  const handleRemoveRow = (rowId: string) => {
    updateLayoutConfig((prev) => ({
      ...prev,
      [currentMode]: prev[currentMode].map((group) => ({
        ...group,
        rows: group.rows.filter((row) => row.id !== rowId),
      })),
    }));
  };

  const handleRemoveColumn = (columnId: string) => {
    updateLayoutConfig((prev) => ({
      ...prev,
      [currentMode]: prev[currentMode].map((group) => ({
        ...group,
        rows: group.rows.map((row) => ({
          ...row,
          columns: row.columns.filter((col) => col.id !== columnId),
        })),
      })),
    }));
  };

  const handleColumnSizeChange = (columnId: string, size: ColumnSize) => {
    updateLayoutConfig((prev) => {
      const newConfig = { ...prev };

      // Find the row containing this column and validate the size change
      for (const group of newConfig[currentMode]) {
        for (const row of group.rows) {
          const columnIndex = row.columns.findIndex(
            (col) => col.id === columnId,
          );

          if (columnIndex >= 0) {
            const otherColumns = row.columns.filter(
              (col) => col.id !== columnId,
            );
            const otherColumnsSize = calculateRowTotalSize(otherColumns);

            // Check if the new size would exceed the row limit
            if (otherColumnsSize + size > MAX_COLUMNS_PER_ROW) {
              // Return without changes if it would exceed the limit
              return prev;
            }

            // Apply the size change
            return {
              ...prev,
              [currentMode]: prev[currentMode].map((g) => ({
                ...g,
                rows: g.rows.map((r) => ({
                  ...r,
                  columns: r.columns.map((col) =>
                    col.id === columnId ? { ...col, size } : col,
                  ),
                })),
              })),
            };
          }
        }
      }

      return prev; // Column not found, no changes
    });
  };

  const handleToggleGroup = (groupId: string) => {
    updateLayoutConfig((prev) => ({
      ...prev,
      [currentMode]: prev[currentMode].map((group) =>
        group.id === groupId
          ? { ...group, isCollapsed: !group.isCollapsed }
          : group,
      ),
    }));
  };

  const handleUpdateGroupLabel = (groupId: string, label: string) => {
    updateLayoutConfig((prev) => ({
      ...prev,
      [currentMode]: prev[currentMode].map((group) =>
        group.id === groupId ? { ...group, label } : group,
      ),
    }));
  };

  const handleRemoveGroup = (groupId: string) => {
    updateLayoutConfig((prev) => ({
      ...prev,
      [currentMode]: prev[currentMode].filter((group) => group.id !== groupId),
    }));
  };

  const handleSave = form.handleSubmit(async (formData) => {
    await fetcher.submit(
      {
        intent: 'save-layout',
        data: JSON.stringify(formData),
      },
      {
        method: 'POST',
        encType: 'application/json',
        action: `/settings/resources/${data.schemaName}/${data.tableName}`,
      },
    );

    form.reset(layoutConfig);
  });

  const handleReset = () => {
    // Reset to default layout config immediately
    const defaultConfig: LayoutDesignerFormData = {
      id: generateId(),
      name: DEFAULT_LAYOUT_NAME,
      display: [
        {
          id: generateId(),
          label: t('settings:layoutDesigner.mainFields') || DEFAULT_GROUP_LABEL,
          rows: [{ id: generateId(), columns: [] }],
          isCollapsed: false,
        },
      ],
      edit: [
        {
          id: generateId(),
          label: t('settings:layoutDesigner.mainFields') || DEFAULT_GROUP_LABEL,
          rows: [{ id: generateId(), columns: [] }],
          isCollapsed: false,
        },
      ],
    };
    form.reset(defaultConfig);

    // Submit the reset to the server
    fetcher.submit(
      {
        intent: 'reset-layout',
      },
      {
        method: 'POST',
        encType: 'application/json',
        action: `/settings/resources/${data.schemaName}/${data.tableName}`,
      },
    );
  };

  function renderDragOverlay(draggedItem: DragItem) {
    // draggedItem is the actual data from dnd-kit: { type: 'row', row, groupId, mode }
    if (!draggedItem) return null;

    if (draggedItem.type === 'row') {
      const row = draggedItem.row as LayoutRow;
      if (!row || !row.columns) {
        // Fallback for invalid row data
        return (
          <div className="bg-background rotate-2 rounded border p-2 opacity-90 shadow-lg">
            <div className="text-xs font-medium">
              {t('settings:layoutDesigner.movingRowOverlay')}
            </div>
          </div>
        );
      }
      return (
        <div className="bg-background w-80 rotate-2 rounded border opacity-90 shadow-xl">
          {/* Row header */}
          <div className="flex items-center gap-2 border-b p-3">
            <GripVertical className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-sm font-medium">
              {t('settings:layoutDesigner.rowColumnsCount', {
                count: row.columns.length,
                max: MAX_COLUMNS_PER_ROW,
              })}
            </span>
            {row.columns.length >= MAX_COLUMNS_PER_ROW && (
              <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                {t('settings:layoutDesigner.rowFull')}
              </Badge>
            )}
          </div>

          {/* Row content */}
          <div className="p-3">
            {row.columns.length === 0 ? (
              <div className="text-muted-foreground/70 border-muted-foreground/20 bg-muted/10 flex h-16 items-center justify-center rounded border border-dashed text-sm">
                {t('settings:layoutDesigner.dropColumnsHere', {
                  max: MAX_COLUMNS_PER_ROW,
                })}
              </div>
            ) : (
              <div className={`grid gap-2 ${getGridClass(row.columns.length)}`}>
                {row.columns.map((column) => (
                  <div
                    key={column.id}
                    className="bg-muted/50 flex flex-col items-center justify-center rounded border p-2 text-xs font-medium"
                  >
                    <div className="truncate text-center">
                      {column.metadata?.display_name ||
                        column.metadata?.name ||
                        column.fieldName ||
                        t('settings:layoutDesigner.columnFallback')}
                    </div>
                    <div className="text-muted-foreground mt-1 text-[10px]">
                      {column.size}/{MAX_COLUMNS_PER_ROW}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      );
    }

    if (draggedItem.type === 'group') {
      const group = draggedItem.group as LayoutGroup;
      if (!group) return null;
      return (
        <div className="bg-background w-96 rotate-2 rounded border opacity-90 shadow-xl">
          <div className="flex items-center gap-2 border-b p-3">
            <GripVertical className="text-muted-foreground h-4 w-4" />
            <span className="text-sm font-semibold">{group.label}</span>
          </div>
          <div className="p-3">
            <div className="text-muted-foreground text-xs">
              {t('settings:layoutDesigner.movingGroup')}
            </div>
          </div>
        </div>
      );
    }

    // Default fallback for columns and other items
    return (
      <div className="bg-background rotate-2 rounded border p-2 opacity-90 shadow-lg">
        <div className="text-xs font-medium">
          {draggedItem.type === 'available-column'
            ? draggedItem.data.display_name || draggedItem.data.name
            : draggedItem.type === 'column'
              ? draggedItem.data.metadata?.display_name ||
                draggedItem.data.fieldName
              : 'Unknown'}
        </div>
      </div>
    );
  }

  function renderGroups() {
    return (
      <div className="relative flex flex-col gap-2">
        {/* Remove left-side blue drop zone indicator completely */}

        <SortableContext
          items={currentGroups.map(
            (group) => `sortable-group-${group.id}-${currentMode}`,
          )}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {currentGroups.map((group) => (
              <div key={group.id} className="relative">
                {/* Remove blue top drop zone for group reordering */}

                <SortableGroup
                  group={group as LayoutGroup}
                  mode={currentMode}
                  onToggle={handleToggleGroup}
                  onAddRow={handleAddRow}
                  onRemoveRow={handleRemoveRow}
                  onRemoveColumn={handleRemoveColumn}
                  onColumnSizeChange={handleColumnSizeChange}
                  onUpdateLabel={handleUpdateGroupLabel}
                  onRemoveGroup={handleRemoveGroup}
                  draggedItemType={draggedItem?.type}
                  draggedRowId={getDraggedRowId(draggedItem)}
                />
              </div>
            ))}

            <div className="flex items-center justify-center">
              <Button
                variant={'secondary'}
                size={'sm'}
                onClick={handleAddGroup}
              >
                <Plus className="mr-1 h-4 w-4" />
                {t('settings:layoutDesigner.addGroup')}
              </Button>
            </div>
          </div>
        </SortableContext>
      </div>
    );
  }

  if (!isLayoutDesignerEnabled) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8">
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-semibold">
            {t('settings:layoutDesigner.experimentalFeature')}
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {t('settings:layoutDesigner.experimentalFeatureDescription')}
          </p>
          <Link to={`/settings/resources/${data.schemaName}/${data.tableName}`}>
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('settings:layoutDesigner.back')}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <div className="bg-muted/30 flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-3">
            <Link
              to={`/settings/resources/${data.schemaName}/${data.tableName}`}
            >
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t('settings:layoutDesigner.back')}
              </Button>
            </Link>

            <div>
              <h1 className="text-lg font-semibold">
                {t('settings:layoutDesigner.title')}
              </h1>

              <p className="text-muted-foreground text-sm">
                {data.displayName || data.tableName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAddGroup}>
              <Plus className="mr-1 h-4 w-4" />
              {t('settings:layoutDesigner.group')}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="mr-1 h-4 w-4" />
                  {t('settings:layoutDesigner.resetToDefault')}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('settings:layoutDesigner.resetConfirmTitle')}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t('settings:layoutDesigner.resetConfirmDescription')}
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t('settings:layoutDesigner.cancel')}
                  </AlertDialogCancel>

                  <AlertDialogAction
                    onClick={handleReset}
                    disabled={isSubmitting}
                  >
                    {t('settings:layoutDesigner.resetConfirmAction')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSubmitting || !hasChanges}
            >
              <Save className="mr-1 h-4 w-4" />
              {t('settings:layoutDesigner.save')}
              {hasChanges && (
                <span className="ml-1 text-xs text-orange-500">•</span>
              )}
            </Button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <DndContext
            sensors={sensors}
            collisionDetection={customCollisionDetection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {/* Main Layout Area - now comes first and takes remaining space */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="relative mx-auto">
                {/* Mode Tabs */}
                <Tabs
                  value={currentMode}
                  onValueChange={(value) => setCurrentMode(value as LayoutMode)}
                >
                  <div className="mb-4 flex items-center gap-x-2.5">
                    <TabsList className="sticky top-0">
                      <TabsTrigger
                        value="display"
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        {t('settings:layoutDesigner.displayMode')}
                      </TabsTrigger>

                      <TabsTrigger
                        value="edit"
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        {t('settings:layoutDesigner.editMode')}
                      </TabsTrigger>
                    </TabsList>

                    <div className="flex items-center">
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() =>
                          setCurrentMode(
                            currentMode === 'display' ? 'edit' : 'display',
                          )
                        }
                      >
                        {currentMode === 'display' ? (
                          <Edit className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}

                        <span className="ml-2">
                          {t('settings:layoutDesigner.switchTo', {
                            mode:
                              currentMode === 'display' ? 'edit' : 'display',
                          })}
                        </span>
                      </Button>
                    </div>
                  </div>

                  <TabsContent
                    value="display"
                    className="absolute w-full max-w-5xl flex-1 flex-col space-y-3 pb-24"
                  >
                    <div className="text-muted-foreground mb-3 flex items-center gap-2 text-sm">
                      <Info className="h-4 w-4" />
                      {t('settings:layoutDesigner.displayModeDescription')}
                    </div>

                    {renderGroups()}
                  </TabsContent>

                  <TabsContent
                    value="edit"
                    className="absolute w-full max-w-5xl flex-1 flex-col space-y-3 pb-24"
                  >
                    <div className="text-muted-foreground mb-3 flex items-center gap-2 text-sm">
                      <Info className="h-4 w-4" />
                      {t('settings:layoutDesigner.editModeDescription')}
                    </div>

                    {renderGroups()}
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Column Palette - now sticky on the right */}
            <div className="bg-background sticky top-0 z-10 flex max-w-72 flex-1 flex-col border-l">
              <div className="p-3">
                <h3 className="mb-2 text-sm font-medium">
                  {t('settings:layoutDesigner.availableColumnsCount', {
                    count: unusedColumns.length,
                  })}
                </h3>

                <div className="text-muted-foreground text-xs">
                  {currentMode === 'display'
                    ? t('settings:layoutDesigner.displayFieldsDescription')
                    : t('settings:layoutDesigner.editFieldsDescription')}
                </div>
              </div>

              <div className="relative flex flex-1 flex-col overflow-y-auto pb-16">
                <div className="absolute w-full space-y-1 p-3 pb-24">
                  {unusedColumns.map((column) => (
                    <DraggablePaletteItem
                      key={column.name}
                      column={column}
                      mode={currentMode}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
              {draggedItem && renderDragOverlay(draggedItem)}
            </DragOverlay>
          </DndContext>
        </div>
      </div>
    </Form>
  );
}
