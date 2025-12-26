import type { DragItem, RowDragItem } from '../types';

/**
 * Type guards for drag items
 */
export function isRowDragItem(item: DragItem | null): item is RowDragItem {
  return item?.type === 'row';
}

export function isColumnDragItem(item: DragItem | null): boolean {
  return item?.type === 'column';
}

export function isAvailableColumnDragItem(item: DragItem | null): boolean {
  return item?.type === 'available-column';
}

/**
 * Extracts dragged row ID safely with type checking
 */
export function getDraggedRowId(draggedItem: DragItem | null): string | null {
  return isRowDragItem(draggedItem) ? (draggedItem.row?.id ?? null) : null;
}

/**
 * Collision detection ID patterns
 */
export const COLLISION_ID_PATTERNS = {
  COLUMN_SORTABLE: ['-display', '-edit'],
  COLUMN_INSERT: 'insert-',
  ROW_INSERT: 'row-insert-',
  ROW_DROP: 'row-',
} as const;

/**
 * Check if collision ID matches a pattern
 */
export function matchesCollisionPattern(
  id: string,
  pattern: string | readonly string[],
): boolean {
  if (Array.isArray(pattern)) {
    return pattern.some((p) => id.includes(p));
  }
  return id.includes(pattern as string);
}
