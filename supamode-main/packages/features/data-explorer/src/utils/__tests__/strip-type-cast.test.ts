/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import { stripTypeCast } from '../strip-type-cast';

describe('stripTypeCast', () => {
  describe('PostgreSQL Type Cast Patterns', () => {
    it('should strip single-quoted string type casts', () => {
      expect(stripTypeCast("'in_app'::public.notification_channel")).toBe(
        'in_app',
      );
      expect(stripTypeCast("'active'::user_status")).toBe('active');
      expect(stripTypeCast("'2023-12-25'::date")).toBe('2023-12-25');
      expect(stripTypeCast("'hello world'::text")).toBe('hello world');
    });

    it('should strip double-quoted string type casts', () => {
      expect(stripTypeCast('"pending"::order_status')).toBe('pending');
      expect(stripTypeCast('"admin"::role_type')).toBe('admin');
      expect(stripTypeCast('"test@example.com"::email')).toBe(
        'test@example.com',
      );
    });

    it('should handle complex type names with schemas', () => {
      expect(stripTypeCast("'value'::public.custom_type")).toBe('value');
      expect(stripTypeCast("'data'::schema.table.column_type")).toBe('data');
      expect(stripTypeCast("'item'::my_schema.enum_type")).toBe('item');
    });

    it('should handle type names with spaces', () => {
      expect(stripTypeCast("'timestamp_value'::timestamp with time zone")).toBe(
        'timestamp_value',
      );
      expect(stripTypeCast("'interval_value'::time with time zone")).toBe(
        'interval_value',
      );
    });

    it('should handle empty values in type casts', () => {
      expect(stripTypeCast("''::text")).toBe('');
      expect(stripTypeCast('""::varchar')).toBe('');
    });

    it('should handle values with special characters', () => {
      expect(stripTypeCast("'user@domain.com'::email")).toBe('user@domain.com');
      expect(stripTypeCast("'192.168.1.1'::inet")).toBe('192.168.1.1');
      expect(stripTypeCast("'#FF0000'::color")).toBe('#FF0000');
      expect(stripTypeCast("'https://example.com/path?param=value'::url")).toBe(
        'https://example.com/path?param=value',
      );
    });

    it('should handle values with quotes inside', () => {
      expect(stripTypeCast(`'He said "hello"'::text`)).toBe('He said "hello"');
      expect(stripTypeCast(`"She's here"::text`)).toBe("She's here");
    });
  });

  describe('Non-Type Cast Values', () => {
    it('should return string values unchanged when no type cast pattern', () => {
      expect(stripTypeCast('simple_value')).toBe('simple_value');
      expect(stripTypeCast('user_email')).toBe('user_email');
      expect(stripTypeCast('123')).toBe('123');
      expect(stripTypeCast('true')).toBe('true');
      expect(stripTypeCast('null')).toBe('null');
    });

    it('should handle malformed type cast patterns', () => {
      // Missing quotes
      expect(stripTypeCast('value::text')).toBe('value::text');

      // Only single quote
      expect(stripTypeCast("'value::text")).toBe("'value::text");

      // Missing type
      expect(stripTypeCast("'value'::")).toBe("'value'::");

      // Double colons without type
      expect(stripTypeCast("'value'::")).toBe("'value'::");
    });

    it('should handle values that look like type casts but are not', () => {
      expect(stripTypeCast("This is 'quoted'::but not a type cast")).toBe(
        "This is 'quoted'::but not a type cast",
      );
      expect(stripTypeCast("Multiple 'quotes'::and 'things'")).toBe(
        "Multiple 'quotes'::and 'things'",
      );
    });
  });

  describe('Non-String Input Types', () => {
    it('should convert non-string values to strings', () => {
      expect(stripTypeCast(123)).toBe('123');
      expect(stripTypeCast(true)).toBe('true');
      expect(stripTypeCast(false)).toBe('false');
      expect(stripTypeCast(null)).toBe('null');
      expect(stripTypeCast(undefined)).toBe('undefined');
    });

    it('should handle objects and arrays', () => {
      expect(stripTypeCast({ key: 'value' })).toBe('[object Object]');
      expect(stripTypeCast([1, 2, 3])).toBe('1,2,3');
    });

    it('should handle numeric values that look like type casts', () => {
      // These should just be converted to strings since they're not strings initially
      expect(stripTypeCast(42)).toBe('42');
      expect(stripTypeCast(3.14)).toBe('3.14');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string', () => {
      expect(stripTypeCast('')).toBe('');
    });

    it('should handle whitespace-only strings', () => {
      expect(stripTypeCast('   ')).toBe('   ');
      expect(stripTypeCast('\t\n')).toBe('\t\n');
    });

    it('should handle complex nested quotes', () => {
      expect(stripTypeCast(`'{"key": "value"}'::jsonb`)).toBe(
        '{"key": "value"}',
      );
      expect(stripTypeCast(`'["item1", "item2"]'::json`)).toBe(
        '["item1", "item2"]',
      );
    });

    it('should handle escaped quotes in values', () => {
      // Note: In actual PostgreSQL, escaped quotes would be handled differently,
      // but our simple regex approach treats them as literal characters
      expect(stripTypeCast(`'value with \\'escape\\''::text`)).toBe(
        `value with \\'escape\\'`,
      );
    });

    it('should be case sensitive for type names', () => {
      expect(stripTypeCast("'value'::TEXT")).toBe('value');
      expect(stripTypeCast("'value'::Text")).toBe('value');
    });

    it('should handle very long type names', () => {
      const longTypeName =
        'very_long_schema_name.very_long_table_name.very_long_column_type_name';
      expect(stripTypeCast(`'value'::${longTypeName}`)).toBe('value');
    });
  });

  describe('Real-World PostgreSQL Examples', () => {
    it('should handle common PostgreSQL enum casts', () => {
      expect(stripTypeCast("'pending'::order_status")).toBe('pending');
      expect(stripTypeCast("'completed'::order_status")).toBe('completed');
      expect(stripTypeCast("'admin'::user_role")).toBe('admin');
    });

    it('should handle timestamp casts', () => {
      expect(stripTypeCast("'2023-12-25 10:30:00'::timestamp")).toBe(
        '2023-12-25 10:30:00',
      );
      expect(stripTypeCast("'2023-12-25T10:30:00Z'::timestamptz")).toBe(
        '2023-12-25T10:30:00Z',
      );
    });

    it('should handle UUID casts', () => {
      expect(
        stripTypeCast("'550e8400-e29b-41d4-a716-446655440000'::uuid"),
      ).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should handle JSON casts', () => {
      expect(stripTypeCast(`'{"name": "John", "age": 30}'::jsonb`)).toBe(
        '{"name": "John", "age": 30}',
      );
      expect(stripTypeCast(`'[1, 2, 3, 4, 5]'::json`)).toBe('[1, 2, 3, 4, 5]');
    });

    it('should handle network type casts', () => {
      expect(stripTypeCast("'192.168.1.1'::inet")).toBe('192.168.1.1');
      expect(stripTypeCast("'192.168.0.0/24'::cidr")).toBe('192.168.0.0/24');
    });

    it('should handle array type casts', () => {
      expect(stripTypeCast("'{1,2,3}'::integer[]")).toBe('{1,2,3}');
      expect(stripTypeCast('\'{"apple","banana","cherry"}\'::text[]')).toBe(
        '{"apple","banana","cherry"}',
      );
    });

    it('should handle parameterized type casts', () => {
      expect(stripTypeCast("'test'::varchar(255)")).toBe('test');
      expect(stripTypeCast("'123.45'::numeric(10,2)")).toBe('123.45');
      expect(stripTypeCast("'data'::char(5)")).toBe('data');
    });

    it('should handle schema names with hyphens', () => {
      expect(stripTypeCast("'value'::my-schema.my_type")).toBe('value');
      expect(stripTypeCast("'data'::app-data.user_status")).toBe('data');
      expect(stripTypeCast("'test'::multi-word-schema.enum_type")).toBe('test');
    });

    it('should require matching quote types', () => {
      // Should work with matching quotes
      expect(stripTypeCast("'value'::text")).toBe('value');
      expect(stripTypeCast('"value"::text')).toBe('value');

      // Should not work with mismatched quotes
      expect(stripTypeCast('\'value"::text')).toBe('\'value"::text');
      expect(stripTypeCast('"value\'::text')).toBe('"value\'::text');
    });
  });
});
