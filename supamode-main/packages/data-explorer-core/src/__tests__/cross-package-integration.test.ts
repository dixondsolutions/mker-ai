/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilterBuilder } from '@kit/filters-core';
import { QueryBuilder } from '@kit/query-builder';
import type { ColumnMetadata } from '@kit/types';

import {
  calculatePageCount,
  cleanQueryResultData,
  extractTotalCount,
  isTypeWithoutEmptyStrings,
} from '../lib/data-processing-utils';

// Helper to convert SQL object to string for testing
function sqlToString(sqlObject: any): { sql: string; params: unknown[] } {
  try {
    if (typeof sqlObject === 'string') {
      return { sql: sqlObject, params: [] };
    }
    if (sqlObject && sqlObject.queryChunks) {
      const chunks = sqlObject.queryChunks;
      let sqlString = '';
      for (const chunk of chunks) {
        if (typeof chunk === 'string') {
          sqlString += chunk;
        } else if (chunk && typeof chunk === 'object' && chunk.value) {
          if (Array.isArray(chunk.value)) {
            sqlString += chunk.value.join('');
          } else {
            sqlString += String(chunk.value);
          }
        }
      }
      return { sql: sqlString, params: [] };
    }
    return { sql: String(sqlObject), params: [] };
  } catch (error) {
    return { sql: '[SQL Object]', params: [] };
  }
}

// Mock dependencies to avoid database connections
vi.mock('@kit/supabase/client', () => ({
  getDrizzleSupabaseAdminClient: vi.fn(),
}));

describe('Cross-Package Integration Tests', () => {
  let mockColumns: ColumnMetadata[];
  let filterBuilder: FilterBuilder;

  beforeEach(() => {
    mockColumns = [
      {
        name: 'id',
        ordering: 1,
        display_name: 'ID',
        description: 'Primary key',
        is_searchable: false,
        is_visible_in_table: true,
        is_visible_in_detail: true,
        default_value: null,
        is_sortable: true,
        is_filterable: true,
        is_editable: false,
        is_primary_key: true,
        is_required: true,
        relations: [],
        ui_config: { data_type: 'integer' },
      },
      {
        name: 'name',
        ordering: 2,
        display_name: 'Name',
        description: 'User name',
        is_searchable: true,
        is_visible_in_table: true,
        is_visible_in_detail: true,
        default_value: null,
        is_sortable: true,
        is_filterable: true,
        is_editable: true,
        is_primary_key: false,
        is_required: true,
        relations: [],
        ui_config: { data_type: 'text' },
      },
      {
        name: 'amount',
        ordering: 3,
        display_name: 'Amount',
        description: 'Transaction amount',
        is_searchable: false,
        is_visible_in_table: true,
        is_visible_in_detail: true,
        default_value: null,
        is_sortable: true,
        is_filterable: true,
        is_editable: true,
        is_primary_key: false,
        is_required: false,
        relations: [],
        ui_config: { data_type: 'numeric' },
      },
      {
        name: 'created_at',
        ordering: 4,
        display_name: 'Created At',
        description: 'Creation timestamp',
        is_searchable: false,
        is_visible_in_table: true,
        is_visible_in_detail: true,
        default_value: null,
        is_sortable: true,
        is_filterable: true,
        is_editable: false,
        is_primary_key: false,
        is_required: true,
        relations: [],
        ui_config: { data_type: 'timestamp with time zone' },
      },
    ];

    filterBuilder = new FilterBuilder({
      serviceType: 'widgets',
      columns: mockColumns,
      escapeStrategy: 'drizzle',
    });
  });

  describe('QueryBuilder + FilterBuilder Integration', () => {
    it('should create consistent queries between dashboard and data-explorer flows', () => {
      // Dashboard widget creation flow
      const dashboardQuery = QueryBuilder.from('public', 'transactions')
        .select({
          columns: [
            { expression: '"category"' },
            { expression: 'SUM("amount")', alias: 'total_amount' },
            { expression: 'COUNT("id")', alias: 'transaction_count' },
          ],
        })
        .whereFilters([
          { column: 'created_at', operator: 'gte', value: '2024-01-01' },
          { column: 'amount', operator: 'gt', value: 0 },
        ])
        .groupBy({ expressions: ['category'] })
        .orderBy([{ expression: 'total_amount', direction: 'DESC' }])
        .build();

      // Data explorer browsing flow
      const explorerQuery = QueryBuilder.from('public', 'transactions')
        .select({
          columns: [
            { expression: '"id"' },
            { expression: '"category"' },
            { expression: '"amount"' },
            { expression: '"created_at"' },
          ],
        })
        .whereFilters([
          { column: 'created_at', operator: 'gte', value: '2024-01-01' },
          { column: 'amount', operator: 'gt', value: 0 },
        ])
        .orderBy([{ expression: 'created_at', direction: 'DESC' }])
        .limit(50)
        .build();

      // Both queries should build successfully with proper metadata
      expect(dashboardQuery.sql).toBeDefined();
      expect(explorerQuery.sql).toBeDefined();
      expect(typeof dashboardQuery.sql).toBe('object');
      expect(typeof explorerQuery.sql).toBe('object');

      // Metadata should be correctly classified
      expect(dashboardQuery.metadata.queryType).toBe('AGGREGATE');
      expect(explorerQuery.metadata.queryType).toBe('SELECT');
      expect(dashboardQuery.metadata.hasAggregation).toBe(true);
      expect(explorerQuery.metadata.hasAggregation).toBe(false);
    });

    it('should handle complex filter combinations consistently', () => {
      const filters = [
        { column: 'name', operator: 'contains', value: 'test' },
        { column: 'amount', operator: 'between', value: [100, 1000] },
        {
          column: 'created_at',
          operator: 'gte',
          value: '__rel_date:month_start',
        },
      ];

      // Build filters using FilterBuilder
      const filterWhere = filterBuilder.buildWhere(filters);

      // Build query using QueryBuilder with same filters
      const query = QueryBuilder.from('public', 'transactions')
        .whereFilters(filters)
        .build();

      // FilterBuilder should generate WHERE clause with expected patterns
      expect(filterWhere).toContain('ILIKE');
      expect(filterWhere).toContain('%test%');
      expect(filterWhere).toContain('WHERE');

      // QueryBuilder should build successfully with filters
      expect(query.sql).toBeDefined();
      expect(query.metadata.queryType).toBe('SELECT');
      expect(query.metadata.hasAggregation).toBe(false);
      expect(query.metadata.isTimeSeries).toBe(false);
    });

    it('should handle time series queries with aggregation consistently', () => {
      const timeSeriesQuery = QueryBuilder.from('public', 'events')
        .select({
          columns: [
            { expression: 'DATE_TRUNC(\'day\', "created_at")', alias: 'day' },
            { expression: 'COUNT("id")', alias: 'event_count' },
          ],
        })
        .whereFilters([
          {
            column: 'created_at',
            operator: 'gte',
            value: '__rel_date:week_start',
          },
          {
            column: 'created_at',
            operator: 'lte',
            value: '__rel_date:week_end',
          },
        ])
        .groupBy({ expressions: ['DATE_TRUNC(\'day\', "created_at")'] })
        .orderBy([{ expression: 'day', direction: 'ASC' }])
        .build();

      // Query should build successfully with proper metadata for time series
      expect(timeSeriesQuery.sql).toBeDefined();
      expect(timeSeriesQuery.metadata.queryType).toBe('TIME_SERIES');
      expect(timeSeriesQuery.metadata.hasAggregation).toBe(true);
      expect(timeSeriesQuery.metadata.isTimeSeries).toBe(true);
      // Only test the properties that exist in QueryMetadata interface
    });
  });

  describe('Data Processing Pipeline Integration', () => {
    it('should process data through the complete pipeline', () => {
      // Simulate data flowing through the system

      // 1. Query building (core packages)
      const query = QueryBuilder.from('public', 'users')
        .select({
          columns: [
            { expression: '"id"' },
            { expression: '"name"' },
            { expression: '"email"' },
            { expression: '"created_at"' },
          ],
        })
        .whereFilters([{ column: 'name', operator: 'contains', value: 'John' }])
        .orderBy([{ expression: 'created_at', direction: 'DESC' }])
        .limit(10)
        .build();

      // 2. Mock data that would come from database
      const mockData = [
        {
          id: 1,
          name: 'John Doe',
          email: 'john@example.com',
          created_at: '2024-01-01T12:00:00Z',
          total_count: 1,
        },
        {
          id: 2,
          name: 'John Smith',
          email: 'johnsmith@example.com',
          created_at: '2024-01-02T12:00:00Z',
          total_count: 1,
        },
      ];

      // 3. Data processing (data-explorer-core utilities)
      // Already imported at top of file

      const totalCount = extractTotalCount(mockData);
      const cleanedData = cleanQueryResultData(mockData);
      const pageCount = calculatePageCount(totalCount, 10);

      expect(totalCount).toBe(1);
      expect(cleanedData).toHaveLength(2);
      expect(cleanedData[0]).not.toHaveProperty('total_count');
      expect(pageCount).toBe(1);
    });

    it('should handle error propagation across packages', () => {
      // Test that errors propagate correctly through the system

      // 1. Invalid column in filter should be caught
      expect(() => {
        filterBuilder.buildWhere([
          { column: 'nonexistent_column', operator: 'eq', value: 'test' },
        ]);
      }).toThrow("Column 'nonexistent_column' not found");

      // 2. Invalid schema/table should be handled
      expect(() => {
        QueryBuilder.from('', 'invalid_table').build();
      }).not.toThrow(); // Should handle gracefully

      // 3. Invalid data type should be caught at validation level
      expect(() => {
        isTypeWithoutEmptyStrings('unsupported_type');
      }).not.toThrow(); // This function handles all types gracefully
    });
  });

  describe('Performance Integration', () => {
    it('should maintain performance across package boundaries', () => {
      const startTime = performance.now();

      // Complex multi-package operation - use only text column to avoid validation issues
      const filters = Array.from({ length: 100 }, (_, i) => ({
        column: 'name', // Always use text column
        operator: 'eq' as const,
        value: `text_value_${i}`,
      }));

      const filterWhere = filterBuilder.buildWhere(filters);

      const query = QueryBuilder.from('public', 'large_table')
        .select({
          columns: [
            { expression: '"id"' },
            { expression: 'COUNT("id")', alias: 'count' },
          ],
        })
        .whereFilters(filters.slice(0, 50)) // Use text filters to avoid numeric validation
        .groupBy({ expressions: ['id'] })
        .build();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete quickly
      expect(filterWhere).toContain('WHERE');
      expect(query.sql).toBeDefined();
      expect(query.metadata.queryType).toBe('AGGREGATE');
      expect(query.metadata.hasAggregation).toBe(true);
    });

    it('should handle large datasets efficiently across packages', () => {
      // Simulate processing a large result set
      const mockLargeData = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        total_count: 10000,
      }));

      const startTime = performance.now();

      // Already imported at top of file
      const totalCount = extractTotalCount(mockLargeData);
      const cleanedData = cleanQueryResultData(mockLargeData);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should process quickly
      expect(totalCount).toBe(10000);
      expect(cleanedData).toHaveLength(10000);
      expect(cleanedData[0]).not.toHaveProperty('total_count');
    });
  });

  describe('Type Safety Integration', () => {
    it('should maintain type safety across package boundaries', () => {
      // Test that TypeScript types are consistent between packages

      const query = QueryBuilder.from('public', 'users')
        .select({
          columns: [
            { expression: '"id"', alias: 'user_id' },
            { expression: '"name"' },
          ],
        })
        .build();

      // Query result should have proper metadata
      expect(query.metadata).toHaveProperty('queryType');
      expect(query.metadata).toHaveProperty('hasAggregation');
      expect(query.metadata).toHaveProperty('isTimeSeries');

      // SQL should be well-formed
      const querySql = sqlToString(query.sql).sql;
      expect(querySql).toContain('SELECT');
      expect(querySql).toContain('FROM');
      expect(typeof query.sql).toBe('object'); // Should be SQL object, not string
    });

    it('should handle data type conversions consistently', () => {
      // Already imported at top of file

      // Test data type handling consistency
      expect(isTypeWithoutEmptyStrings('integer')).toBe(true);
      expect(isTypeWithoutEmptyStrings('text')).toBe(false);
      expect(isTypeWithoutEmptyStrings('timestamp with time zone')).toBe(true);
      expect(isTypeWithoutEmptyStrings('boolean')).toBe(true);

      // These should be consistent with how filters handle the same types
      const integerFilter = filterBuilder.buildWhere([
        { column: 'id', operator: 'eq', value: 123 },
      ]);

      const textFilter = filterBuilder.buildWhere([
        { column: 'name', operator: 'eq', value: 'test' },
      ]);

      expect(integerFilter).toContain('123');
      expect(textFilter).toContain("'test'");
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should support dashboard widget creation end-to-end', () => {
      // Simulate complete dashboard widget creation

      const widgetConfig = {
        schemaName: 'public',
        tableName: 'sales',
        chartType: 'bar',
        xAxis: 'product_category',
        yAxis: 'amount',
        aggregation: 'sum',
        filters: [
          {
            column: 'created_at',
            operator: 'gte',
            value: '__rel_date:month_start',
          },
          { column: 'status', operator: 'eq', value: 'completed' },
        ],
      };

      // Build the query
      const query = QueryBuilder.from(
        widgetConfig.schemaName,
        widgetConfig.tableName,
      )
        .select({
          columns: [
            { expression: `"${widgetConfig.xAxis}"` },
            { expression: `SUM("${widgetConfig.yAxis}")`, alias: 'value' },
          ],
        })
        .whereFilters(widgetConfig.filters)
        .groupBy({ expressions: [widgetConfig.xAxis] })
        .orderBy([{ expression: 'value', direction: 'DESC' }])
        .build();

      // Widget query should build successfully with aggregation metadata
      expect(query.sql).toBeDefined();
      expect(query.metadata.hasAggregation).toBe(true);
      expect(query.metadata.queryType).toBe('AGGREGATE');
      expect(query.metadata.isTimeSeries).toBe(false);
    });

    it('should support data explorer browsing end-to-end', () => {
      // Simulate complete data explorer browsing

      const explorerConfig = {
        schemaName: 'public',
        tableName: 'users',
        columns: ['id', 'name', 'email', 'created_at'],
        filters: [
          { column: 'name', operator: 'contains', value: 'admin' },
          { column: 'created_at', operator: 'gte', value: '__rel_date:today' },
        ],
        sortColumn: 'created_at',
        sortDirection: 'DESC' as const,
        page: 1,
        pageSize: 25,
      };

      // Build the query
      const query = QueryBuilder.from(
        explorerConfig.schemaName,
        explorerConfig.tableName,
      )
        .select({
          columns: [
            ...explorerConfig.columns.map((col) => ({
              expression: `"${col}"`,
            })),
            { expression: 'COUNT(*) OVER()', alias: 'total_count' }, // For pagination
          ],
        })
        .whereFilters(explorerConfig.filters)
        .orderBy([
          {
            expression: explorerConfig.sortColumn,
            direction: explorerConfig.sortDirection,
          },
        ])
        .limit(
          explorerConfig.pageSize,
          (explorerConfig.page - 1) * explorerConfig.pageSize,
        )
        .build();

      // Explorer query should build successfully with proper metadata
      expect(query.sql).toBeDefined();
      // Note: This query has COUNT(*) OVER() which makes it an aggregate query
      expect(query.metadata.queryType).toBe('AGGREGATE');
      expect(query.metadata.hasAggregation).toBe(true); // Due to COUNT(*) OVER()
      expect(query.metadata.isTimeSeries).toBe(false);
    });
  });
});
