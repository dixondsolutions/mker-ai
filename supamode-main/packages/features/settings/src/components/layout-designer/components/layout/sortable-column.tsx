import { useMemo } from 'react';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card } from '@kit/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { cn } from '@kit/ui/utils';

import { MAX_COLUMNS_PER_ROW } from '../../constants';
import { ColumnSize, LayoutColumn, LayoutMode } from '../../types';

interface SortableColumnProps {
  column: LayoutColumn;
  mode: LayoutMode;
  onRemove: (id: string) => void;
  onSizeChange: (id: string, size: ColumnSize) => void;
  draggedItemType?: string | null;
}

export function SortableColumn({
  column,
  mode,
  onRemove,
  onSizeChange,
  draggedItemType: _draggedItemType,
}: SortableColumnProps) {
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
    id: `${column.id}-${mode}`,
    data: { type: 'column', data: column, mode },
  });

  const style = useMemo(() => {
    return {
      transform: CSS.Transform.toString(transform),
      transition,
    };
  }, [transform, transition]);

  // Calculate visual width based on column size
  const visualWidth = useMemo(() => {
    const percentage = (column.size / MAX_COLUMNS_PER_ROW) * 100;
    return `${percentage}%`;
  }, [column.size]);

  const isVisible =
    mode === 'display' ? (column.metadata?.is_visible_in_detail ?? true) : true;

  const isEditable =
    mode === 'edit' ? (column.metadata?.is_editable ?? true) : true;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        flexBasis: visualWidth,
        minWidth: 0,
      }}
      className={cn(
        'transition-all duration-200',
        isDragging && 'z-50 opacity-50',
      )}
    >
      <Card
        className={cn(
          'bg-background relative border-dashed p-2 transition-colors hover:border-solid',
          !isVisible && mode === 'display' && 'opacity-60',
          !isEditable && mode === 'edit' && 'opacity-60',
        )}
      >
        <div className="mb-1 flex items-center justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-1">
            <div
              {...attributes}
              {...listeners}
              className="text-muted-foreground hover:text-foreground -ml-1 cursor-grab p-1 hover:cursor-grabbing"
              title={t('settings:layoutDesigner.dragToReorder')}
            >
              <GripVertical className="h-3 w-3" />
            </div>

            <div className="flex min-w-0 flex-1 items-center gap-1">
              <span className="truncate text-xs font-medium">
                {column.metadata?.display_name || column.fieldName}
              </span>
              <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                {column.size}/{MAX_COLUMNS_PER_ROW}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <div>
              <Select
                value={column.size.toString()}
                onValueChange={(value) =>
                  onSizeChange(column.id, Number(value) as ColumnSize)
                }
              >
                <SelectTrigger className="h-6 px-1.5 py-0.5 text-xs">
                  <SelectValue
                    placeholder={t('settings:layoutDesigner.selectSize')}
                  />
                </SelectTrigger>

                <SelectContent>
                  {[1, 2, 3, 4].map((size) => (
                    <SelectItem key={size} value={size.toString()}>
                      {size}/{MAX_COLUMNS_PER_ROW}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(column.id)}
              className="text-destructive hover:text-destructive h-5 w-5 p-0"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="text-muted-foreground text-xs">
          {column.metadata?.ui_config?.data_type || 'unknown'}
        </div>

        {/* Visual width indicator */}
        <div className="bg-muted mt-2 h-1 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-all duration-200"
            style={{ width: `${(column.size / MAX_COLUMNS_PER_ROW) * 100}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
