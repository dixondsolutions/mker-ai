import { ColumnMetadata, RecordLayoutConfig } from '@kit/types';

export type LayoutMode = 'display' | 'edit';

/**
 * Helper function to check if a custom layout has any renderable fields for the specified mode
 */
export function hasRenderableFields(
  layout: RecordLayoutConfig,
  columns: ColumnMetadata[],
  mode: LayoutMode,
): boolean {
  // Get the appropriate layout groups based on mode
  const layoutGroups = mode === 'display' ? layout.display : layout.edit;

  // No groups means no content
  if (!layoutGroups || layoutGroups.length === 0) {
    return false;
  }

  // Create a map for quick column lookup
  const columnMap = new Map(columns.map((col) => [col.name, col]));

  // Check if any field in the layout meets the criteria for the specified mode
  return layoutGroups.some(
    (group) =>
      group.rows &&
      group.rows.length > 0 &&
      group.rows.some(
        (row) =>
          row.columns &&
          row.columns.length > 0 &&
          row.columns.some((layoutColumn) => {
            const column = columnMap.get(layoutColumn.fieldName);
            if (!column) {
              return false;
            }

            // Check the appropriate visibility/editability based on mode
            return mode === 'display'
              ? column.is_visible_in_detail
              : column.is_editable;
          }),
      ),
  );
}

/**
 * Helper function to check if a custom layout has any renderable fields for display mode
 * @deprecated Use hasRenderableFields with mode 'display' instead
 */
export function hasRenderableDisplayFields(
  layout: RecordLayoutConfig,
  columns: ColumnMetadata[],
): boolean {
  return hasRenderableFields(layout, columns, 'display');
}

/**
 * Helper function to check if a custom layout has any renderable fields for edit mode
 * @deprecated Use hasRenderableFields with mode 'edit' instead
 */
export function hasRenderableEditFields(
  layout: RecordLayoutConfig,
  columns: ColumnMetadata[],
): boolean {
  return hasRenderableFields(layout, columns, 'edit');
}
