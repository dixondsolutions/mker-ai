import React from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  GripVertical,
  Plus,
  PlusCircleIcon,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import { Input } from '@kit/ui/input';
import { cn } from '@kit/ui/utils';

import { ColumnSize, LayoutGroup, LayoutMode } from '../../types';
import {
  findDraggedRowIndex,
  shouldShowRowInsertZone,
} from '../../utils/row-zone-helpers';
import { RowInsertZone } from '../drag-zones';
import { SortableRow } from './sortable-row';

interface SortableGroupProps {
  group: LayoutGroup;
  mode: LayoutMode;
  onToggle: (groupId: string) => void;
  onAddRow: (groupId: string) => void;
  onRemoveRow: (rowId: string) => void;
  onRemoveColumn: (columnId: string) => void;
  onColumnSizeChange: (columnId: string, size: ColumnSize) => void;
  onUpdateLabel: (groupId: string, label: string) => void;
  onRemoveGroup: (groupId: string) => void;
  draggedItemType?: string | null;
  draggedRowId?: string | null;
}

export function SortableGroup({
  group,
  mode,
  onToggle,
  onAddRow,
  onRemoveRow,
  onRemoveColumn,
  onColumnSizeChange,
  onUpdateLabel,
  onRemoveGroup,
  draggedItemType,
  draggedRowId,
}: SortableGroupProps) {
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
    id: `sortable-group-${group.id}-${mode}`,
    data: { type: 'group', group, mode },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-50')}
    >
      <Card className="p-3">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              {...attributes}
              {...listeners}
              className="hover:bg-muted/50 -ml-1 flex cursor-grab items-center gap-1 rounded p-2 hover:cursor-grabbing"
              title={t('settings:layoutDesigner.dragToReorderGroup')}
            >
              <GripVertical className="text-muted-foreground h-4 w-4" />
              <div className="bg-muted-foreground/30 hidden h-1 w-6 rounded sm:block"></div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggle(group.id)}
              className="h-6 w-6 p-0"
            >
              {group.isCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
            {group.isCollapsed ? (
              <Folder className="text-muted-foreground h-4 w-4" />
            ) : (
              <FolderOpen className="text-muted-foreground h-4 w-4" />
            )}
            <Input
              value={group.label}
              onChange={(e) => onUpdateLabel(group.id, e.target.value)}
              className="h-6 border-none bg-transparent p-0 text-sm font-medium focus-visible:ring-0"
            />
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddRow(group.id)}
              className="h-6 text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              {t('settings:layoutDesigner.row')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveGroup(group.id)}
              className="text-destructive h-6 w-6 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {!group.isCollapsed && (
          <div className="relative space-y-2">
            {/* Row insert zones only when actively dragging rows */}
            {draggedItemType === 'row' &&
              draggedRowId &&
              group.rows.length > 0 && (
                <>
                  {(() => {
                    const draggedRowIndex = findDraggedRowIndex(
                      group.rows,
                      draggedRowId,
                    );

                    return group.rows.map((row, rowIndex) => (
                      <React.Fragment key={`fragment-${row.id}`}>
                        {/* Show zone before first row if appropriate */}
                        {shouldShowRowInsertZone(
                          'before',
                          rowIndex,
                          draggedRowIndex,
                          group.rows.length,
                        ) && (
                          <RowInsertZone
                            position="before"
                            groupId={group.id}
                            rowIndex={0}
                            mode={mode}
                          />
                        )}

                        <SortableRow
                          row={row}
                          groupId={group.id}
                          mode={mode}
                          onRemove={onRemoveRow}
                          onRemoveColumn={onRemoveColumn}
                          onColumnSizeChange={onColumnSizeChange}
                          draggedItemType={draggedItemType}
                        />

                        {/* Show zone after this row if appropriate */}
                        {shouldShowRowInsertZone(
                          'after',
                          rowIndex,
                          draggedRowIndex,
                          group.rows.length,
                        ) && (
                          <RowInsertZone
                            position="after"
                            groupId={group.id}
                            rowIndex={rowIndex + 1}
                            mode={mode}
                          />
                        )}
                      </React.Fragment>
                    ));
                  })()}
                </>
              )}

            {/* Normal row rendering when not dragging rows */}
            {draggedItemType !== 'row' && (
              <>
                {group.rows.map((row) => (
                  <SortableRow
                    key={row.id}
                    row={row}
                    groupId={group.id}
                    mode={mode}
                    onRemove={onRemoveRow}
                    onRemoveColumn={onRemoveColumn}
                    onColumnSizeChange={onColumnSizeChange}
                    draggedItemType={draggedItemType}
                  />
                ))}
              </>
            )}

            <div className="text-muted-foreground flex h-12 items-center justify-center text-sm">
              <Button
                size="sm"
                variant={'secondary'}
                onClick={() => onAddRow(group.id)}
              >
                <PlusCircleIcon className="mr-1 h-3 w-3" />
                {t('settings:layoutDesigner.addRow')}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
