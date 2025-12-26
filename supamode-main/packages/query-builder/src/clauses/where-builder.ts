/**
 * WHERE clause builder
 *
 * Handles building WHERE clauses from filter conditions with parameterized queries
 * using Drizzle's SQL template tag for security.
 */
import { type SQL, sql } from 'drizzle-orm';

import {
  FilterBuilder,
  extractRelativeDateOption,
  getRelativeDateRange,
  isRelativeDate,
} from '@kit/filters-core';
import type { FilterCondition } from '@kit/filters-core';

import type { WhereClause } from '../types/clause-types';

type LogicalOperator = 'AND' | 'OR';

export class WhereBuilder {
  private constructor() {
    // Static class - no instantiation
  }

  /**
   * Build WHERE clause from filter conditions
   */
  static fromFilters(
    filters: readonly FilterCondition[],
    combineWith: LogicalOperator = 'AND',
  ): WhereClause | null {
    if (filters.length === 0) {
      return null;
    }

    const conditions = filters.map((filter) =>
      this.buildFilterCondition(filter),
    );

    return {
      conditions,
      combineWith,
    };
  }

  /**
   * Build a single filter condition using parameterized SQL
   */
  private static buildFilterCondition(filter: FilterCondition): SQL {
    const { column, operator, value } = filter as FilterCondition & {
      operator: string;
    };

    // Handle relative date values - need to resolve them before using in SQL
    let resolvedValue = value;
    if (typeof value === 'string' && isRelativeDate(value)) {
      const option = extractRelativeDateOption(value);

      if (option) {
        const range = getRelativeDateRange(option);

        // For range-based operators or equality, handle specially
        if (
          ['eq', 'neq', 'during', 'between', 'notBetween'].includes(operator)
        ) {
          const col = sql.identifier(column);

          if (
            operator === 'eq' ||
            operator === 'during' ||
            operator === 'between'
          ) {
            return sql`${col} BETWEEN ${range.start.toISOString()} AND ${range.end.toISOString()}`;
          } else if (operator === 'neq' || operator === 'notBetween') {
            return sql`${col} NOT BETWEEN ${range.start.toISOString()} AND ${range.end.toISOString()}`;
          }
        }

        // For comparison operators, use appropriate boundary
        switch (operator) {
          case 'gt':
          case 'after':
            resolvedValue = range.end.toISOString(); // Use end of range for "greater than"
            break;
          case 'gte':
          case 'afterOrOn':
            resolvedValue = range.start.toISOString(); // Use start of range for "greater than or equal"
            break;
          case 'lt':
          case 'before':
            resolvedValue = range.start.toISOString(); // Use start of range for "less than"
            break;
          case 'lte':
          case 'beforeOrOn':
            resolvedValue = range.end.toISOString(); // Use end of range for "less than or equal"
            break;
          default:
            resolvedValue = range.start.toISOString(); // Default to start of range
        }
      }
    }

    // Handle date values (non-relative) with date-aware operators using FilterBuilder
    if (
      typeof resolvedValue === 'string' &&
      !isRelativeDate(resolvedValue) &&
      this.isDateValue(resolvedValue) &&
      [
        'eq',
        'neq',
        'before',
        'after',
        'beforeOrOn',
        'afterOrOn',
        'during',
      ].includes(operator)
    ) {
      return this.buildFilterWithSharedLogic(
        column,
        operator,
        resolvedValue as string,
      );
    }

    const col = sql.identifier(column);

    switch (operator) {
      case 'eq':
        return this.buildEqualityCondition(col, resolvedValue, '=');
      case 'neq':
        return this.buildEqualityCondition(col, resolvedValue, '!=');
      case 'gt':
        return sql`${col} > ${resolvedValue}`;
      case 'gte':
        return sql`${col} >= ${resolvedValue}`;
      case 'lt':
        return sql`${col} < ${resolvedValue}`;
      case 'lte':
        return sql`${col} <= ${resolvedValue}`;

      // Text operations
      case 'contains':
        return sql`${col} ILIKE ${'%' + String(value) + '%'}`;
      case 'containsText':
        // For JSON/JSONB columns, cast to text first
        return sql`${col}::text ILIKE ${'%' + String(value) + '%'}`;
      case 'startsWith':
        return sql`${col} ILIKE ${String(value) + '%'}`;
      case 'endsWith':
        return sql`${col} ILIKE ${'%' + String(value)}`;

      // List operations
      case 'in':
        return this.buildInCondition(col, value, 'IN');
      case 'notIn':
        return this.buildInCondition(col, value, 'NOT IN');

      // Null checks
      case 'isNull':
        return sql`${col} IS NULL`;
      case 'notNull':
        return sql`${col} IS NOT NULL`;

      // Range operations
      case 'between':
        return this.buildBetweenCondition(col, value, false);
      case 'notBetween':
        return this.buildBetweenCondition(col, value, true);

      // Date operations
      case 'before':
        return sql`${col} < ${value}`;
      case 'beforeOrOn':
        return sql`${col} <= ${value}`;
      case 'after':
        return sql`${col} > ${value}`;
      case 'afterOrOn':
        return sql`${col} >= ${value}`;
      case 'during':
        return this.buildBetweenCondition(col, value, false);

      // JSON operations
      case 'hasKey':
        return sql`${col} ? ${String(value)}`;
      case 'keyEquals': {
        const [keyPath, keyValue] = Array.isArray(value) ? value : [value, ''];
        return sql`${col}->>${String(keyPath)} = ${String(keyValue)}`;
      }
      case 'pathExists':
        return sql`${col} #> ${'{' + String(value) + '}'} IS NOT NULL`;

      default:
        // Default to equality
        return this.buildEqualityCondition(col, value, '=');
    }
  }

  /**
   * Build equality condition (= or !=)
   */
  private static buildEqualityCondition(
    column: unknown,
    value: unknown,
    operator: '=' | '!=',
  ): SQL {
    if (operator === '=') {
      return sql`${column} = ${value}`;
    } else {
      return sql`${column} != ${value}`;
    }
  }

  /**
   * Build IN/NOT IN condition
   */
  private static buildInCondition(
    column: unknown,
    value: unknown,
    operator: 'IN' | 'NOT IN',
  ): SQL {
    const values = Array.isArray(value) ? value : [value];

    if (values.length === 0) {
      // Empty IN clause - return FALSE for IN, TRUE for NOT IN
      return operator === 'IN' ? sql`FALSE` : sql`TRUE`;
    }

    if (operator === 'IN') {
      return sql`${column} IN (${values})`;
    } else {
      return sql`${column} NOT IN (${values})`;
    }
  }

  /**
   * Build BETWEEN/NOT BETWEEN condition
   */
  private static buildBetweenCondition(
    column: unknown,
    value: unknown,
    negated: boolean,
  ): SQL {
    let startValue: unknown;
    let endValue: unknown;

    if (typeof value === 'string' && value.includes(',')) {
      [startValue, endValue] = value.split(',');
    } else if (Array.isArray(value) && value.length >= 2) {
      [startValue, endValue] = value as unknown[];
    } else {
      // Invalid between condition
      return negated ? sql`TRUE` : sql`FALSE`;
    }

    if (negated) {
      return sql`${column} NOT BETWEEN ${startValue} AND ${endValue}`;
    } else {
      return sql`${column} BETWEEN ${startValue} AND ${endValue}`;
    }
  }

  /**
   * Check if a value is likely a date string
   */
  private static isDateValue(value: string): boolean {
    // Quick checks for common date patterns
    if (!/\d{4}|\d{2}[-\\/]\d{2}/.test(value)) {
      return false; // No year or date separator pattern
    }

    // Try to parse as date
    const date = new Date(value);

    return (
      !isNaN(date.getTime()) &&
      date.getFullYear() > 1900 &&
      date.getFullYear() < 2100
    );
  }

  /**
   * Build filter condition using shared FilterBuilder logic for dates
   */
  private static buildFilterWithSharedLogic(
    column: string,
    operator: string,
    value: string,
  ): SQL {
    // Create minimal column metadata - assume date columns when this method is called
    const filterBuilder = new FilterBuilder({
      serviceType: 'widgets',
      columns: [
        {
          name: column,
          ordering: null as unknown as number,
          display_name: null as unknown as string,
          description: null as unknown as string,
          is_searchable: true,
          is_visible_in_table: true,
          is_visible_in_detail: true,
          default_value: null,
          is_sortable: true,
          is_filterable: true,
          is_editable: true,
          is_primary_key: false,
          is_required: false,
          relations: [],
          ui_config: { data_type: 'timestamp with time zone' },
        },
      ],
      escapeStrategy: 'drizzle',
    });

    try {
      const fullCondition = filterBuilder.buildCondition({
        column,
        operator,
        value,
      });

      // Convert to SQL template, removing quotes from column names
      const cleanCondition = fullCondition.replace(/^"([^"]+)"/, column);

      return sql.raw(cleanCondition);
    } catch {
      // Simple fallback using parameterized query
      const col = sql.identifier(column);

      if (operator === 'eq') {
        return sql`${col} = ${value}`;
      } else if (operator === 'neq') {
        return sql`${col} != ${value}`;
      } else {
        return sql`${col} ${sql.raw(operator)} ${value}`;
      }
    }
  }

  /**
   * Build WHERE clause with custom conditions
   */
  static custom(
    conditions: readonly SQL[],
    combineWith: LogicalOperator = 'AND',
  ): WhereClause {
    return {
      conditions: [...conditions],
      combineWith,
    };
  }

  /**
   * Build WHERE clause with a single condition
   */
  static single(condition: SQL): WhereClause {
    return {
      conditions: [condition],
      combineWith: 'AND',
    };
  }
}
