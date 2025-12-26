import { useDraggable } from '@dnd-kit/core';
import { EyeOff, GripVertical, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { ColumnMetadata } from '@kit/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { cn } from '@kit/ui/utils';

import { LayoutMode } from '../../types';

interface DraggablePaletteItemProps {
  column: ColumnMetadata;
  mode: LayoutMode;
}

export function DraggablePaletteItem({
  column,
  mode,
}: DraggablePaletteItemProps) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `available-${column.name}-${mode}`,
      data: {
        type: 'available-column',
        data: column,
        mode,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const isVisible = mode === 'display' ? column.is_visible_in_detail : true;
  const isEditable = mode === 'edit' ? column.is_editable : true;
  const shouldShow = mode === 'display' ? isVisible : isEditable;

  if (!shouldShow) {
    return null; // Don't show fields that aren't relevant for this mode
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            style={style}
            {...listeners}
            {...attributes}
            className={cn(
              'bg-card hover:bg-accent cursor-grab rounded border p-2 transition-colors active:cursor-grabbing',
              isDragging && 'opacity-50',
              !isVisible && mode === 'display' && 'opacity-60',
              !isEditable && mode === 'edit' && 'opacity-60',
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className="text-muted-foreground hover:text-foreground flex cursor-grab items-center justify-center p-1 hover:cursor-grabbing"
                title={t('settings:layoutDesigner.dragToAddToLayout')}
              >
                <GripVertical className="h-3 w-3" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="truncate text-xs font-medium">
                    {column.display_name || column.name}
                  </span>
                  {mode === 'display' && !column.is_visible_in_detail && (
                    <EyeOff className="text-muted-foreground h-3 w-3" />
                  )}
                  {mode === 'edit' && !column.is_editable && (
                    <Lock className="text-muted-foreground h-3 w-3" />
                  )}
                </div>
                <div className="text-muted-foreground text-xs">
                  {column.ui_config.data_type}
                </div>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-medium">
              {column.display_name || column.name}
            </div>
            <div className="text-muted-foreground">
              {column.ui_config.data_type}
            </div>
            {mode === 'display' && !column.is_visible_in_detail && (
              <div className="text-amber-500">
                {t('settings:layoutDesigner.hiddenInDetailView')}
              </div>
            )}
            {mode === 'edit' && !column.is_editable && (
              <div className="text-amber-500">
                {t('settings:layoutDesigner.readOnlyField')}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
