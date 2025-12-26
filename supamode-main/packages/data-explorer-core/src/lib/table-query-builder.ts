import { sql } from 'drizzle-orm';

import type { FilterCondition } from '@kit/filters-core';
import { GroupByBuilder, QueryBuilder, WhereBuilder } from '@kit/query-builder';
import type { QueryResult } from '@kit/query-builder';

export type TableQueryBuilderParams = {
  schemaName: string;
  tableName: string;
  page: number;
  pageSize: number;
  properties?: { columns?: string[] };
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: FilterCondition[];
  // Enhanced params for widget support
  aggregation?: string; // COUNT, SUM, AVG, etc.
  aggregationColumn?: string; // Column to aggregate
  groupBy?: string[]; // Columns to group by
  timeAggregation?: string; // day, week, month, etc.
  xAxis?: string; // For chart widgets
  yAxis?: string; // For chart widgets
  // HAVING support for post-aggregation filtering
  havingFilters?: FilterCondition[]; // Filters applied after aggregation (HAVING clause)
  // Performance optimization: skip permission check if already verified upstream
  skipPermissionCheck?: boolean;
  // Performance optimization: skip count for simple first page queries
  skipCount?: boolean;
};

export type TableQueryBuilderResult = {
  query: QueryResult;
  isAggregated: boolean;
};

/**
 * Builds queries for table data retrieval with support for:
 * - Regular table queries with pagination
 * - Aggregated queries for charts and metrics
 * - Filtering and searching
 * - Sorting and grouping
 */
export class TableQueryBuilder {
  private readonly quoteIdent = (c: string) => `"${c.replace(/"/g, '""')}"`;

  /**
   * Build a complete query for table data retrieval
   */
  buildQuery(params: TableQueryBuilderParams): TableQueryBuilderResult {
    const {
      schemaName,
      tableName,
      page,
      pageSize,
      properties,
      search,
      sortColumn,
      sortDirection,
      filters = [],
      havingFilters = [],
      aggregation,
      aggregationColumn,
      groupBy,
      timeAggregation,
      xAxis,
      yAxis,
      skipCount = false,
    } = params;

    const isAggregated = !!(aggregation || groupBy || timeAggregation);
    // Optimize column selection: use * when no specific columns requested and not aggregated
    const selectColumns =
      !isAggregated && (!properties?.columns || properties.columns.length === 0)
        ? [{ expression: '*' }] // Use * for simple queries to avoid column enumeration overhead
        : this.buildSelectColumns({
            properties,
            aggregation,
            aggregationColumn,
            groupBy,
            timeAggregation,
            xAxis,
            yAxis,
            isAggregated,
          });

    // Build WHERE clause for use in final query
    const whereClause = this.buildWhereClause(
      filters,
      search,
      schemaName,
      tableName,
    );

    // Only include COUNT when needed (performance optimization)
    const finalColumns = skipCount
      ? selectColumns
      : [
          ...selectColumns,
          { expression: 'COUNT(*) OVER()', alias: 'total_count' },
        ];

    let baseBuilder = QueryBuilder.from(schemaName, tableName).select({
      columns: finalColumns,
    });

    // Add WHERE clause
    if (whereClause) {
      baseBuilder = baseBuilder.where(whereClause);
    }

    // Add GROUP BY for aggregated queries
    if (isAggregated) {
      const groupByClause = this.buildGroupByClause({
        aggregation,
        timeAggregation,
        xAxis,
        groupBy,
      });
      if (groupByClause) {
        baseBuilder = baseBuilder.groupBy(groupByClause);
      }
    }

    // Add HAVING clause for post-aggregation filtering
    if (havingFilters.length > 0 && isAggregated) {
      const havingClause = this.buildHavingClause(havingFilters);
      if (havingClause) {
        baseBuilder = baseBuilder.having(havingClause);
      }
    }

    // Add sorting
    const orderByClause = this.buildOrderByClause({
      sortColumn,
      sortDirection,
      timeAggregation,
      xAxis,
    });
    if (orderByClause.length > 0) {
      baseBuilder = baseBuilder.orderBy(orderByClause);
    }

    // Add pagination
    baseBuilder = baseBuilder.limit(pageSize, (page - 1) * pageSize);

    const optimizedQuery = baseBuilder.build();

    return {
      query: { sql: optimizedQuery.sql, metadata: optimizedQuery.metadata },
      isAggregated,
    };
  }

  /**
   * Build SELECT columns based on query type (regular vs aggregated)
   */
  private buildSelectColumns(params: {
    properties?: { columns?: string[] };
    aggregation?: string;
    aggregationColumn?: string;
    groupBy?: string[];
    timeAggregation?: string;
    xAxis?: string;
    yAxis?: string;
    isAggregated: boolean;
  }): Array<{ expression: string; alias?: string }> {
    const {
      properties,
      aggregation,
      aggregationColumn,
      groupBy,
      timeAggregation,
      xAxis,
      yAxis,
      isAggregated,
    } = params;

    if (isAggregated) {
      return this.buildAggregatedSelectColumns({
        aggregation,
        aggregationColumn,
        groupBy,
        timeAggregation,
        xAxis,
        yAxis,
      });
    }

    // Regular table mode
    if (properties?.columns && properties.columns.length > 0) {
      return properties.columns.map((c) => ({
        expression: this.quoteIdent(c),
      }));
    }

    return [{ expression: '*' }];
  }

  /**
   * Build SELECT columns for aggregated queries (charts/metrics)
   */
  private buildAggregatedSelectColumns(params: {
    aggregation?: string;
    aggregationColumn?: string;
    groupBy?: string[];
    timeAggregation?: string;
    xAxis?: string;
    yAxis?: string;
  }): Array<{ expression: string; alias?: string }> {
    const {
      aggregation,
      aggregationColumn,
      groupBy,
      timeAggregation,
      xAxis,
      yAxis,
    } = params;
    const selectColumns: Array<{ expression: string; alias?: string }> = [];

    // Add grouping columns (including time aggregation)
    if (timeAggregation && xAxis) {
      const timeExpr = `DATE_TRUNC('${timeAggregation}', ${this.quoteIdent(xAxis)})`;
      selectColumns.push({ expression: timeExpr, alias: 'time_bucket' });
    } else if (xAxis) {
      selectColumns.push({ expression: this.quoteIdent(xAxis) });
    }

    if (groupBy && groupBy.length > 0) {
      groupBy.forEach((col) => {
        selectColumns.push({ expression: this.quoteIdent(col) });
      });
    }

    // Add aggregation expressions
    if (aggregation && yAxis) {
      const aggExpr = this.buildAggregationExpression(aggregation, yAxis);
      selectColumns.push({ expression: aggExpr, alias: 'value' });
    } else if (aggregation && aggregationColumn) {
      const aggExpr = this.buildAggregationExpression(
        aggregation,
        aggregationColumn,
      );
      selectColumns.push({ expression: aggExpr, alias: 'value' });
    }

    return selectColumns;
  }

  /**
   * Build aggregation expression (COUNT, SUM, AVG, etc.)
   */
  private buildAggregationExpression(
    aggregation: string,
    column: string,
  ): string {
    const aggColumn = column === '*' ? '*' : this.quoteIdent(column);
    let aggType = aggregation.toUpperCase();

    // Only COUNT(*) is valid SQL - all other aggregations with * are invalid
    // Convert SUM(*), AVG(*), MIN(*), MAX(*) to COUNT(*)
    if (column === '*' && aggType !== 'COUNT') {
      aggType = 'COUNT';
    }

    return `${aggType}(${aggColumn})`;
  }

  /**
   * Build WHERE clause combining filters and free-text search
   */
  private buildWhereClause(
    filters: FilterCondition[],
    search: string | undefined,
    schemaName: string,
    tableName: string,
  ) {
    const conditions: Array<ReturnType<typeof sql>> = [];

    if (filters.length > 0) {
      const whereFromFilters = WhereBuilder.fromFilters(filters);
      if (whereFromFilters) {
        conditions.push(...whereFromFilters.conditions);
      }
    }

    if (search && search.trim() !== '') {
      const tableRef = sql`${sql.identifier(schemaName)}.${sql.identifier(tableName)}`;
      conditions.push(
        sql`CAST(ROW(${tableRef}.*) AS TEXT) ILIKE ${'%' + search + '%'}`,
      );
    }

    if (conditions.length === 0) {
      return null;
    }

    return WhereBuilder.custom(conditions, 'AND');
  }

  /**
   * Build HAVING clause for post-aggregation filtering
   */
  private buildHavingClause(havingFilters: FilterCondition[]) {
    if (havingFilters.length === 0) {
      return null;
    }

    // Use the same WhereBuilder logic but for HAVING
    const havingFromFilters = WhereBuilder.fromFilters(havingFilters);

    return havingFromFilters
      ? {
          conditions: havingFromFilters.conditions,
          combineWith: havingFromFilters.combineWith,
        }
      : null;
  }

  /**
   * Smart filter categorization: automatically detect whether filters should go in WHERE or HAVING
   * This provides backward compatibility for widgets using legacy 'filters' field
   */
  static categorizeFilters(
    filters: FilterCondition[],
    context: {
      isAggregated: boolean;
      aggregationAliases?: string[];
      yAxis?: string;
      aggregation?: string;
    },
  ): { whereFilters: FilterCondition[]; havingFilters: FilterCondition[] } {
    if (!context.isAggregated) {
      // No aggregation = all filters go to WHERE
      return { whereFilters: filters, havingFilters: [] };
    }

    const whereFilters: FilterCondition[] = [];
    const havingFilters: FilterCondition[] = [];

    // Common aggregation aliases used in SELECT clauses
    const defaultAggregationAliases = [
      'value',
      'count',
      'total',
      'avg',
      'min',
      'max',
      'sum',
    ];
    const aggregationAliases =
      context.aggregationAliases || defaultAggregationAliases;

    for (const filter of filters) {
      if (
        this.isAggregationFilter(filter, { aggregationAliases, ...context })
      ) {
        havingFilters.push(filter);
      } else {
        whereFilters.push(filter);
      }
    }

    return { whereFilters, havingFilters };
  }

  /**
   * Detect if a filter references an aggregated column and should use HAVING
   */
  private static isAggregationFilter(
    filter: FilterCondition,
    context: {
      isAggregated: boolean;
      aggregationAliases: string[];
      yAxis?: string;
      aggregation?: string;
    },
  ): boolean {
    if (!context.isAggregated) {
      return false;
    }

    const column = filter.column.toLowerCase();

    // Check if filter column matches common aggregation aliases
    if (
      context.aggregationAliases.some((alias) => column === alias.toLowerCase())
    ) {
      return true;
    }

    // Check if column looks like an aggregation function (e.g., "COUNT(*)", "SUM(sales)")
    if (/^(count|sum|avg|min|max)\s*\(/i.test(column)) {
      return true;
    }

    // Check if column matches the aggregated field pattern
    if (context.yAxis && context.aggregation) {
      // Escape special regex characters in yAxis (like *)
      const escapedYAxis = context.yAxis.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const aggPattern = new RegExp(
        `^${context.aggregation}\\s*\\(.*${escapedYAxis}.*\\)$`,
        'i',
      );
      if (aggPattern.test(column)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Build GROUP BY clause for aggregated queries
   */
  private buildGroupByClause(params: {
    aggregation?: string;
    timeAggregation?: string;
    xAxis?: string;
    groupBy?: string[];
  }) {
    const { aggregation, timeAggregation, xAxis, groupBy } = params;

    if (!aggregation && !timeAggregation) {
      return null;
    }

    const groupByColumns: string[] = [];

    if (timeAggregation && xAxis) {
      groupByColumns.push(
        `DATE_TRUNC('${timeAggregation}', ${this.quoteIdent(xAxis)})`,
      );
    } else if (xAxis) {
      groupByColumns.push(this.quoteIdent(xAxis));
    }

    if (groupBy && groupBy.length > 0) {
      groupBy.forEach((col) => {
        groupByColumns.push(this.quoteIdent(col));
      });
    }

    if (groupByColumns.length === 0) {
      return null;
    }

    return GroupByBuilder.fromColumns(groupByColumns);
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(params: {
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    timeAggregation?: string;
    xAxis?: string;
  }): Array<{ expression: string; direction: 'ASC' | 'DESC' }> {
    const { sortColumn, sortDirection, timeAggregation, xAxis } = params;
    const orderByClauses: Array<{
      expression: string;
      direction: 'ASC' | 'DESC';
    }> = [];

    // For time-aggregated queries, prioritize time-based sorting
    if (timeAggregation && xAxis) {
      const timeExpression = `DATE_TRUNC('${timeAggregation}', ${this.quoteIdent(xAxis)})`;

      if (sortColumn) {
        // Check if sortColumn is trying to sort by time bucket or aggregated value
        const quotedSortColumn = this.quoteIdent(sortColumn);

        if (
          sortColumn === 'time_bucket' ||
          quotedSortColumn === timeExpression
        ) {
          // Sorting by time bucket - apply direction to time expression
          orderByClauses.push({
            expression: timeExpression,
            direction: sortDirection === 'desc' ? 'DESC' : 'ASC',
          });
        } else if (
          sortColumn === 'value' ||
          sortColumn.toLowerCase().includes('count') ||
          sortColumn.toLowerCase().includes('sum') ||
          sortColumn.toLowerCase().includes('avg') ||
          sortColumn.toLowerCase().includes('min') ||
          sortColumn.toLowerCase().includes('max')
        ) {
          // Sorting by aggregated value - add time as primary, aggregation as secondary
          orderByClauses.push(
            {
              expression: timeExpression,
              direction: 'ASC', // Keep time in chronological order
            },
            {
              expression: quotedSortColumn,
              direction: sortDirection === 'desc' ? 'DESC' : 'ASC',
            },
          );
        } else {
          // Unknown sort column in aggregated context - default to time sorting only
          orderByClauses.push({
            expression: timeExpression,
            direction: 'ASC',
          });
        }
      } else {
        // No specific sort column - default to time-based sorting
        orderByClauses.push({
          expression: timeExpression,
          direction: 'ASC',
        });
      }
    } else if (sortColumn) {
      // Non-aggregated queries - use custom sorting
      orderByClauses.push({
        expression: this.quoteIdent(sortColumn),
        direction: sortDirection === 'desc' ? 'DESC' : 'ASC',
      });
    }

    return orderByClauses;
  }
}
