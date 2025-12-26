// Import date-fns functions to match the exact behavior of FilterBuilder's relative date processing
import { endOfDay, startOfDay } from 'date-fns';

import type {
  FilterCondition,
  FilterContext,
  FilterHandler,
} from '@kit/filters-core';

/**
 * Helper function to safely escape SQL values
 */
function safelyEscapeValue(key: string, value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "''")}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `(${value.map((v) => safelyEscapeValue(key, v)).join(', ')})`;
  }

  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
  }

  return `'${String(value).replace(/'/g, "''")}'`;
}

/**
 * Custom handler for JSON/JSONB operators specific to data-explorer
 */
export const jsonOperatorHandler: FilterHandler = {
  canHandle(condition: FilterCondition, context: FilterContext): boolean {
    const column = context.columns.find((col) => col.name === condition.column);
    const dataType = column?.ui_config?.data_type?.toLowerCase();
    const jsonOperators = ['hasKey', 'keyEquals', 'pathExists', 'containsText'];

    return (
      (dataType === 'json' || dataType === 'jsonb') &&
      jsonOperators.includes(condition.operator)
    );
  },

  process(condition: FilterCondition, _context: FilterContext): string {
    const { column, operator, value } = condition;

    switch (operator) {
      case 'containsText':
        // Use text search on JSON converted to string
        return `"${column}"::text ILIKE ${safelyEscapeValue(column, value)}`;

      case 'hasKey':
        // Check if JSON contains the key
        return `"${column}" ? ${safelyEscapeValue(column, value)}`;

      case 'keyEquals': {
        // Check if JSON contains the key-value pair
        const escapedValue = safelyEscapeValue(column, value);

        // Extract the key and value from the original input to create alternatives
        const [jsonKey, jsonVal] = (value as string).split(':');
        if (
          jsonKey &&
          jsonVal &&
          (jsonVal.trim() === 'true' || jsonVal.trim() === 'false')
        ) {
          // For boolean-like values, try both string and boolean versions
          const stringVersion = `'{"${jsonKey.trim()}": "${jsonVal.trim()}"}'`;
          const boolVersion = `'{"${jsonKey.trim()}": ${jsonVal.trim()}}'`;

          return `("${column}" @> ${stringVersion} OR "${column}" @> ${boolVersion})`;
        }

        return `"${column}" @> ${escapedValue}`;
      }

      case 'pathExists':
        // Check if JSON path exists using PostgreSQL path operator
        return `"${column}" #> ${safelyEscapeValue(column, value)} IS NOT NULL`;

      default:
        throw new Error(`Unsupported JSON operator: ${operator}`);
    }
  },
};

/**
 * Custom handler for PostgreSQL array operators
 */
export const arrayOperatorHandler: FilterHandler = {
  canHandle(condition: FilterCondition, _context: FilterContext): boolean {
    const arrayOperators = ['arrayContains', 'arrayContainedBy', 'overlaps'];
    return arrayOperators.includes(condition.operator);
  },

  process(condition: FilterCondition, _context: FilterContext): string {
    const { column, operator, value } = condition;

    const operatorMap = {
      arrayContains: '@>',
      arrayContainedBy: '<@',
      overlaps: '&&',
    };

    const sqlOperator = operatorMap[operator as keyof typeof operatorMap];
    if (!sqlOperator) {
      throw new Error(`Unsupported array operator: ${operator}`);
    }

    return `"${column}" ${sqlOperator} ${safelyEscapeValue(column, value)}`;
  },
};

/**
 * Custom handler for enhanced date processing with data-explorer specific logic
 */
export const enhancedDateHandler: FilterHandler = {
  canHandle(condition: FilterCondition, context: FilterContext): boolean {
    const column = context.columns.find((col) => col.name === condition.column);
    const dataType = column?.ui_config?.data_type?.toLowerCase();

    if (
      !['date', 'timestamp', 'timestamp with time zone'].includes(
        dataType || '',
      )
    ) {
      return false;
    }

    // Handle 'eq' operations for non-relative date values only
    // Let the standard FilterBuilder handle relative dates
    if (condition.operator === 'eq') {
      return (
        typeof condition.value === 'string' &&
        !condition.value.startsWith('__rel_date:')
      );
    }

    // Only handle 'between'/'notBetween' operations with array values
    // Let betweenOperatorHandler handle comma-separated string values
    if (
      condition.operator === 'between' ||
      condition.operator === 'notBetween'
    ) {
      return Array.isArray(condition.value);
    }

    return false;
  },

  process(condition: FilterCondition, _context: FilterContext): string {
    const { column, operator, value } = condition;

    // Handle BETWEEN operators with array values (from relative date processing)
    if (
      (operator === 'between' || operator === 'notBetween') &&
      Array.isArray(value)
    ) {
      if (value.length === 2) {
        const [start, end] = value;
        const startVal = safelyEscapeValue(column, start);
        const endVal = safelyEscapeValue(column, end);

        if (operator === 'between') {
          return `"${column}" BETWEEN ${startVal} AND ${endVal}`;
        } else {
          return `"${column}" NOT BETWEEN ${startVal} AND ${endVal}`;
        }
      }
    }

    // For equals operators on date ranges from relative dates
    if (operator === 'eq' && Array.isArray(value) && value.length === 2) {
      const [start, end] = value;
      const startVal = safelyEscapeValue(column, start);
      const endVal = safelyEscapeValue(column, end);

      // For "equals a month/week/etc", we want to check if the date is between start and end
      return `"${column}" BETWEEN ${startVal} AND ${endVal}`;
    }

    // For custom/absolute dates with 'eq' operator, treat as day range
    if (
      operator === 'eq' &&
      typeof value === 'string' &&
      !value.startsWith('__rel_date:')
    ) {
      try {
        const inputDate = new Date(value);
        if (!Number.isNaN(inputDate.getTime())) {
          // Use the exact same logic as FilterBuilder's relative date processing
          // Apply startOfDay/endOfDay to the input date in the same timezone context
          const today = startOfDay(inputDate);
          const endOfToday = endOfDay(inputDate);
          return `"${column}" BETWEEN '${today.toISOString()}' AND '${endOfToday.toISOString()}'`;
        }
      } catch {
        // Fall through to default processing
      }
    }

    // Return empty string to let default processing handle it
    return '';
  },
};

/**
 * Custom handler for BETWEEN operator with comma-separated values
 */
export const betweenOperatorHandler: FilterHandler = {
  canHandle(condition: FilterCondition, _context: FilterContext): boolean {
    const result =
      (condition.operator === 'between' ||
        condition.operator === 'notBetween') &&
      typeof condition.value === 'string' &&
      condition.value.includes(',');

    return result;
  },

  process(condition: FilterCondition, _context: FilterContext): string {
    const { column, operator, value } = condition;

    if (typeof value !== 'string' || !value.includes(',')) {
      throw new Error('BETWEEN operator requires comma-separated values');
    }

    const [start, end] = value.split(',').map((v) => v.trim());
    if (!start || !end) {
      throw new Error('BETWEEN operator requires two values');
    }

    const startVal = safelyEscapeValue(column, start);
    const endVal = safelyEscapeValue(column, end);

    if (operator === 'between') {
      return `"${column}" BETWEEN ${startVal} AND ${endVal}`;
    } else {
      return `"${column}" NOT BETWEEN ${startVal} AND ${endVal}`;
    }
  },
};

/**
 * All custom handlers for data-explorer service
 */
export const dataExplorerCustomHandlers = {
  jsonOperator: jsonOperatorHandler,
  arrayOperator: arrayOperatorHandler,
  enhancedDate: enhancedDateHandler,
  betweenOperator: betweenOperatorHandler,
};
