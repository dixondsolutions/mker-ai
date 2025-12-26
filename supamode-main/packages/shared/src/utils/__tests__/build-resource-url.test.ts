/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import {
  type RecordIdentifier,
  buildResourceUrl,
  buildWhereClause,
  getRecordIdentifier,
} from '../build-resource-url';

describe('buildResourceUrl', () => {
  const createBasicTableMetadata = (overrides = {}) => ({
    primary_keys: [],
    unique_constraints: [],
    ...overrides,
  });

  describe('Single Primary Key', () => {
    it('should build URL with single primary key', () => {
      const params = {
        schema: 'public',
        table: 'users',
        record: { id: 123, name: 'John' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'id' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/public/users/record/123');
    });

    it('should handle string primary key values', () => {
      const params = {
        schema: 'auth',
        table: 'users',
        record: { uuid: 'abc-123-def', email: 'test@example.com' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'uuid' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/auth/users/record/abc-123-def');
    });

    it('should handle zero values as valid primary keys', () => {
      const params = {
        schema: 'public',
        table: 'items',
        record: { id: 0, name: 'Item Zero' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'id' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/public/items/record/0');
    });

    it('should return empty string when primary key column is missing', () => {
      const params = {
        schema: 'public',
        table: 'users',
        record: { name: 'John' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: null }], // null column name
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('');
    });

    it('should return empty string when primary key column is empty string', () => {
      const params = {
        schema: 'public',
        table: 'users',
        record: { name: 'John' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: '' }], // empty column name
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('');
    });
  });

  describe('Composite Primary Key', () => {
    it('should build URL with composite primary key using query parameters', () => {
      const params = {
        schema: 'inventory',
        table: 'order_items',
        record: { order_id: 456, product_id: 789, quantity: 2 },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [
            { column_name: 'order_id' },
            { column_name: 'product_id' },
          ],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe(
        '/resources/inventory/order_items/record?order_id=456&product_id=789',
      );
    });

    it('should handle composite primary keys with string values', () => {
      const params = {
        schema: 'content',
        table: 'translations',
        record: { lang: 'en', key: 'welcome.title', value: 'Welcome' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'lang' }, { column_name: 'key' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe(
        '/resources/content/translations/record?lang=en&key=welcome.title',
      );
    });

    it('should handle special characters in composite primary key values', () => {
      const params = {
        schema: 'public',
        table: 'data',
        record: { tenant: 'my-org', key: 'config/settings.json' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'tenant' }, { column_name: 'key' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe(
        '/resources/public/data/record?tenant=my-org&key=config%2Fsettings.json',
      );
    });
  });

  describe('Unique Constraints', () => {
    it('should build URL with single unique constraint when no primary key', () => {
      const params = {
        schema: 'public',
        table: 'users',
        record: { email: 'user@example.com', name: 'John' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [],
          unique_constraints: [{ constraint_name: 'email' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/public/users/record/user@example.com');
    });

    it('should build URL with multiple unique constraints using query parameters', () => {
      const params = {
        schema: 'analytics',
        table: 'events',
        record: { user_id: 123, session_id: 'abc-def', event_type: 'click' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [],
          unique_constraints: [
            { constraint_name: 'user_id' },
            { constraint_name: 'session_id' },
          ],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe(
        '/resources/analytics/events/record?user_id=123&session_id=abc-def',
      );
    });

    it('should return empty string when unique constraint column is missing', () => {
      const params = {
        schema: 'public',
        table: 'users',
        record: { name: 'John' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [],
          unique_constraints: [{ constraint_name: null }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('');
    });

    it('should prioritize primary keys over unique constraints', () => {
      const params = {
        schema: 'public',
        table: 'users',
        record: { id: 123, email: 'user@example.com' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'id' }],
          unique_constraints: [{ constraint_name: 'email' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/public/users/record/123');
    });
  });

  describe('No Identifiers', () => {
    it('should return empty string when no primary keys or unique constraints', () => {
      const params = {
        schema: 'public',
        table: 'logs',
        record: { message: 'Error occurred', timestamp: '2023-12-25' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [],
          unique_constraints: [],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('');
    });
  });

  describe('Duplicate Handling', () => {
    it('should remove duplicate primary keys', () => {
      const params = {
        schema: 'public',
        table: 'test',
        record: { id: 123 },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [
            { column_name: 'id' },
            { column_name: 'id' }, // duplicate
          ],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/public/test/record/123');
    });

    it('should remove duplicate unique constraints', () => {
      const params = {
        schema: 'public',
        table: 'test',
        record: { email: 'test@example.com' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [],
          unique_constraints: [
            { constraint_name: 'email' },
            { constraint_name: 'email' }, // duplicate
          ],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/public/test/record/test@example.com');
    });
  });

  describe('Edge Cases', () => {
    it('should handle boolean values in primary key', () => {
      const params = {
        schema: 'config',
        table: 'settings',
        record: { is_active: true, value: 'test' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'is_active' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/config/settings/record/true');
    });

    it('should handle null values in record (though this is unusual for PKs)', () => {
      const params = {
        schema: 'public',
        table: 'test',
        record: { id: null, name: 'test' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'id' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/public/test/record/null');
    });

    it('should handle undefined values in record', () => {
      const params = {
        schema: 'public',
        table: 'test',
        record: { id: undefined, name: 'test' },
        tableMetadata: createBasicTableMetadata({
          primary_keys: [{ column_name: 'id' }],
        }),
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('/resources/public/test/record/undefined');
    });

    it('should handle empty metadata arrays', () => {
      const params = {
        schema: 'public',
        table: 'test',
        record: { data: 'test' },
        tableMetadata: {
          primary_keys: [],
          unique_constraints: [],
        },
      };

      const result = buildResourceUrl(params);
      expect(result).toBe('');
    });
  });
});

describe('getRecordIdentifier', () => {
  describe('Single Primary Key', () => {
    it('should return single identifier for single primary key', () => {
      const params = {
        record: { id: 123, name: 'John' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'single',
        column: 'id',
        value: 123,
      });
    });

    it('should return none when primary key value is null', () => {
      const params = {
        record: { id: null, name: 'John' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });

    it('should return none when primary key value is undefined', () => {
      const params = {
        record: { id: undefined, name: 'John' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });

    it('should return none when primary key column is missing', () => {
      const params = {
        record: { name: 'John' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });

    it('should handle zero as valid primary key value', () => {
      const params = {
        record: { id: 0, name: 'Zero Item' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'single',
        column: 'id',
        value: 0,
      });
    });

    it('should handle empty string as valid primary key value', () => {
      const params = {
        record: { key: '', name: 'Empty Key' },
        tableMetadata: {
          primaryKeys: ['key'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'single',
        column: 'key',
        value: '',
      });
    });
  });

  describe('Composite Primary Key', () => {
    it('should return composite identifier for multiple primary keys', () => {
      const params = {
        record: { order_id: 456, product_id: 789, quantity: 2 },
        tableMetadata: {
          primaryKeys: ['order_id', 'product_id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'composite',
        values: { order_id: 456, product_id: 789 },
      });
    });

    it('should return none when any primary key value is missing', () => {
      const params = {
        record: { order_id: 456, quantity: 2 }, // product_id missing
        tableMetadata: {
          primaryKeys: ['order_id', 'product_id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });

    it('should return none when any primary key value is null', () => {
      const params = {
        record: { order_id: 456, product_id: null },
        tableMetadata: {
          primaryKeys: ['order_id', 'product_id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });

    it('should handle composite keys with mixed data types', () => {
      const params = {
        record: { tenant: 'org-123', user_id: 456, is_active: true },
        tableMetadata: {
          primaryKeys: ['tenant', 'user_id'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'composite',
        values: { tenant: 'org-123', user_id: 456 },
      });
    });
  });

  describe('Unique Constraints', () => {
    it('should return single identifier for single unique constraint when no primary key', () => {
      const params = {
        record: { email: 'user@example.com', name: 'John' },
        tableMetadata: {
          primaryKeys: [],
          uniqueConstraints: ['email'],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'single',
        column: 'email',
        value: 'user@example.com',
      });
    });

    it('should return composite identifier for multiple unique constraints', () => {
      const params = {
        record: { tenant: 'org-1', username: 'john', email: 'john@org1.com' },
        tableMetadata: {
          primaryKeys: [],
          uniqueConstraints: ['tenant', 'username'],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'composite',
        values: { tenant: 'org-1', username: 'john' },
      });
    });

    it('should return none when unique constraint value is null', () => {
      const params = {
        record: { email: null, name: 'John' },
        tableMetadata: {
          primaryKeys: [],
          uniqueConstraints: ['email'],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });

    it('should prioritize primary keys over unique constraints', () => {
      const params = {
        record: { id: 123, email: 'user@example.com' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: ['email'],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'single',
        column: 'id',
        value: 123,
      });
    });
  });

  describe('No Identifiers', () => {
    it('should return none when no primary keys or unique constraints exist', () => {
      const params = {
        record: { name: 'John', age: 30 },
        tableMetadata: {
          primaryKeys: [],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });

    it('should return none when metadata is empty/undefined', () => {
      const params = {
        record: { name: 'John' },
        tableMetadata: {
          primaryKeys: undefined as any,
          uniqueConstraints: undefined as any,
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle boolean values in identifiers', () => {
      const params = {
        record: { is_default: true, config_value: 'test' },
        tableMetadata: {
          primaryKeys: ['is_default'],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({
        type: 'single',
        column: 'is_default',
        value: true,
      });
    });

    it('should handle empty arrays in metadata', () => {
      const params = {
        record: { data: 'test' },
        tableMetadata: {
          primaryKeys: [],
          uniqueConstraints: [],
        },
      };

      const result = getRecordIdentifier(params);
      expect(result).toEqual({ type: 'none' });
    });
  });
});

describe('buildWhereClause', () => {
  describe('Single Identifier', () => {
    it('should build where clause for single primary key', () => {
      const params = {
        record: { id: 123, name: 'John' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: [],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toEqual({ id: 123 });
    });

    it('should build where clause for single unique constraint', () => {
      const params = {
        record: { email: 'user@example.com', name: 'John' },
        tableMetadata: {
          primaryKeys: [],
          uniqueConstraints: ['email'],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toEqual({ email: 'user@example.com' });
    });

    it('should handle various data types in where clause', () => {
      const testCases = [
        { value: 123, expected: { id: 123 } },
        { value: 'string-value', expected: { id: 'string-value' } },
        { value: true, expected: { id: true } },
        { value: false, expected: { id: false } },
        { value: 0, expected: { id: 0 } },
        { value: '', expected: { id: '' } },
      ];

      testCases.forEach(({ value, expected }) => {
        const params = {
          record: { id: value },
          tableMetadata: {
            primaryKeys: ['id'],
            uniqueConstraints: [],
          },
        };

        const result = buildWhereClause(params);
        expect(result).toEqual(expected);
      });
    });
  });

  describe('Composite Identifier', () => {
    it('should build where clause for composite primary key', () => {
      const params = {
        record: { order_id: 456, product_id: 789, quantity: 2 },
        tableMetadata: {
          primaryKeys: ['order_id', 'product_id'],
          uniqueConstraints: [],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toEqual({ order_id: 456, product_id: 789 });
    });

    it('should build where clause for composite unique constraints', () => {
      const params = {
        record: { tenant: 'org-1', username: 'john', email: 'john@org1.com' },
        tableMetadata: {
          primaryKeys: [],
          uniqueConstraints: ['tenant', 'username'],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toEqual({ tenant: 'org-1', username: 'john' });
    });

    it('should handle mixed data types in composite where clause', () => {
      const params = {
        record: { tenant: 'org-123', user_id: 456, is_active: true },
        tableMetadata: {
          primaryKeys: ['tenant', 'user_id'],
          uniqueConstraints: [],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toEqual({ tenant: 'org-123', user_id: 456 });
    });
  });

  describe('No Reliable Identifier', () => {
    it('should return null when no primary keys or unique constraints', () => {
      const params = {
        record: { name: 'John', age: 30 },
        tableMetadata: {
          primaryKeys: [],
          uniqueConstraints: [],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toBeNull();
    });

    it('should return null when primary key value is missing', () => {
      const params = {
        record: { name: 'John' }, // id is missing
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: [],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toBeNull();
    });

    it('should return null when primary key value is null', () => {
      const params = {
        record: { id: null, name: 'John' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: [],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toBeNull();
    });

    it('should return null when any composite key value is missing', () => {
      const params = {
        record: { order_id: 456 }, // product_id is missing
        tableMetadata: {
          primaryKeys: ['order_id', 'product_id'],
          uniqueConstraints: [],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toBeNull();
    });
  });

  describe('Integration with getRecordIdentifier', () => {
    it('should handle all identifier types correctly', () => {
      const testCases: Array<{
        record: Record<string, unknown>;
        metadata: { primaryKeys: string[]; uniqueConstraints: string[] };
        expectedType: RecordIdentifier['type'];
        expectedWhereClause: Record<string, unknown> | null;
      }> = [
        {
          record: { id: 123 },
          metadata: { primaryKeys: ['id'], uniqueConstraints: [] },
          expectedType: 'single',
          expectedWhereClause: { id: 123 },
        },
        {
          record: { order_id: 1, product_id: 2 },
          metadata: {
            primaryKeys: ['order_id', 'product_id'],
            uniqueConstraints: [],
          },
          expectedType: 'composite',
          expectedWhereClause: { order_id: 1, product_id: 2 },
        },
        {
          record: { name: 'test' },
          metadata: { primaryKeys: [], uniqueConstraints: [] },
          expectedType: 'none',
          expectedWhereClause: null,
        },
      ];

      testCases.forEach(
        ({ record, metadata, expectedType, expectedWhereClause }) => {
          const identifier = getRecordIdentifier({
            record,
            tableMetadata: metadata,
          });
          expect(identifier.type).toBe(expectedType);

          const whereClause = buildWhereClause({
            record,
            tableMetadata: metadata,
          });
          expect(whereClause).toEqual(expectedWhereClause);
        },
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty metadata gracefully', () => {
      const params = {
        record: { data: 'test' },
        tableMetadata: {
          primaryKeys: undefined as any,
          uniqueConstraints: undefined as any,
        },
      };

      const result = buildWhereClause(params);
      expect(result).toBeNull();
    });

    it('should prioritize primary keys over unique constraints in where clause', () => {
      const params = {
        record: { id: 123, email: 'user@example.com' },
        tableMetadata: {
          primaryKeys: ['id'],
          uniqueConstraints: ['email'],
        },
      };

      const result = buildWhereClause(params);
      expect(result).toEqual({ id: 123 });
    });
  });
});
