import isEqual from 'react-fast-compare';

import type { ColumnMetadata, RelationConfig } from '@kit/types';

import { hasValidValue } from '../shared';
import type {
  FilterItem,
  FilterValue,
  SortDirection,
  SortState,
} from '../types';

/**
 * Creates a new filter item from a column
 */
export function createFilterItem(
  column: ColumnMetadata,
  relations: RelationConfig[],
): FilterItem {
  return {
    ...column,
    values: [{ operator: 'eq', value: null }],
    relations: relations.filter((r) => r.source_column === column.name),
  };
}

/**
 * Updates a filter value in the filters array
 */
export function updateFilterValue(
  filters: FilterItem[],
  column: ColumnMetadata,
  filterValue: FilterValue,
): FilterItem[] {
  return filters.map((f) =>
    f.name === column.name ? { ...f, values: [filterValue] } : f,
  );
}

/**
 * Removes a filter from the filters array
 */
export function removeFilter(
  filters: FilterItem[],
  columnName: string,
): FilterItem[] {
  return filters.filter((f) => f.name !== columnName);
}

/**
 * Adds a filter to the filters array if it doesn't already exist
 */
export function addFilter(
  filters: FilterItem[],
  column: ColumnMetadata,
  relations: RelationConfig[],
): FilterItem[] {
  // Only add if not already in filters
  if (filters.some((f) => f.name === column.name)) {
    return filters;
  }

  return [...filters, createFilterItem(column, relations)];
}

/**
 * Updates a filter in the filters array
 */
export function updateFilter(
  filters: FilterItem[],
  updatedFilter: FilterItem,
): FilterItem[] {
  return filters.map((f) =>
    f.name === updatedFilter.name ? updatedFilter : f,
  );
}

/**
 * Validates if filters have changed meaningfully
 */
export function filtersChanged(
  oldFilters: FilterItem[],
  newFilters: FilterItem[],
): boolean {
  return !isEqual(oldFilters, newFilters);
}

/**
 * Removes invalid filters (filters without valid values)
 */
export function removeInvalidFilters(filters: FilterItem[]): FilterItem[] {
  return filters.filter(hasValidValue);
}

/**
 * Gets sortable columns from a columns array
 */
export function getSortableColumns(
  columns: ColumnMetadata[],
): ColumnMetadata[] {
  return columns.filter((col) => col.is_sortable);
}

/**
 * Creates a new sort state
 */
export function createSortState(
  column: string,
  direction: SortDirection,
  columns: ColumnMetadata[],
): SortState & { columnName?: string } {
  const columnName =
    columns.find((col) => col.name === column)?.display_name || column;

  return { column, direction, columnName };
}

/**
 * Clears sort state
 */
export function clearSortState(): SortState {
  return {
    column: '',
    direction: null,
  };
}
