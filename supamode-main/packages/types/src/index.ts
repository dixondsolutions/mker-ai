export type PostgresDataType =
  | 'integer'
  | 'bigint'
  | 'real'
  | 'double precision'
  | 'smallint'
  | 'character varying'
  | 'text'
  | 'boolean'
  | 'date'
  | 'timestamp'
  | 'timestamp with time zone'
  | 'time'
  | 'json'
  | 'jsonb'
  | 'bytea'
  | 'uuid'
  | 'inet'
  | 'macaddr'
  | 'numeric';

export type RelationType =
  | 'one_to_one'
  | 'one_to_many'
  | 'many_to_one'
  | 'many_to_many';

/**
 * Relation configuration
 */
export interface RelationConfig {
  type: RelationType;
  source_column: string;
  target_column: string;
  target_table: string;
  target_schema: string;
}

export type EnumBadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

/**
 * Column UI configuration
 */
export interface ColumnsUiConfig {
  data_type: PostgresDataType;
  ui_data_type?: string;
  ui_data_type_config?: Record<string, unknown>;
  is_enum?: boolean;
  enum_values?: string[];
  max_length?: number;
  enum_badges?: Record<
    string,
    {
      variant?: EnumBadgeVariant;
    }
  >;
  enable_smart_suggestions?: boolean;
  currency?: string;
  boolean_labels?: {
    true_label?: string;
    false_label?: string;
  };
}

/**
 * Column metadata
 */
export interface ColumnMetadata {
  name: string;
  ordering: number | null;
  display_name: string | null;
  description: string | null;
  is_searchable: boolean;
  /** Controls visibility in data table/list view */
  is_visible_in_table: boolean;
  /** Controls visibility in record detail/form view */
  is_visible_in_detail: boolean;
  default_value: string | null;
  is_sortable: boolean;
  is_filterable: boolean;
  is_editable: boolean;
  is_primary_key: boolean;
  is_required: boolean;
  relations: RelationConfig[];
  ui_config: ColumnsUiConfig;
}

export type ColumnsConfig = Record<string, ColumnMetadata>;

// Layout types for record forms
export type ColumnSize = 1 | 2 | 3 | 4;

export interface LayoutColumn {
  id: string;
  fieldName: string;
  size: ColumnSize;
  metadata?: ColumnMetadata;
}

export interface LayoutRow {
  id: string;
  columns: LayoutColumn[];
}

export interface LayoutGroup {
  id: string;
  label: string;
  rows: LayoutRow[];
  isCollapsed?: boolean;
}

export type LayoutMode = 'display' | 'edit';

export interface RecordLayoutConfig {
  id: string;
  name: string;
  display: LayoutGroup[];
  edit: LayoutGroup[];
}

// Legacy type for backward compatibility
export interface RecordLayout {
  id: string;
  name: string;
  rows: LayoutRow[];
  createdAt: string;
  updatedAt: string;
}

export type TableUiConfig = {
  primary_keys: Array<{
    column_name: string;
  }>;

  unique_constraints: {
    columns: string[];
    constraint_name: string;
  }[];

  recordLayout?: RecordLayoutConfig | null;
};
