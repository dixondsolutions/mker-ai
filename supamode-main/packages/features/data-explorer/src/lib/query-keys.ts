/**
 * Query key factories for data-explorer
 * Ensures consistent query key generation for cache invalidation
 */

export const dataExplorerQueryKeys = {
  // Table data with filters
  tableData: (
    schema: string,
    table: string,
    filters?: Record<string, unknown>,
  ) => ['table-data', schema, table, filters] as const,

  // Individual record data
  record: (
    schema: string,
    table: string,
    recordId: string | Record<string, unknown>,
  ) => ['record', schema, table, recordId] as const,

  // Table metadata (structure, columns, etc.)
  tableMetadata: (schema: string, table: string) =>
    ['table-metadata', schema, table] as const,

  // Saved views for a table
  savedViews: (schema: string, table: string) =>
    ['saved-views', schema, table] as const,

  // Permissions for a table
  permissions: (schema: string, table: string) =>
    ['permissions', schema, table] as const,

  // Field values for autocomplete
  fieldValues: (
    schema: string,
    table: string,
    field: string,
    search?: string,
  ) => ['field-values', schema, table, field, search] as const,

  // Utility functions for cache invalidation
  all: () => ['data-explorer'] as const,
  allTableData: () => ['table-data'] as const,
  allRecords: () => ['record'] as const,
  allForTable: (schema: string, table: string) => ({
    tableData: (filters?: Record<string, unknown>) =>
      dataExplorerQueryKeys.tableData(schema, table, filters),
    records: () => ['record', schema, table] as const,
    metadata: () => dataExplorerQueryKeys.tableMetadata(schema, table),
    savedViews: () => dataExplorerQueryKeys.savedViews(schema, table),
    permissions: () => dataExplorerQueryKeys.permissions(schema, table),
  }),
};
