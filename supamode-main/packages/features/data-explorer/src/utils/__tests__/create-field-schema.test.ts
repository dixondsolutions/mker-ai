/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { ColumnMetadata, PostgresDataType } from '@kit/types';

import { createFieldSchema } from '../create-field-schema';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  getI18n: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      const translations: Record<string, string> = {
        'dataExplorer:errors.required': 'This field is required',
        'dataExplorer:errors.invalid_email': 'Invalid email format',
        'dataExplorer:errors.invalid_color': 'Invalid color format',
        'dataExplorer:errors.invalid_url': 'Invalid URL format',
        'dataExplorer:errors.invalid_relation': 'Invalid relation',
        'dataExplorer:errors.invalid_uuid': 'Invalid UUID format',
        'dataExplorer:errors.invalid_ip': 'Invalid IP address',
        'dataExplorer:errors.invalid_time': 'Invalid time format',
        'dataExplorer:errors.invalid_date': 'Invalid date format',
        'dataExplorer:errors.invalid_json': 'Invalid JSON format',
        'dataExplorer:errors.invalid_enum': 'Invalid enum value',
        'dataExplorer:errors.maxLength': `Maximum ${options?.maxLength} characters allowed`,
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

describe('createFieldSchema', () => {
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
      data_type: 'text' as PostgresDataType,
    },
    ...overrides,
  });

  describe('Email Schema', () => {
    it('should create email schema for ui_data_type email', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          ui_data_type: 'email',
        },
      });

      const schema = createFieldSchema(field);

      // Valid email should pass
      expect(() => schema.parse('test@example.com')).not.toThrow();

      // Invalid email should fail
      expect(() => schema.parse('invalid-email')).toThrow();
    });

    it('should require email if field is required', () => {
      const field = createMockField({
        is_required: true,
        ui_config: {
          data_type: 'text' as PostgresDataType,
          ui_data_type: 'email',
        },
      });

      const schema = createFieldSchema(field);

      expect(() => schema.parse('')).toThrow();
      expect(() => schema.parse(undefined)).toThrow();
    });
  });

  describe('Color Schema', () => {
    it('should create color schema for ui_data_type color', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          ui_data_type: 'color',
        },
      });

      const schema = createFieldSchema(field);

      // Valid hex color should pass
      expect(() => schema.parse('#FF0000')).not.toThrow();
      expect(() => schema.parse('#abc123')).not.toThrow();

      // Invalid color should fail
      expect(() => schema.parse('red')).toThrow();
      expect(() => schema.parse('#GG0000')).toThrow();
      expect(() => schema.parse('#FF00')).toThrow();
    });
  });

  describe('URL Schema', () => {
    it('should create URL schema for ui_data_type url', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          ui_data_type: 'url',
        },
      });

      const schema = createFieldSchema(field);

      // Valid URLs should pass
      expect(() => schema.parse('https://example.com')).not.toThrow();
      expect(() => schema.parse('http://localhost:3000')).not.toThrow();

      // Invalid URL should fail
      expect(() => schema.parse('not-a-url')).toThrow();
    });
  });

  describe('Boolean Schema', () => {
    it('should create boolean schema for ui_data_type switch', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          ui_data_type: 'switch',
        },
      });

      const schema = createFieldSchema(field);

      expect(() => schema.parse(true)).not.toThrow();
      expect(() => schema.parse(false)).not.toThrow();

      // String coercion should work
      expect(schema.parse('true')).toBe(true);
      expect(schema.parse('false')).toBe(false);
      expect(schema.parse('on')).toBe(true);
    });

    it('should create boolean schema for boolean data_type', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'boolean' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(() => schema.parse(true)).not.toThrow();
      expect(() => schema.parse(false)).not.toThrow();
    });
  });

  describe('UUID Schema', () => {
    it('should create UUID schema for uuid data_type', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'uuid' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Valid UUID should pass
      expect(() =>
        schema.parse('550e8400-e29b-41d4-a716-446655440000'),
      ).not.toThrow();

      // Invalid UUID should fail
      expect(() => schema.parse('not-a-uuid')).toThrow();
    });

    it('should use relation error message for relations', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'uuid' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field, true); // isRelation = true

      try {
        schema.parse('invalid-uuid');
      } catch (error) {
        expect((error as z.ZodError).issues[0].message).toBe(
          'Invalid relation',
        );
      }
    });
  });

  describe('Network Schema', () => {
    it('should create network schema for inet/cidr data_type', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'inet' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Valid IP addresses should pass
      expect(() => schema.parse('192.168.1.1')).not.toThrow();
      expect(() => schema.parse('::1')).not.toThrow();

      // Invalid IP should fail
      expect(() => schema.parse('not-an-ip')).toThrow();
    });
  });

  describe('Time Schema', () => {
    it('should create time schema for time data_type', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'time' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Valid time formats should pass
      expect(() => schema.parse('14:30')).not.toThrow();
      expect(() => schema.parse('14:30:45')).not.toThrow();
      expect(() => schema.parse('9:15')).not.toThrow();

      // Invalid time should fail
      expect(() => schema.parse('25:00')).toThrow();
      expect(() => schema.parse('14:60')).toThrow();
    });
  });

  describe('Date Schema', () => {
    it('should create date schema for date/timestamp data_types', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'date' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Valid dates should pass
      expect(() => schema.parse('2023-12-25')).not.toThrow();
      expect(() => schema.parse('2023-12-25T10:30:00Z')).not.toThrow();

      // Invalid date should fail
      expect(() => schema.parse('not-a-date')).toThrow();
    });
  });

  describe('Number Schema', () => {
    it('should create number schema for numeric data_types', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'integer' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Valid numbers should pass
      expect(() => schema.parse(42)).not.toThrow();
      expect(() => schema.parse('42')).not.toThrow(); // string coercion
      expect(() => schema.parse(3.14)).not.toThrow();

      // Invalid number should fail
      expect(() => schema.parse('not-a-number')).toThrow();
    });

    it('should handle different numeric types', () => {
      const numericTypes: PostgresDataType[] = [
        'integer',
        'bigint',
        'smallint',
        'serial',
        'bigserial',
        'float',
        'real',
        'double precision',
        'numeric',
        'decimal',
      ];

      numericTypes.forEach((dataType) => {
        const field = createMockField({
          ui_config: { data_type: dataType },
        });

        const schema = createFieldSchema(field);
        expect(() => schema.parse(123)).not.toThrow();
      });
    });
  });

  describe('JSON Schema', () => {
    it('should create JSON schema for json/jsonb data_types', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'jsonb' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Valid JSON values should pass
      expect(() => schema.parse({ key: 'value' })).not.toThrow();
      expect(() => schema.parse([1, 2, 3])).not.toThrow();
      expect(() => schema.parse('string')).not.toThrow();
      expect(() => schema.parse(null)).not.toThrow();
    });
  });

  describe('Enum Schema', () => {
    it('should create enum schema when is_enum is true', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          is_enum: true,
          enum_values: ['option1', 'option2', 'option3'],
        },
      });

      const schema = createFieldSchema(field);

      // Valid enum values should pass
      expect(() => schema.parse('option1')).not.toThrow();
      expect(() => schema.parse('option2')).not.toThrow();

      // Invalid enum value should fail
      expect(() => schema.parse('invalid-option')).toThrow();
    });
  });

  describe('Address Schema', () => {
    it('should create address schema for ui_data_type address', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          ui_data_type: 'address',
        },
      });

      const schema = createFieldSchema(field);

      // Valid address object should pass
      const validAddress = {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345',
        country: 'USA',
      };
      expect(() => schema.parse(validAddress)).not.toThrow();

      // Partial address should pass (all fields optional)
      expect(() => schema.parse({ city: 'Anytown' })).not.toThrow();
      expect(() => schema.parse({})).not.toThrow();
    });
  });

  describe('File Schema', () => {
    it('should create file schema for file ui_data_types', () => {
      const fileTypes = ['image', 'file', 'audio', 'video'];

      fileTypes.forEach((uiType) => {
        const field = createMockField({
          ui_config: {
            data_type: 'text' as PostgresDataType,
            ui_data_type: uiType,
          },
        });

        const schema = createFieldSchema(field);

        // Should accept string values
        expect(() => schema.parse('file-path.jpg')).not.toThrow();
      });
    });
  });

  describe('Array Schema', () => {
    it('should create array schema for array data_types', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text[]' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Valid array should pass
      expect(() => schema.parse(['item1', 'item2'])).not.toThrow();
      expect(() => schema.parse([])).not.toThrow();

      // Invalid array should fail
      expect(() => schema.parse('not-an-array')).toThrow();
    });

    it('should handle numeric array types', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'integer[]' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Valid numeric array should pass
      expect(() => schema.parse([1, 2, 3])).not.toThrow();
      expect(() => schema.parse(['1', '2', '3'])).not.toThrow(); // string coercion
    });
  });

  describe('String Schema', () => {
    it('should create string schema as fallback', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(() => schema.parse('any string')).not.toThrow();
    });

    it('should enforce max length when specified', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          max_length: 5,
        },
      });

      const schema = createFieldSchema(field);

      expect(() => schema.parse('short')).not.toThrow();
      expect(() => schema.parse('this is too long')).toThrow();
    });

    it('should require non-empty string when field is required', () => {
      const field = createMockField({
        is_required: true,
        ui_config: {
          data_type: 'text' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(() => schema.parse('valid')).not.toThrow();
      expect(() => schema.parse('')).toThrow();
    });
  });

  describe('Default Values', () => {
    it('should handle static string defaults', () => {
      const field = createMockField({
        default_value: "'default_value'",
        ui_config: {
          data_type: 'text' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Empty string should resolve to default
      expect(schema.parse('')).toBe('default_value');
    });

    it('should handle static boolean defaults', () => {
      const field = createMockField({
        default_value: 'true',
        ui_config: {
          data_type: 'boolean' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(schema.parse('')).toBe(true);
    });

    it('should handle static numeric defaults', () => {
      const field = createMockField({
        default_value: '42',
        ui_config: {
          data_type: 'integer' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(schema.parse('')).toBe(42);
    });

    it('should handle static JSON defaults', () => {
      const field = createMockField({
        default_value: '{"key": "value"}',
        ui_config: {
          data_type: 'jsonb' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(schema.parse('')).toEqual({ key: 'value' });
    });

    it('should not apply dynamic defaults client-side', () => {
      const field = createMockField({
        default_value: 'gen_random_uuid()',
        ui_config: {
          data_type: 'uuid' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Should allow undefined for server to handle (field is optional due to dynamic default)
      expect(() => schema.parse(undefined)).not.toThrow();
      expect(schema.parse(undefined)).toBeUndefined();
    });

    it('should not apply sequence defaults client-side', () => {
      const field = createMockField({
        default_value: "nextval('seq_name')",
        ui_config: {
          data_type: 'integer' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Should allow undefined for server to handle (field is optional due to dynamic default)
      expect(() => schema.parse(undefined)).not.toThrow();
      expect(schema.parse(undefined)).toBeUndefined();
    });
  });

  describe('Nullability', () => {
    it('should make field optional when not required', () => {
      const field = createMockField({
        is_required: false,
        ui_config: {
          data_type: 'text' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(() => schema.parse(undefined)).not.toThrow();
      expect(() => schema.parse(null)).not.toThrow();
    });

    it('should make field optional when has dynamic default', () => {
      const field = createMockField({
        is_required: true,
        default_value: 'gen_random_uuid()',
        ui_config: {
          data_type: 'uuid' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Should be optional despite being required due to dynamic default
      expect(() => schema.parse(undefined)).not.toThrow();
    });
  });

  describe('Boolean Coercion', () => {
    it('should coerce string values for boolean fields', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'boolean' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(schema.parse('true')).toBe(true);
      expect(schema.parse('false')).toBe(false);
      expect(schema.parse('on')).toBe(true);
    });
  });

  describe('Number Coercion', () => {
    it('should coerce string values for number fields', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'integer' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      expect(schema.parse('123')).toBe(123);
      expect(schema.parse('3.14')).toBe(3.14);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty ui_config', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
        },
      });

      const schema = createFieldSchema(field);

      // Should default to string schema
      expect(() => schema.parse('any string')).not.toThrow();
    });

    it('should handle missing enum_values for enum type', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          is_enum: true,
          // enum_values is missing
        },
      });

      // Should fall back to string schema since enum_values is required for enum
      const schema = createFieldSchema(field);
      expect(() => schema.parse('any string')).not.toThrow();
    });

    it('should handle case sensitivity in ui_data_type', () => {
      const field = createMockField({
        ui_config: {
          data_type: 'text' as PostgresDataType,
          ui_data_type: 'EMAIL', // uppercase
        },
      });

      const schema = createFieldSchema(field);

      // Should still be treated as email (case insensitive)
      expect(() => schema.parse('test@example.com')).not.toThrow();
      expect(() => schema.parse('invalid-email')).toThrow();
    });
  });
});
