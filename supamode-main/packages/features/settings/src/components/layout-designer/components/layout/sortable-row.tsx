import React, { useMemo } from 'react';

import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { cn } from '@kit/ui/utils';

import { MAX_COLUMNS_PER_ROW } from '../../constants';
import { ColumnSize, LayoutMode, LayoutRow } from '../../types';
import { ColumnInsertZone, DroppableRow } from '../drag-zones';
import { SortableColumn } from './sortable-column';

interface SortableRowProps {
  row: LayoutRow;
  groupId: string;
  mode: LayoutMode;
  onRemove: (rowId: string) => void;
  onRemoveColumn: (columnId: string) => void;
  onColumnSizeChange: (columnId: string, size: ColumnSize) => void;
  draggedItemType?: string | null;
}

export function SortableRow({
  row,
  groupId,
  mode,
  onRemove,
  onRemoveColumn,
  onColumnSizeChange,
  draggedItemType,
}: SortableRowProps) {
  const { t } = useTranslation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    transition: {
      duration: 150,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
    id: `sortable-row-${row.id}-${mode}`,
    data: { type: 'row', row, groupId, mode },
  });

  const style = useMemo(() => {
    return {
      transform: CSS.Transform.toString(transform),
      transition,
    };
  }, [transform, transition]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50')}
    >
      <DroppableRow
        row={row}
        groupId={groupId}
        mode={mode}
        draggedItemType={draggedItemType}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="hover:bg-muted/50 -ml-1 flex cursor-grab items-center gap-1 rounded p-2 hover:cursor-grabbing"
              title={t('settings:layoutDesigner.dragToReorderRow')}
            >
              <GripVertical className="text-muted-foreground h-3 w-3" />
              <div className="bg-muted-foreground/30 hidden h-0.5 w-4 rounded sm:block"></div>
            </div>

            <span className="text-muted-foreground text-xs">
              {(() => {
                const totalSize = row.columns.reduce(
                  (sum, col) => sum + col.size,
                  0,
                );

                const isRowFull = totalSize >= MAX_COLUMNS_PER_ROW;

                return (
                  <>
                    {t('settings:layoutDesigner.rowSizeUsed', {
                      used: totalSize,
                      max: MAX_COLUMNS_PER_ROW,
                      columns: row.columns.length,
                    })}
                    {isRowFull && (
                      <Badge
                        variant="secondary"
                        className="ml-2 px-1 py-0 text-[10px]"
                      >
                        {t('settings:layoutDesigner.rowFull')}
                      </Badge>
                    )}
                  </>
                );
              })()}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(row.id)}
            className="text-destructive h-5 w-5 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>

        {row.columns.length === 0 ? (
          <div className="text-muted-foreground/70 border-muted-foreground/20 bg-muted/10 group-hover:border-primary/40 group-hover:bg-primary/10 group-hover:text-primary flex h-16 items-center justify-center rounded border border-dashed text-sm font-medium transition-all">
            {t('settings:layoutDesigner.dropColumnsHere', {
              max: MAX_COLUMNS_PER_ROW,
            })}
          </div>
        ) : (
          <div className="relative min-h-[100px]">
            <div className="flex w-full items-stretch gap-1">
              {/* Before first column drop zone - only for new columns from palette */}
              {draggedItemType === 'available-column' && (
                <ColumnInsertZone
                  position="before"
                  rowId={row.id}
                  groupId={groupId}
                  columnIndex={0}
                  mode={mode}
                  draggedItemType={draggedItemType}
                  disabled={(() => {
                    const totalSize = row.columns.reduce(
                      (sum, col) => sum + col.size,
                      0,
                    );
                    return totalSize >= MAX_COLUMNS_PER_ROW;
                  })()}
                />
              )}

              <SortableContext
                items={row.columns.map((col) => `${col.id}-${mode}`)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex w-full items-stretch gap-1">
                  {row.columns.map((column, index) => (
                    <React.Fragment
                      key={`column-fragment-${column.id}-${mode}`}
                    >
                      <SortableColumn
                        column={column}
                        mode={mode}
                        onRemove={onRemoveColumn}
                        onSizeChange={onColumnSizeChange}
                        draggedItemType={draggedItemType}
                      />

                      {/* After column drop zone - only for new columns from palette */}
                      {draggedItemType === 'available-column' && (
                        <ColumnInsertZone
                          position="after"
                          rowId={row.id}
                          groupId={groupId}
                          columnIndex={index + 1}
                          mode={mode}
                          draggedItemType={draggedItemType}
                          disabled={(() => {
                            const totalSize = row.columns.reduce(
                              (sum, col) => sum + col.size,
                              0,
                            );
                            return totalSize >= MAX_COLUMNS_PER_ROW;
                          })()}
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </SortableContext>
            </div>
          </div>
        )}
      </DroppableRow>
    </div>
  );
}
