import type { LayoutRow } from '../types';

/**
 * Determines if a row insert zone should be shown based on drag state
 * @param position - 'before' or 'after' the row
 * @param rowIndex - Index of the current row
 * @param draggedRowIndex - Index of the row being dragged
 * @param _totalRows - Total number of rows (currently unused)
 * @returns Whether the zone should be displayed
 */
export function shouldShowRowInsertZone(
  position: 'before' | 'after',
  rowIndex: number,
  draggedRowIndex: number,
  _totalRows: number,
): boolean {
  if (position === 'before') {
    // Only show "before" zone for the first row, and only if not dragging the first row
    return rowIndex === 0 && draggedRowIndex !== 0;
  }

  // For "after" zones: don't show if dragged row would end up in same position
  return draggedRowIndex !== rowIndex && draggedRowIndex !== rowIndex + 1;
}

/**
 * Finds the index of the dragged row within a group
 * @param rows - Array of rows in the group
 * @param draggedRowId - ID of the row being dragged
 * @returns Index of the dragged row, or -1 if not found
 */
export function findDraggedRowIndex(
  rows: LayoutRow[],
  draggedRowId: string,
): number {
  return rows.findIndex((row) => row.id === draggedRowId);
}
