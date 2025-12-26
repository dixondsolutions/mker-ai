import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';

import { cn } from '@kit/ui/utils';

import { LayoutMode } from '../../types';

interface ColumnInsertZoneProps {
  position: 'before' | 'after';
  rowId: string;
  groupId: string;
  columnIndex: number;
  mode: LayoutMode;
  draggedItemType?: string | null;
  disabled?: boolean;
}

export function ColumnInsertZone({
  position,
  rowId,
  groupId,
  columnIndex,
  mode,
  draggedItemType,
  disabled = false,
}: ColumnInsertZoneProps) {
  const { t } = useTranslation();
  const shouldShow =
    (draggedItemType === 'available-column' || draggedItemType === 'column') &&
    !disabled;

  const { isOver, setNodeRef } = useDroppable({
    id: `insert-${position}-${rowId}-${columnIndex}-${mode}`,
    data: {
      type: 'column-insert-zone',
      position,
      rowId,
      groupId,
      columnIndex,
      mode,
    },
    disabled: !shouldShow,
  });

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex min-h-[100px] items-center justify-center transition-all duration-200',
        // Only show when actively dragging and column can be inserted
        shouldShow && draggedItemType ? 'w-8' : 'w-2',
        isOver && 'w-12',
        shouldShow &&
          draggedItemType &&
          'hover:bg-green-50 hover:dark:bg-green-900/20',
      )}
    >
      <div
        className={cn(
          'h-20 rounded-full transition-all duration-200',
          isOver
            ? 'w-2 bg-green-500 shadow-lg'
            : shouldShow && draggedItemType
              ? 'w-1 bg-green-300 opacity-50'
              : 'w-0 bg-transparent',
        )}
      />
      {isOver && (
        <div className="absolute z-20 rounded bg-green-600 px-2 py-1 text-xs whitespace-nowrap text-white shadow-lg dark:bg-green-700">
          {t('settings:layoutDesigner.insertHere')}
        </div>
      )}
      {/* Larger hit area only when should show */}
      {shouldShow && draggedItemType && (
        <div className="absolute inset-0 min-w-8" />
      )}
    </div>
  );
}
