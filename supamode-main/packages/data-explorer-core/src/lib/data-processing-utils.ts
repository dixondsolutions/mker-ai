/**
 * Pure utility functions for data processing
 * These functions are extracted from services to enable unit testing
 */

/**
 * Clean the data by removing the total_count field
 * @param rows - The rows to clean
 * @returns The cleaned rows
 */
export function cleanQueryResultData(rows: unknown[]): unknown[] {
  return rows.map((row) => {
    const rowRecord = row as Record<string, unknown>;
    const { ['total_count']: _totalCount, ...cleanRow } = rowRecord;
    return cleanRow;
  });
}

/**
 * Get the page count from total count and page size
 * @param totalCount - The total count of rows
 * @param pageSize - The page size
 * @returns The page count
 */
export function calculatePageCount(
  totalCount: number,
  pageSize: number,
): number {
  return Math.ceil(totalCount / pageSize);
}

/**
 * Extract the total count from query result rows
 * @param rows - The rows to get the total count from
 * @returns The total count of rows
 */
export function extractTotalCount(rows: unknown[]): number {
  return rows.length > 0
    ? Number((rows[0] as Record<string, unknown>)['total_count'])
    : 0;
}

/**
 * Check if a data type should not have empty string checks
 * @param dataType - The data type to check
 * @returns True if the type should not have empty string checks
 */
export function isTypeWithoutEmptyStrings(dataType: string): boolean {
  const normalizedType = dataType.toLowerCase().trim();

  // UUID types (including variations)
  if (normalizedType === 'uuid' || normalizedType.includes('uuid')) {
    return true;
  }

  // Boolean types
  if (normalizedType === 'boolean' || normalizedType === 'bool') {
    return true;
  }

  // JSON types
  if (normalizedType === 'json' || normalizedType === 'jsonb') {
    return true;
  }

  // Numeric types
  if (
    normalizedType.includes('int') ||
    normalizedType.includes('numeric') ||
    normalizedType.includes('decimal') ||
    normalizedType.includes('float') ||
    normalizedType.includes('real') ||
    normalizedType.includes('double')
  ) {
    return true;
  }

  // Date/time types
  if (
    normalizedType.includes('timestamp') ||
    normalizedType.includes('date') ||
    normalizedType.includes('time')
  ) {
    return true;
  }

  return false;
}

/**
 * Quote PostgreSQL identifier
 * @param identifier - The identifier to quote
 * @returns The quoted identifier
 */
export function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

/**
 * Build aggregation expression
 * @param aggregation - The aggregation type
 * @param column - The column name
 * @returns The aggregation expression
 */
export function buildAggregationExpression(
  aggregation: string,
  column: string,
): string {
  const quotedColumn = quoteIdentifier(column);

  switch (aggregation.toLowerCase()) {
    case 'count':
      return `COUNT(${quotedColumn})`;
    case 'sum':
      return `SUM(${quotedColumn})`;
    case 'avg':
      return `AVG(${quotedColumn})`;
    case 'min':
      return `MIN(${quotedColumn})`;
    case 'max':
      return `MAX(${quotedColumn})`;
    default:
      throw new Error(`Unsupported aggregation type: ${aggregation}`);
  }
}

/**
 * Parse search pattern for LIKE queries
 * @param search - The search string
 * @returns The search pattern with wildcards
 */
export function parseSearchPattern(search?: string): string | undefined {
  if (!search || !search.trim()) {
    return undefined;
  }

  return `%${search.trim()}%`;
}

/**
 * Validate column names array
 * @param columns - Array of column names to validate
 * @returns True if all columns are valid
 */
export function validateColumnNames(columns: string[]): boolean {
  return columns.every(
    (col) =>
      typeof col === 'string' &&
      col.length > 0 &&
      col.length <= 63 && // PostgreSQL identifier limit
      /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col), // Valid identifier pattern
  );
}
