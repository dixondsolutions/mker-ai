import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';

import { cn } from '@kit/ui/utils';

import { MAX_COLUMNS_PER_ROW } from '../../constants';
import { LayoutMode, LayoutRow } from '../../types';

interface DroppableRowProps {
  row: LayoutRow;
  groupId: string;
  mode: LayoutMode;
  children: React.ReactNode;
  draggedItemType?: string | null;
}

export function DroppableRow({
  row,
  groupId,
  mode,
  children,
  draggedItemType,
}: DroppableRowProps) {
  const { t } = useTranslation();
  const isEmpty = row.columns.length === 0;
  const totalSize = row.columns.reduce((sum, col) => sum + col.size, 0);
  const isFull = totalSize >= MAX_COLUMNS_PER_ROW;

  // Only make empty rows droppable for new columns
  const shouldBeDroppable =
    isEmpty &&
    (draggedItemType === 'available-column' || draggedItemType === 'column');

  const { isOver, setNodeRef } = useDroppable({
    id: `row-${row.id}-${mode}`,
    data: {
      type: 'row-drop-zone',
      groupId,
      rowId: row.id,
      mode,
    },
    disabled: !shouldBeDroppable,
  });

  // Only show hover effects when this specific row is being hovered
  const showHoverEffect = isOver && shouldBeDroppable;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'group relative rounded border border-dashed p-3 transition-all duration-200',
        // Make empty rows larger and more prominent for better targeting
        isEmpty ? 'min-h-[120px]' : 'min-h-[80px]',
        // Only show hover styles when actually over this specific row
        showHoverEffect &&
          'border-green-500 bg-green-50 ring-2 ring-green-200 dark:bg-green-900/30 dark:ring-green-800',
        // Default hover for non-droppable interactions
        isEmpty &&
          !shouldBeDroppable &&
          'hover:border-primary/50 hover:bg-primary/5',
        isFull && 'border-muted-foreground/20 bg-muted/5',
      )}
    >
      {children}

      {/* Only show hint when actually hovering over this row */}
      {showHoverEffect && (
        <div className="absolute top-1 right-1 z-10 rounded bg-green-600 px-2 py-1 text-xs text-white shadow-lg dark:bg-green-700">
          {t('settings:layoutDesigner.dropColumnHere')}
        </div>
      )}
    </div>
  );
}
