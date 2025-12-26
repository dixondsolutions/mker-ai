/**
 * @vitest-environment node
 */
import { describe, expect, it, vi } from 'vitest';

import type { ColumnMetadata } from '@kit/types';

import { getFieldPlaceholder } from '../field-placeholder';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  getI18n: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'dataExplorer:record.placeholder.default': `Enter ${options?.name}…`,
        'dataExplorer:record.placeholder.null': 'NULL value',
        'dataExplorer:record.placeholder.true': 'True',
        'dataExplorer:record.placeholder.false': 'False',
        'dataExplorer:record.placeholder.array': 'Empty array',
        'dataExplorer:record.placeholder.json': 'Empty JSON object',
        'dataExplorer:record.placeholder.jsonb': 'Empty JSONB object',
        'dataExplorer:record.placeholder.uuid': 'Auto-generated UUID',
        'dataExplorer:record.placeholder.sequence': 'Auto-generated sequence',
        'dataExplorer:record.placeholder.now': 'Current timestamp',
        'dataExplorer:record.placeholder.generated': 'Auto-generated value',
        'dataExplorer:record.placeholder.arrayOf': `Array of ${options?.type}`,
      };
      return translations[key] || key;
    },
  }),
}));

// Mock strip-type-cast
vi.mock('../strip-type-cast', () => ({
  stripTypeCast: (value: string) => {
    // Simple mock implementation
    const typecastRegex = /^['"](.+)['"]::[\w\s.]+$/;
    const match = value.match(typecastRegex);
    return match ? match[1] : value;
  },
}));

describe('getFieldPlaceholder', () => {
  const createMockField = (
    overrides: Partial<ColumnMetadata> = {},
  ): ColumnMetadata => ({
    name: 'test_field',
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
    ui_config: {
      data_type: 'text',
    },
    ...overrides,
  });

  describe('Default Placeholder', () => {
    it('should return default placeholder when no default value', () => {
      const field = createMockField({
        name: 'username',
        default_value: null,
      });

      expect(getFieldPlaceholder(field)).toBe('Enter username…');
    });

    it('should return default placeholder when empty default value', () => {
      const field = createMockField({
        name: 'email',
        default_value: '',
      });

      expect(getFieldPlaceholder(field)).toBe('Enter email…');
    });

    it('should return default placeholder for empty string literal', () => {
      const field = createMockField({
        name: 'description',
        default_value: "''",
      });

      expect(getFieldPlaceholder(field)).toBe('Enter description…');
    });

    it('should use display_name when available', () => {
      const field = createMockField({
        name: 'user_email',
        display_name: 'Email Address',
        default_value: null,
      });

      expect(getFieldPlaceholder(field)).toBe('Enter Email Address…');
    });

    it('should handle whitespace in default value', () => {
      const field = createMockField({
        name: 'test',
        default_value: '   ',
      });

      expect(getFieldPlaceholder(field)).toBe('Enter test…');
    });
  });

  describe('Exact Matches', () => {
    it('should handle null default', () => {
      const field = createMockField({
        default_value: 'null',
      });

      expect(getFieldPlaceholder(field)).toBe('NULL value');
    });

    it('should handle boolean defaults', () => {
      const trueField = createMockField({
        default_value: 'true',
      });
      expect(getFieldPlaceholder(trueField)).toBe('True');

      const falseField = createMockField({
        default_value: 'false',
      });
      expect(getFieldPlaceholder(falseField)).toBe('False');
    });

    it('should handle array defaults', () => {
      const field = createMockField({
        default_value: '[]',
      });

      expect(getFieldPlaceholder(field)).toBe('Empty array');
    });

    it('should handle JSON defaults', () => {
      const jsonField = createMockField({
        default_value: "'{}'::json",
      });
      expect(getFieldPlaceholder(jsonField)).toBe('Empty JSON object');

      const jsonbField = createMockField({
        default_value: "'{}'::jsonb",
      });
      expect(getFieldPlaceholder(jsonbField)).toBe('Empty JSONB object');
    });

    it('should be case insensitive for exact matches', () => {
      const field = createMockField({
        default_value: 'NULL', // uppercase
      });

      expect(getFieldPlaceholder(field)).toBe('NULL value');
    });
  });

  describe('UUID Generators', () => {
    it('should handle known UUID functions', () => {
      const functions = [
        'gen_random_uuid()',
        'uuid_generate_v4()',
        'extensions.uuid_generate_v4()',
        'uuid_generate_v1()',
      ];

      functions.forEach((func) => {
        const field = createMockField({
          default_value: func,
        });
        expect(getFieldPlaceholder(field)).toBe('Auto-generated UUID');
      });
    });

    it('should handle UUID functions with case insensitivity', () => {
      const field = createMockField({
        default_value: 'GEN_RANDOM_UUID()',
      });

      expect(getFieldPlaceholder(field)).toBe('Auto-generated UUID');
    });

    it('should detect any function on UUID columns', () => {
      const field = createMockField({
        default_value: 'custom_uuid_fn()',
        ui_config: {
          data_type: 'uuid',
        },
      });

      expect(getFieldPlaceholder(field)).toBe('Auto-generated UUID');
    });

    it('should not treat non-function text as UUID generator', () => {
      const field = createMockField({
        default_value: 'not_a_function',
        ui_config: {
          data_type: 'uuid',
        },
      });

      expect(getFieldPlaceholder(field)).toBe('not_a_function');
    });
  });

  describe('Sequences', () => {
    it('should handle nextval sequence functions', () => {
      const sequences = [
        "nextval('user_id_seq')",
        "nextval('public.order_id_seq')",
        "nextval('seq_name'::regclass)",
      ];

      sequences.forEach((seq) => {
        const field = createMockField({
          default_value: seq,
        });
        expect(getFieldPlaceholder(field)).toBe('Auto-generated sequence');
      });
    });

    it('should handle nextval with case insensitivity', () => {
      const field = createMockField({
        default_value: "NEXTVAL('seq_name')",
      });

      expect(getFieldPlaceholder(field)).toBe('Auto-generated sequence');
    });
  });

  describe('Timestamps and Dates', () => {
    it('should handle timestamp functions', () => {
      const functions = [
        'now()',
        'current_timestamp',
        'current_date',
        'current_time',
      ];

      functions.forEach((func) => {
        const field = createMockField({
          default_value: func,
        });
        expect(getFieldPlaceholder(field)).toBe('Current timestamp');
      });
    });

    it('should handle timestamp data types', () => {
      const types = ['timestamp', 'timestamptz', 'timestamp with time zone'];

      types.forEach((dataType) => {
        const field = createMockField({
          default_value: 'some_function()',
          ui_config: {
            data_type: dataType,
          },
        });
        expect(getFieldPlaceholder(field)).toBe('Current timestamp');
      });
    });

    it('should handle case insensitivity for timestamp functions', () => {
      const field = createMockField({
        default_value: 'NOW()',
      });

      expect(getFieldPlaceholder(field)).toBe('Current timestamp');
    });
  });

  describe('Casted Literals', () => {
    it('should handle JSON/JSONB casts', () => {
      const jsonField = createMockField({
        default_value: "'{}'::",
      });
      // This won't match the cast pattern exactly, should fall through to stripTypeCast

      const jsonbField = createMockField({
        default_value: '\'{"key": "value"}\'::jsonb',
      });
      expect(getFieldPlaceholder(jsonbField)).toBe('Empty JSON object');
    });

    it('should handle array type casts', () => {
      const field = createMockField({
        default_value: "'[1,2,3]'::integer[]",
      });

      expect(getFieldPlaceholder(field)).toBe('Array of integer');
    });

    it('should handle various array types', () => {
      const arrayTypes = [
        { cast: "'values'::text[]", expected: 'Array of text' },
        { cast: "'items'::varchar[]", expected: 'Array of varchar' },
        { cast: "'numbers'::numeric[]", expected: 'Array of numeric' },
      ];

      arrayTypes.forEach(({ cast, expected }) => {
        const field = createMockField({
          default_value: cast,
        });
        expect(getFieldPlaceholder(field)).toBe(expected);
      });
    });

    it('should not match malformed cast patterns', () => {
      const field = createMockField({
        default_value: "invalid'::text",
      });

      expect(getFieldPlaceholder(field)).toBe("invalid'::text");
    });
  });

  describe('Generic Function Calls', () => {
    it('should handle any function call pattern', () => {
      const functions = [
        'custom_function()',
        'generate_id(123)',
        "get_default_value('param')",
        'complex_fn(arg1, arg2, arg3)',
      ];

      functions.forEach((func) => {
        const field = createMockField({
          default_value: func,
        });
        expect(getFieldPlaceholder(field)).toBe('Auto-generated value');
      });
    });

    it('should not match invalid function patterns', () => {
      const invalid = [
        '123function()', // starts with number
        'function name()', // contains space
        'function', // no parentheses
        'function(', // incomplete
        'schema.function_name()', // contains dot (not in \w)
      ];

      invalid.forEach((func) => {
        const field = createMockField({
          default_value: func,
        });
        expect(getFieldPlaceholder(field)).not.toBe('Auto-generated value');
      });
    });
  });

  describe('Fallback Behavior', () => {
    it('should strip type cast and return literal value', () => {
      const field = createMockField({
        default_value: "'custom_value'::text",
      });

      expect(getFieldPlaceholder(field)).toBe('custom_value');
    });

    it('should return raw value when no patterns match', () => {
      const field = createMockField({
        default_value: 'plain_text_value',
      });

      expect(getFieldPlaceholder(field)).toBe('plain_text_value');
    });

    it('should handle numeric literals', () => {
      const field = createMockField({
        default_value: '42',
      });

      expect(getFieldPlaceholder(field)).toBe('42');
    });

    it('should handle string literals without casting', () => {
      const field = createMockField({
        default_value: 'default_string',
      });

      expect(getFieldPlaceholder(field)).toBe('default_string');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty or undefined ui_config', () => {
      const field = createMockField({
        default_value: 'gen_random_uuid()',
        ui_config: undefined as any,
      });

      expect(getFieldPlaceholder(field)).toBe('Auto-generated UUID');
    });

    it('should handle whitespace around default values', () => {
      const field = createMockField({
        default_value: '  now()  ',
      });

      expect(getFieldPlaceholder(field)).toBe('Current timestamp');
    });

    it('should handle complex nested patterns', () => {
      const field = createMockField({
        default_value: 'COALESCE(custom_fn(), gen_random_uuid())',
      });

      // Should be treated as a generic function call
      expect(getFieldPlaceholder(field)).toBe('Auto-generated value');
    });

    it('should handle very long default values', () => {
      const longValue = 'a'.repeat(1000);
      const field = createMockField({
        default_value: longValue,
      });

      expect(getFieldPlaceholder(field)).toBe(longValue);
    });

    it('should handle special characters in default values', () => {
      const field = createMockField({
        default_value: "'value with spaces and symbols!@#$%'::text",
      });

      expect(getFieldPlaceholder(field)).toBe(
        'value with spaces and symbols!@#$%',
      );
    });

    it('should prioritize exact matches over pattern matches', () => {
      // 'true' should match exact pattern, not be treated as literal
      const field = createMockField({
        default_value: 'true',
      });

      expect(getFieldPlaceholder(field)).toBe('True');
    });

    it('should handle UUID column with non-UUID function', () => {
      const field = createMockField({
        default_value: 'custom_string_fn()',
        ui_config: {
          data_type: 'uuid',
        },
      });

      // Should still be treated as UUID since column is UUID type
      expect(getFieldPlaceholder(field)).toBe('Auto-generated UUID');
    });
  });

  describe('Real-World Examples', () => {
    it('should handle common database defaults', () => {
      const examples = [
        { value: 'gen_random_uuid()', expected: 'Auto-generated UUID' },
        { value: 'now()', expected: 'Current timestamp' },
        {
          value: "nextval('users_id_seq')",
          expected: 'Auto-generated sequence',
        },
        { value: 'true', expected: 'True' },
        { value: 'false', expected: 'False' },
        { value: "'active'::user_status", expected: 'active' },
        { value: '0', expected: '0' },
        { value: "''", expected: 'Enter test_field…' },
      ];

      examples.forEach(({ value, expected }) => {
        const field = createMockField({
          default_value: value,
        });
        expect(getFieldPlaceholder(field)).toBe(expected);
      });
    });

    it('should handle PostgreSQL-specific patterns', () => {
      const field = createMockField({
        default_value: '\'{"created_at": "now()"}\'::jsonb',
      });

      expect(getFieldPlaceholder(field)).toBe('Empty JSON object');
    });

    it('should handle enum defaults', () => {
      const field = createMockField({
        default_value: "'pending'::order_status",
      });

      expect(getFieldPlaceholder(field)).toBe('pending');
    });
  });
});
