import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';

import { cn } from '@kit/ui/utils';

import { LayoutMode } from '../../types';

interface RowInsertZoneProps {
  position: 'before' | 'after';
  groupId: string;
  rowIndex: number;
  mode: LayoutMode;
}

export function RowInsertZone({
  position,
  groupId,
  rowIndex,
  mode,
}: RowInsertZoneProps) {
  const { t } = useTranslation();
  const { isOver, setNodeRef } = useDroppable({
    id: `row-insert-${position}-${groupId}-${rowIndex}-${mode}`,
    data: {
      type: 'row-insert-zone',
      position,
      groupId,
      rowIndex,
      mode,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex items-center justify-center transition-all duration-200',
        'hover:bg-blue-50 dark:hover:bg-blue-900/20',
        isOver ? 'h-12 bg-blue-100 dark:bg-blue-900/30' : 'h-8',
      )}
    >
      <div
        className={cn(
          'w-full rounded-full transition-all duration-200',
          isOver
            ? 'h-2 bg-blue-500 shadow-lg'
            : 'h-1 bg-blue-300 opacity-60 hover:opacity-90',
        )}
      />
      {isOver && (
        <div className="absolute z-20 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white shadow-lg dark:bg-blue-700">
          {t('settings:layoutDesigner.insertRowHere')}
        </div>
      )}
      {/* Larger invisible hit area for better targeting */}
      <div className="absolute inset-0 min-h-8" />
    </div>
  );
}
