import { FilterOperator } from './types';

/**
 * Text operators
 */
export const textOperators = [
  'eq',
  'neq',
  'contains',
  'startsWith',
  'endsWith',
  'isNull',
  'notNull',
] satisfies FilterOperator[];

/**
 * Numeric operators
 */
export const numericOperators = [
  'eq',
  'neq',
  'lt',
  'lte',
  'gt',
  'gte',
  'between',
  'notBetween',
] satisfies FilterOperator[];

/**
 * Date operators
 */
export const dateOperators = [
  'eq',
  'neq',
  'before',
  'beforeOrOn',
  'after',
  'afterOrOn',
  'between',
  'notBetween',
] satisfies FilterOperator[];

/**
 * JSON operators
 */
export const jsonOperators = [
  'eq',
  'neq',
  'containsText',
  'hasKey',
  'keyEquals',
  'pathExists',
  'isNull',
  'notNull',
] satisfies FilterOperator[];

/**
 * Map of data types to operators
 */
export const operatorMap: Record<string, FilterOperator[]> = {
  // Text types
  text: textOperators,
  'character varying': textOperators,
  // Numeric types
  integer: numericOperators,
  bigint: numericOperators,
  smallint: numericOperators,
  numeric: numericOperators,
  real: numericOperators,
  'double precision': numericOperators,
  // Boolean
  boolean: ['eq', 'isNull', 'notNull'],
  // Date/time
  date: dateOperators,
  timestamp: dateOperators,
  'timestamp with time zone': dateOperators,
  // UUID
  uuid: ['eq', 'neq', 'isNull', 'notNull'],
  // Enum
  enum: ['eq', 'neq', 'isNull', 'notNull'],
  // JSON
  json: jsonOperators,
  jsonb: jsonOperators,
  // Fallback
  default: ['eq', 'neq', 'isNull', 'notNull'],
};

/**
 * Map date operators to SQL operators
 * @param operator - The date operator to map
 * @returns The SQL operator
 */
export function mapDateOperator(operator: FilterOperator): FilterOperator {
  switch (operator) {
    case 'before':
      return 'lt';
    case 'beforeOrOn':
      return 'lte';
    case 'after':
      return 'gt';
    case 'afterOrOn':
      return 'gte';
    case 'during':
      return 'eq';
    default:
      return operator;
  }
}

/**
 * Get the operators for a given data type
 * @param dataType - The data type to get operators for
 * @param isEnum - Whether the data type is an enum
 * @returns The operators for the given data type
 */
export function getOperatorsForDataType(
  dataType: string,
  isEnum?: boolean,
): FilterOperator[] {
  if (isEnum) {
    return operatorMap['enum'] ?? operatorMap['default'] ?? [];
  }

  const type = dataType?.toLowerCase();

  return operatorMap[type] ?? operatorMap['default'] ?? [];
}

/**
 * Map SQL operators to date-specific operators for display
 */
export function mapSqlToDateOperator(
  operator: string,
  dataType: string,
): string {
  if (!['date', 'timestamp', 'timestamp with time zone'].includes(dataType)) {
    return operator;
  }

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
