/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it } from 'vitest';

import type { ColumnMetadata } from '@kit/types';

import {
  arrayOperatorHandler,
  betweenOperatorHandler,
  enhancedDateHandler,
  jsonOperatorHandler,
} from '../api/handlers/custom-filter-handlers';

describe('Data Explorer Filter Integration Tests', () => {
  let mockColumns: ColumnMetadata[];

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
  });

  describe('JSON Operator Handler', () => {
    const getMockContext = () => ({
      serviceType: 'data-explorer' as const,
      columns: mockColumns,
      escapeStrategy: 'raw-sql' as const,
    });

    it('should identify JSON columns for JSON operators', () => {
      const condition = {
        column: 'metadata',
        operator: 'hasKey',
        value: 'active',
      };

      expect(jsonOperatorHandler.canHandle(condition, getMockContext())).toBe(
        true,
      );
    });

    it('should reject non-JSON columns for JSON operators', () => {
      const condition = {
        column: 'status',
        operator: 'hasKey',
        value: 'active',
      };

      expect(jsonOperatorHandler.canHandle(condition, getMockContext())).toBe(
        false,
      );
    });

    it('should generate correct SQL for hasKey operator', () => {
      const condition = {
        column: 'metadata',
        operator: 'hasKey',
        value: 'status',
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"metadata" ? \'status\'');
    });

    it('should generate correct SQL for keyEquals operator', () => {
      const condition = {
        column: 'metadata',
        operator: 'keyEquals',
        value: 'status:active',
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"metadata" @> \'status:active\'');
    });

    it('should handle boolean values in keyEquals operator', () => {
      const condition = {
        column: 'metadata',
        operator: 'keyEquals',
        value: 'active:true',
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toContain('OR');
      expect(result).toContain('"active": "true"');
      expect(result).toContain('"active": true');
    });

    it('should generate correct SQL for pathExists operator', () => {
      const condition = {
        column: 'metadata',
        operator: 'pathExists',
        value: '$.user.profile',
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"metadata" #> \'$.user.profile\' IS NOT NULL');
    });

    it('should generate correct SQL for containsText operator', () => {
      const condition = {
        column: 'metadata',
        operator: 'containsText',
        value: 'search term',
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"metadata"::text ILIKE \'search term\'');
    });
  });

  describe('Array Operator Handler', () => {
    const getMockContext = () => ({
      serviceType: 'data-explorer' as const,
      columns: mockColumns,
      escapeStrategy: 'raw-sql' as const,
    });

    it('should identify array operators', () => {
      const condition = {
        column: 'tags',
        operator: 'arrayContains',
        value: '["tag1", "tag2"]',
      };

      expect(arrayOperatorHandler.canHandle(condition, getMockContext())).toBe(
        true,
      );
    });

    it('should generate correct SQL for arrayContains operator', () => {
      const condition = {
        column: 'tags',
        operator: 'arrayContains',
        value: '["published", "featured"]',
      };

      const result = arrayOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"tags" @> \'["published", "featured"]\'');
    });

    it('should generate correct SQL for arrayContainedBy operator', () => {
      const condition = {
        column: 'tags',
        operator: 'arrayContainedBy',
        value: '["all", "tags"]',
      };

      const result = arrayOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"tags" <@ \'["all", "tags"]\'');
    });

    it('should generate correct SQL for overlaps operator', () => {
      const condition = {
        column: 'tags',
        operator: 'overlaps',
        value: '["common", "shared"]',
      };

      const result = arrayOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"tags" && \'["common", "shared"]\'');
    });

    it('should throw error for unsupported array operator', () => {
      const condition = {
        column: 'tags',
        operator: 'invalidOperator',
        value: '["test"]',
      };

      expect(() =>
        arrayOperatorHandler.process(condition, getMockContext()),
      ).toThrow('Unsupported array operator: invalidOperator');
    });
  });

  describe('Enhanced Date Handler', () => {
    const getMockContext = () => ({
      serviceType: 'data-explorer' as const,
      columns: mockColumns,
      escapeStrategy: 'raw-sql' as const,
    });

    it('should identify date columns for enhanced date processing', () => {
      const condition = {
        column: 'created_at',
        operator: 'eq',
        value: '2024-01-15',
      };

      expect(enhancedDateHandler.canHandle(condition, getMockContext())).toBe(
        true,
      );
    });

    it('should reject non-date columns', () => {
      const condition = {
        column: 'status',
        operator: 'eq',
        value: '2024-01-15',
      };

      expect(enhancedDateHandler.canHandle(condition, getMockContext())).toBe(
        false,
      );
    });

    it('should convert absolute date equality to range', () => {
      const condition = {
        column: 'created_at',
        operator: 'eq',
        value: '2024-01-15',
      };

      const result = enhancedDateHandler.process(condition, getMockContext());
      expect(result).toMatch(/BETWEEN '.*' AND '.*'/);
      expect(result).toContain('2024-01-15');
    });

    it('should handle BETWEEN operator with array values', () => {
      const condition = {
        column: 'created_at',
        operator: 'between',
        value: ['2024-01-01T00:00:00.000Z', '2024-01-31T23:59:59.999Z'],
      };

      const result = enhancedDateHandler.process(condition, getMockContext());
      expect(result).toBe(
        "\"created_at\" BETWEEN '2024-01-01T00:00:00.000Z' AND '2024-01-31T23:59:59.999Z'",
      );
    });

    it('should handle NOT BETWEEN operator with array values', () => {
      const condition = {
        column: 'created_at',
        operator: 'notBetween',
        value: ['2024-01-01T00:00:00.000Z', '2024-01-31T23:59:59.999Z'],
      };

      const result = enhancedDateHandler.process(condition, getMockContext());
      expect(result).toBe(
        "\"created_at\" NOT BETWEEN '2024-01-01T00:00:00.000Z' AND '2024-01-31T23:59:59.999Z'",
      );
    });

    it('should handle equals operator with date ranges from relative dates', () => {
      const condition = {
        column: 'created_at',
        operator: 'eq',
        value: ['2024-01-01T00:00:00.000Z', '2024-01-31T23:59:59.999Z'],
      };

      const result = enhancedDateHandler.process(condition, getMockContext());
      expect(result).toBe(
        "\"created_at\" BETWEEN '2024-01-01T00:00:00.000Z' AND '2024-01-31T23:59:59.999Z'",
      );
    });

    it('should return empty string for unsupported operations', () => {
      const condition = {
        column: 'created_at',
        operator: 'gt',
        value: '2024-01-15',
      };

      const result = enhancedDateHandler.process(condition, getMockContext());
      expect(result).toBe('');
    });
  });

  describe('Between Operator Handler', () => {
    const getMockContext = () => ({
      serviceType: 'data-explorer' as const,
      columns: mockColumns,
      escapeStrategy: 'raw-sql' as const,
    });

    it('should identify BETWEEN operators with comma-separated values', () => {
      const condition = {
        column: 'created_at',
        operator: 'between',
        value: '2024-01-01,2024-01-31',
      };

      expect(
        betweenOperatorHandler.canHandle(condition, getMockContext()),
      ).toBe(true);
    });

    it('should reject non-BETWEEN operators', () => {
      const condition = {
        column: 'created_at',
        operator: 'eq',
        value: '2024-01-01,2024-01-31',
      };

      expect(
        betweenOperatorHandler.canHandle(condition, getMockContext()),
      ).toBe(false);
    });

    it('should generate correct SQL for BETWEEN with comma-separated values', () => {
      const condition = {
        column: 'created_at',
        operator: 'between',
        value: '2024-01-01,2024-01-31',
      };

      const result = betweenOperatorHandler.process(
        condition,
        getMockContext(),
      );
      expect(result).toBe(
        "\"created_at\" BETWEEN '2024-01-01' AND '2024-01-31'",
      );
    });

    it('should generate correct SQL for NOT BETWEEN with comma-separated values', () => {
      const condition = {
        column: 'created_at',
        operator: 'notBetween',
        value: '2024-01-01,2024-01-31',
      };

      const result = betweenOperatorHandler.process(
        condition,
        getMockContext(),
      );
      expect(result).toBe(
        "\"created_at\" NOT BETWEEN '2024-01-01' AND '2024-01-31'",
      );
    });

    it('should throw error for invalid BETWEEN format', () => {
      const condition = {
        column: 'created_at',
        operator: 'between',
        value: 'invalid-format',
      };

      expect(() =>
        betweenOperatorHandler.process(condition, getMockContext()),
      ).toThrow('BETWEEN operator requires comma-separated values');
    });

    it('should throw error for non-string values', () => {
      const condition = {
        column: 'created_at',
        operator: 'between',
        value: 123,
      };

      expect(() =>
        betweenOperatorHandler.process(condition, getMockContext()),
      ).toThrow('BETWEEN operator requires comma-separated values');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const getMockContext = () => ({
      serviceType: 'data-explorer' as const,
      columns: mockColumns,
      escapeStrategy: 'raw-sql' as const,
    });

    it('should handle empty values gracefully', () => {
      const condition = {
        column: 'metadata',
        operator: 'hasKey',
        value: '',
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"metadata" ? \'\'');
    });

    it('should handle null values gracefully', () => {
      const condition = {
        column: 'metadata',
        operator: 'hasKey',
        value: null,
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toBe('"metadata" ? NULL');
    });

    it('should handle special characters in values', () => {
      const condition = {
        column: 'metadata',
        operator: 'hasKey',
        value: "key'with'quotes",
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toBe("\"metadata\" ? 'key''with''quotes'");
    });

    it('should handle complex JSON paths', () => {
      const condition = {
        column: 'metadata',
        operator: 'pathExists',
        value: '$.user.profile.settings[0].theme',
      };

      const result = jsonOperatorHandler.process(condition, getMockContext());
      expect(result).toBe(
        '"metadata" #> \'$.user.profile.settings[0].theme\' IS NOT NULL',
      );
    });

    it('should throw error for unsupported JSON operator', () => {
      const condition = {
        column: 'metadata',
        operator: 'unsupportedOp',
        value: 'test',
      };

      expect(() =>
        jsonOperatorHandler.process(condition, getMockContext()),
      ).toThrow('Unsupported JSON operator: unsupportedOp');
    });
  });

  describe('Integration with FilterBuilder', () => {
    it('should work correctly when integrated with FilterBuilder', async () => {
      // This would be an integration test with the actual FilterBuilder
      // For now, we'll test that our handlers follow the expected interface
      const handlers = {
        jsonOperator: jsonOperatorHandler,
        arrayOperator: arrayOperatorHandler,
        enhancedDate: enhancedDateHandler,
        betweenOperator: betweenOperatorHandler,
      };

      // Verify all handlers implement the FilterHandler interface correctly
      Object.values(handlers).forEach((handler) => {
        expect(typeof handler.canHandle).toBe('function');
        expect(typeof handler.process).toBe('function');
      });
    });
  });
});
