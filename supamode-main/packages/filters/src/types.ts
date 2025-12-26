import { BatchSelection } from '@kit/shared/hooks';
import { savedViewsInSupamode } from '@kit/supabase/schema';
import { ColumnMetadata, RelationConfig } from '@kit/types';

// ColumnManagementState is defined inline below since it's specific to data-explorer
// This matches the interface expected by ColumnManagementPopover
export type ColumnManagementState = {
  columnVisibility: Record<string, boolean>;
  columnPinning: { left?: string[]; right?: string[] };
  toggleColumnVisibility: (columnId: string) => void;
  toggleColumnPin: (columnId: string, side?: 'left' | 'right') => void;
  isColumnPinned: (columnId: string) => 'left' | 'right' | false;
  resetPreferences: () => void;
};

export type FilterValue<Config = Record<string, unknown>> = {
  operator: string;
  value: string | boolean | number | Date | null;
  label?: string;
  isRelativeDate?: boolean; // Flag to identify relative date values
  relativeDateOption?: RelativeDateOption; // The relative date option if applicable
  config?: Config;
};

// Add a type for relative date options
export type RelativeDateOption =
  | 'today'
  | 'yesterday'
  | 'tomorrow'
  | 'thisWeek'
  | 'lastWeek'
  | 'nextWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'nextMonth'
  | 'last7Days'
  | 'next7Days'
  | 'last30Days'
  | 'next30Days'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export type FilterItem = ColumnMetadata & {
  values: FilterValue[];
  relations?: RelationConfig[];
};

// Add sort type definitions
export type SortDirection = 'asc' | 'desc';

export type SortState = {
  column: string | null;
  direction: SortDirection | null;
};

export interface FiltersContainerProps {
  columns: ColumnMetadata[];
  className: string;
  views?: Views;
  schemaName?: string;
  tableName?: string;
  relations: RelationConfig[];
  batchSelection: BatchSelection<Record<string, unknown>>;
  relatedData: Array<{
    column: string;
    original: string;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>;

  permissions: {
    canDelete: boolean;
  };

  onClearFilterContext?: () => void; // Add prop to clear filter context
  columnManagementState?: ColumnManagementState | null; // Column management state from table
}

// Operator definitions and mapping
export type FilterOperator =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'notNull'
  | 'between'
  | 'notBetween'
  | 'before'
  | 'beforeOrOn'
  | 'after'
  | 'afterOrOn'
  | 'during'
  | 'containsText'
  | 'hasKey'
  | 'keyEquals'
  | 'pathExists';

export type Views = {
  personal: (typeof savedViewsInSupamode.$inferSelect)[];
  team: (typeof savedViewsInSupamode.$inferSelect)[];
};

/**
 * Type definition for the table data loader function
 * Used to inject data loading functionality into filter components
 */
export type TableDataLoader = (params: {
  schema: string;
  table: string;
  page: number;
  search: string;
  properties: string | undefined;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}) => Promise<{
  data: Record<string, unknown>[];
  table: {
    displayFormat?: string;
  };
}>;

/**
 * Type definition for the display service
 * Used to format displayed values in filter components
 */
export type DisplayService = {
  applyDisplayFormat: (format: string, item: Record<string, unknown>) => string;
};
