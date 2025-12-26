/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FilterBuilder } from '@kit/filters-core';
import type { ColumnMetadata } from '@kit/types';

import { dataExplorerCustomHandlers } from '../api/handlers/custom-filter-handlers';

// Mock the database client
vi.mock('@kit/supabase/client', () => ({
  getDrizzleSupabaseAdminClient: vi.fn(),
}));

describe('Data Explorer - Shared Filtering Integration', () => {
  let mockColumns: ColumnMetadata[];
  let filterBuilder: FilterBuilder;

  beforeEach(() => {
    mockColumns = [
      {
        name: 'metadata',
        ordering: null,
        display_name: null,
        description: null,
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
        ui_config: { data_type: 'jsonb' },
      },
      {
        name: 'tags',
        ordering: null,
        display_name: null,
        description: null,
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
        ui_config: { data_type: 'text' },
      },
      {
        name: 'created_at',
        ordering: null,
        display_name: null,
        description: null,
        is_searchable: false,
        is_visible_in_table: true,
        is_visible_in_detail: true,
        default_value: null,
        is_sortable: true,
        is_filterable: true,
        is_editable: false,
        is_primary_key: false,
        is_required: false,
        relations: [],
        ui_config: { data_type: 'timestamp with time zone' },
      },
      {
        name: 'status',
        ordering: null,
        display_name: null,
        description: null,
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
        ui_config: { data_type: 'text' },
      },
    ];

    filterBuilder = new FilterBuilder({
      serviceType: 'data-explorer',
      columns: mockColumns,
      customHandlers: dataExplorerCustomHandlers,
      escapeStrategy: 'raw-sql',
    });
  });

  describe('JSON Operators Integration', () => {
    it('should use custom JSON handler for hasKey operator', () => {
      const filters = [
        {
          column: 'metadata',
          operator: 'hasKey',
          value: 'status',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toBe('WHERE "metadata" ? \'status\'');
    });

    it('should use custom JSON handler for keyEquals operator', () => {
      const filters = [
        {
          column: 'metadata',
          operator: 'keyEquals',
          value: 'active:true',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toContain('WHERE');
      expect(result).toContain('@>');
      expect(result).toContain('OR'); // Should handle boolean variations
    });

    it('should use custom JSON handler for pathExists operator', () => {
      const filters = [
        {
          column: 'metadata',
          operator: 'pathExists',
          value: '$.user.settings',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toBe(
        'WHERE "metadata" #> \'$.user.settings\' IS NOT NULL',
      );
    });

    it('should use custom JSON handler for containsText operator', () => {
      const filters = [
        {
          column: 'metadata',
          operator: 'containsText',
          value: 'search term',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toBe('WHERE "metadata"::text ILIKE \'search term\'');
    });
  });

  describe('Array Operators Integration', () => {
    it('should use custom array handler for arrayContains operator', () => {
      const filters = [
        {
          column: 'tags',
          operator: 'arrayContains',
          value: '["published", "featured"]',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toBe('WHERE "tags" @> \'["published", "featured"]\'');
    });

    it('should use custom array handler for overlaps operator', () => {
      const filters = [
        {
          column: 'tags',
          operator: 'overlaps',
          value: '["draft", "pending"]',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toBe('WHERE "tags" && \'["draft", "pending"]\'');
    });

    it('should use custom array handler for arrayContainedBy operator', () => {
      const filters = [
        {
          column: 'tags',
          operator: 'arrayContainedBy',
          value: '["all", "categories"]',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toBe('WHERE "tags" <@ \'["all", "categories"]\'');
    });
  });

  describe('Enhanced Date Processing Integration', () => {
    it('should use custom date handler for absolute date equality', () => {
      const filters = [
        {
          column: 'created_at',
          operator: 'eq',
          value: '2024-01-15',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toMatch(/WHERE "created_at" BETWEEN '.*' AND '.*'/);
      expect(result).toContain('2024-01-15');
    });

    it('should use custom date handler for BETWEEN with array values', () => {
      const filters = [
        {
          column: 'created_at',
          operator: 'between',
          value: ['2024-01-01T00:00:00.000Z', '2024-01-31T23:59:59.999Z'],
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toBe(
        "WHERE \"created_at\" BETWEEN '2024-01-01T00:00:00.000Z' AND '2024-01-31T23:59:59.999Z'",
      );
    });

    it('should fall back to standard processing for simple date operators', () => {
      const filters = [
        {
          column: 'created_at',
          operator: 'gt',
          value: '2024-01-15',
        },
      ];

      const result = filterBuilder.buildWhere(filters);
      expect(result).toMatch(/WHERE "created_at" > '.*'/);
    });
  });

  describe('BETWEEN Operator Integration', () => {
    it('should use custom BETWEEN handler for comma-separated values', () => {
      const filter = {
        column: 'created_at',
        operator: 'between',
        value: '2024-01-01,2024-01-31',
      };

      // Test through FilterBuilder (should now work!)
      const result = filterBuilder.buildWhere([filter]);
      expect(result).toBe(
        "WHERE \"created_at\" BETWEEN '2024-01-01' AND '2024-01-31'",
      );
    });

    it('should use custom NOT BETWEEN handler for comma-separated values', () => {
      const filter = {
        column: 'created_at',
        operator: 'notBetween',
        value: '2024-01-01,2024-01-31',
      };

      // Test through FilterBuilder (should now work!)
      const result = filterBuilder.buildWhere([filter]);
      expect(result).toBe(
        "WHERE \"created_at\" NOT BETWEEN '2024-01-01' AND '2024-01-31'",
      );
    });
  });

  describe('Mixed Filter Types', () => {
    it('should handle multiple custom handlers in a single query', () => {
      const filters = [
        {
          column: 'metadata',
          operator: 'hasKey',
          value: 'status',
        },
        {
          column: 'tags',
          operator: 'arrayContains',
          value: '["published"]',
        },
        {
          column: 'created_at',
          operator: 'eq',
          value: '2024-01-15',
        },
      ];

      const result = filterBuilder.buildWhere(filters);

      // Should contain all three conditions
      expect(result).toContain('"metadata" ? \'status\'');
      expect(result).toContain('"tags" @> \'["published"]\'');
      expect(result).toContain('"created_at" BETWEEN');

      // Should be properly connected with ANDs between filters
      // Note: BETWEEN clauses have internal ANDs, so total count will be higher
      const andCount = (result.match(/ AND /g) || []).length;
      expect(andCount).toBeGreaterThanOrEqual(3); // At least 3 ANDs between filters
    });

    it('should fall back to standard processing for simple operators', () => {
      const filters = [
        {
          column: 'status',
          operator: 'eq',
          value: 'active',
        },
        {
          column: 'metadata',
          operator: 'hasKey',
          value: 'category',
        },
      ];

      const result = filterBuilder.buildWhere(filters);

      // Should use standard processing for simple equality
      expect(result).toContain('"status" = \'active\'');
      // Should use custom processing for JSON operator
      expect(result).toContain('"metadata" ? \'category\'');
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle validation errors gracefully', () => {
      const filters = [
        {
          column: 'nonexistent_column',
          operator: 'hasKey',
          value: 'test',
        },
      ];

      const validation = filterBuilder.validateFilter(filters[0]!);
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain(
        "Column 'nonexistent_column' not found",
      );
    });

    it('should validate JSON operators on correct column types', () => {
      const filters = [
        {
          column: 'status', // text column
          operator: 'hasKey', // JSON operator
          value: 'test',
        },
      ];

      // Custom handler should reject non-JSON columns
      const canHandle = dataExplorerCustomHandlers.jsonOperator.canHandle(
        filters[0]!,
        {
          serviceType: 'data-explorer',
          columns: mockColumns,
          escapeStrategy: 'raw-sql',
        },
      );

      expect(canHandle).toBe(false);
    });

    it('should validate array operators correctly', () => {
      const validCondition = {
        column: 'tags',
        operator: 'arrayContains',
        value: '["test"]',
      };

      const invalidCondition = {
        column: 'status',
        operator: 'arrayContains',
        value: '["test"]',
      };

      const context = {
        serviceType: 'data-explorer' as const,
        columns: mockColumns,
        escapeStrategy: 'raw-sql' as const,
      };

      expect(
        dataExplorerCustomHandlers.arrayOperator.canHandle(
          validCondition,
          context,
        ),
      ).toBe(true);
      expect(
        dataExplorerCustomHandlers.arrayOperator.canHandle(
          invalidCondition,
          context,
        ),
      ).toBe(true); // Array operators work on any column type
    });
  });

  describe('Performance and Efficiency', () => {
    it('should handle large filter sets efficiently', () => {
      const filters = Array.from({ length: 50 }, (_, i) => ({
        column: 'status',
        operator: 'eq',
        value: `status_${i}`,
        logicalOperator: 'OR' as const,
      }));

      const start = Date.now();
      const result = filterBuilder.buildWhere(filters);
      const duration = Date.now() - start;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms threshold
      expect(result).toContain('WHERE');
      expect(result.split(' OR ')).toHaveLength(50);
    });

    it('should cache operator lookups for repeated use', () => {
      const filters = [
        { column: 'metadata', operator: 'hasKey', value: 'key1' },
        { column: 'metadata', operator: 'hasKey', value: 'key2' },
        { column: 'metadata', operator: 'hasKey', value: 'key3' },
      ];

      const start = Date.now();
      filterBuilder.buildWhere(filters);
      const duration = Date.now() - start;

      // Should be fast due to caching/optimization
      expect(duration).toBeLessThan(50);
    });
  });
});
