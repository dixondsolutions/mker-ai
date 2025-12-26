import { extractRelativeDateOption, isRelativeDate } from '@kit/filters-core';
import { ColumnMetadata, RelationConfig } from '@kit/types';

import { mapDateOperator } from '../operators';
import { FilterItem, FilterOperator, FilterValue, SortState } from '../types';

/**
 * Parses search parameters into filter items
 */
export function parseFiltersFromSearchParams(
  searchParams: URLSearchParams,
  columns: ColumnMetadata[],
  relations: RelationConfig[],
  relatedData: Array<{
    column: string;
    original: string;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>,
  formatTimestamp: (date: Date) => string,
  t: (key: string) => string,
): FilterItem[] {
  const filters: FilterItem[] = [];

  for (const [key, value] of searchParams.entries()) {
    // Skip sort parameters
    if (key === 'sort_column' || key === 'sort_direction') {
      continue;
    }

    // Parse the key in format column.operator
    const [columnName, operator] = key.split('.');

    // If no column name found, skip
    if (!columnName) {
      continue;
    }

    // If no operator found (backward compatibility), use default 'eq'
    let filterOperator = operator || 'eq';

    // Find the column definition
    const column = columns.find((col) => col.name === columnName);

    if (!column) {
      continue;
    }

    // Convert SQL operators to date-specific operators for date columns
    if (
      ['date', 'timestamp', 'timestamp with time zone'].includes(
        column.ui_config.data_type,
      )
    ) {
      filterOperator = mapSqlToDateOperator(filterOperator);
    }

    if (!value) {
      continue;
    }

    const filterValue = parseFilterValue(
      value,
      column,
      filterOperator,
      relations,
      relatedData,
      formatTimestamp,
      t,
    );

    const columnRelations = relations.filter(
      (r) => r.source_column === column.name,
    );

    filters.push({
      ...column,
      relations: columnRelations,
      values: [filterValue],
    });
  }

  return filters;
}

/**
 * Converts filters and sort state to search parameters
 */
export function filtersToSearchParams(
  filters: FilterItem[],
  sort: SortState,
  activeViewId: string,
  search: string,
): URLSearchParams {
  const params = new URLSearchParams();

  if (activeViewId) {
    params.set('view', activeViewId);
  }

  if (search) {
    params.set('search', search);
  }

  if (sort?.column) {
    params.set('sort_column', sort.column);
  }

  if (sort?.direction) {
    params.set('sort_direction', sort.direction);
  }

  filters.forEach((f) => {
    const filterValue = f.values[0];
    const value = filterValue?.value;

    let operator = filterValue?.operator || 'eq';

    // Map date-specific operators to their SQL equivalents for date/timestamp types
    if (
      ['date', 'timestamp', 'timestamp with time zone'].includes(
        f.ui_config.data_type,
      )
    ) {
      operator = mapDateOperator(operator as FilterOperator);
    }

    if (value !== undefined) {
      // Convert Date objects to ISO strings
      const stringValue =
        value instanceof Date ? value.toISOString() : String(value);

      // Set the param in the format column.operator=value
      params.set(`${f.name}.${operator}`, stringValue);
    }
  });

  return params;
}

/**
 * Maps SQL operators to date-specific operators
 */
function mapSqlToDateOperator(operator: string): string {
  switch (operator) {
    case 'lt':
      return 'before';
    case 'lte':
      return 'beforeOrOn';
    case 'gt':
      return 'after';
    case 'gte':
      return 'afterOrOn';
    case 'eq':
      return 'during';
    default:
      return operator;
  }
}

/**
 * Parses a filter value based on column type and metadata
 */
function parseFilterValue(
  value: string,
  column: ColumnMetadata,
  operator: string,
  relations: RelationConfig[],
  relatedData: Array<{
    column: string;
    original: string;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>,
  formatTimestamp: (date: Date) => string,
  t: (key: string) => string,
): FilterValue {
  const type = column.ui_config.data_type;
  const columnRelations = relations.filter(
    (r) => r.source_column === column.name,
  );

  // Initialize filter value
  let filterValue: FilterValue = {
    operator,
    value: value,
    label: value,
  };

  // Check if this is a relative date value
  if (
    ['date', 'timestamp', 'timestamp with time zone'].includes(type) &&
    isRelativeDate(value)
  ) {
    const relativeDateOption = extractRelativeDateOption(value);

    if (relativeDateOption) {
      filterValue = {
        operator,
        value: value,
        label: t(`dataExplorer:relativeDates.${relativeDateOption}`),
        isRelativeDate: true,
        relativeDateOption: relativeDateOption,
      };
    }
  }
  // Handle date and timestamp types (non-relative)
  else if (['date', 'timestamp', 'timestamp with time zone'].includes(type)) {
    try {
      const date = new Date(value);

      if (!Number.isNaN(date.getTime())) {
        filterValue = {
          operator,
          value: date,
          label: formatTimestamp(date),
        };
      }
    } catch {
      // If date parsing fails, keep the original value
    }
  }
  // Handle boolean values
  else if (type === 'boolean') {
    const boolValue = value.toLowerCase() === 'true';

    filterValue = {
      operator,
      value: boolValue,
      label: boolValue ? 'True' : 'False',
    };
  }
  // Handle enum values
  else if (column?.ui_config?.enum_values?.length) {
    filterValue.label = value; // Use the value as label for enums
  }

  // Handle relations
  if (columnRelations.length > 0) {
    const relation = columnRelations.find(
      (r) => r.source_column === column.name,
    );

    if (relation) {
      const record = relatedData.find(
        (r) => r.column === relation.source_column,
      );

      if (record && record.formatted) {
        filterValue.label = record.formatted;
      }
    }
  }

  return filterValue;
}
