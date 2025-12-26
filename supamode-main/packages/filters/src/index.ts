// Hooks
export { useFilterState } from './hooks/use-filter-state';

// Utilities
export * from './utils/filter-state';
export * from './utils/search-params';
export * from './utils/state-adapters';
export * from './utils/create-adapters';

// Date utilities (re-exported from centralized package)
export {
  isRelativeDate,
  extractRelativeDateOption,
  createRelativeDateValue,
  resolveRelativeDate,
  getDateRangeForOperator,
  isRangeOperator,
  mapDateOperator,
} from '@kit/filters-core';

// Local implementations for UI-specific functions
export {
  getRelativeDateRange,
  formatRelativeDateForDisplay,
  useFormatTimestamp,
} from './dates-utils';

// Operators
export * from './operators';

// Shared utilities
export * from './shared';

// Types for external use
export type {
  TableDataLoader,
  DisplayService,
  FilterValue,
  FilterItem,
  SortDirection,
  SortState,
  FiltersContainerProps,
  FilterOperator,
  Views,
  RelativeDateOption,
} from './types';
