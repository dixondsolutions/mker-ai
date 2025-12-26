/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';

import {
  buildAggregationExpression,
  calculatePageCount,
  cleanQueryResultData,
  extractTotalCount,
  isTypeWithoutEmptyStrings,
  parseSearchPattern,
  quoteIdentifier,
  validateColumnNames,
} from '../lib/data-processing-utils';

describe('Data Processing Utils - Pure Functions', () => {
  describe('cleanQueryResultData', () => {
    it('should remove total_count from each row', () => {
      const rows = [
        { id: 1, name: 'Alice', email: 'alice@test.com', total_count: 100 },
        { id: 2, name: 'Bob', email: 'bob@test.com', total_count: 100 },
      ];

      const result = cleanQueryResultData(rows);

      expect(result).toEqual([
        { id: 1, name: 'Alice', email: 'alice@test.com' },
        { id: 2, name: 'Bob', email: 'bob@test.com' },
      ]);
    });

    it('should handle rows without total_count', () => {
      const rows = [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ];

      const result = cleanQueryResultData(rows);

      expect(result).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);
    });

    it('should handle empty array', () => {
      const result = cleanQueryResultData([]);
      expect(result).toEqual([]);
    });

    it('should handle null and undefined values', () => {
      const rows = [
        { id: null, name: 'Alice', total_count: 50 },
        { id: 2, name: undefined, total_count: 50 },
      ];

      const result = cleanQueryResultData(rows);

      expect(result).toEqual([
        { id: null, name: 'Alice' },
        { id: 2, name: undefined },
      ]);
    });
  });

  describe('calculatePageCount', () => {
    it('should calculate correct page count for exact division', () => {
      expect(calculatePageCount(100, 10)).toBe(10);
      expect(calculatePageCount(50, 25)).toBe(2);
    });

    it('should round up for partial pages', () => {
      expect(calculatePageCount(101, 10)).toBe(11);
      expect(calculatePageCount(51, 25)).toBe(3);
      expect(calculatePageCount(1, 10)).toBe(1);
    });

    it('should handle zero total count', () => {
      expect(calculatePageCount(0, 10)).toBe(0);
    });

    it('should handle edge case page sizes', () => {
      expect(calculatePageCount(100, 1)).toBe(100);
      expect(calculatePageCount(10, 100)).toBe(1);
    });

    it('should handle zero page size (returns Infinity)', () => {
      expect(calculatePageCount(100, 0)).toBe(Infinity);
    });

    it('should handle negative values', () => {
      expect(calculatePageCount(-10, 5)).toBe(-2);
      expect(calculatePageCount(10, -5)).toBe(-2);
    });
  });

  describe('extractTotalCount', () => {
    it('should extract total_count from first row', () => {
      const rows = [
        { id: 1, name: 'Alice', total_count: 42 },
        { id: 2, name: 'Bob', total_count: 42 },
      ];

      expect(extractTotalCount(rows)).toBe(42);
    });

    it('should return 0 for empty array', () => {
      expect(extractTotalCount([])).toBe(0);
    });

    it('should handle string total_count by converting to number', () => {
      const rows = [{ id: 1, total_count: '123' }];
      expect(extractTotalCount(rows)).toBe(123);
    });

    it('should handle invalid total_count values', () => {
      const rows = [{ id: 1, total_count: 'invalid' }];
      expect(extractTotalCount(rows)).toBeNaN();
    });

    it('should handle missing total_count field', () => {
      const rows = [{ id: 1, name: 'Alice' }];
      expect(extractTotalCount(rows)).toBeNaN();
    });

    it('should handle null total_count', () => {
      const rows = [{ id: 1, total_count: null }];
      expect(extractTotalCount(rows)).toBe(0);
    });
  });

  describe('isTypeWithoutEmptyStrings', () => {
    it('should return true for UUID types', () => {
      expect(isTypeWithoutEmptyStrings('uuid')).toBe(true);
      expect(isTypeWithoutEmptyStrings('UUID')).toBe(true);
      expect(isTypeWithoutEmptyStrings('custom_uuid_type')).toBe(true);
    });

    it('should return true for boolean types', () => {
      expect(isTypeWithoutEmptyStrings('boolean')).toBe(true);
      expect(isTypeWithoutEmptyStrings('bool')).toBe(true);
      expect(isTypeWithoutEmptyStrings('BOOLEAN')).toBe(true);
    });

    it('should return true for JSON types', () => {
      expect(isTypeWithoutEmptyStrings('json')).toBe(true);
      expect(isTypeWithoutEmptyStrings('jsonb')).toBe(true);
      expect(isTypeWithoutEmptyStrings('JSON')).toBe(true);
    });

    it('should return true for numeric types', () => {
      expect(isTypeWithoutEmptyStrings('integer')).toBe(true);
      expect(isTypeWithoutEmptyStrings('bigint')).toBe(true);
      expect(isTypeWithoutEmptyStrings('numeric')).toBe(true);
      expect(isTypeWithoutEmptyStrings('decimal')).toBe(true);
      expect(isTypeWithoutEmptyStrings('float')).toBe(true);
      expect(isTypeWithoutEmptyStrings('real')).toBe(true);
      expect(isTypeWithoutEmptyStrings('double')).toBe(true);
      expect(isTypeWithoutEmptyStrings('BIGINT')).toBe(true);
    });

    it('should return true for date/time types', () => {
      expect(isTypeWithoutEmptyStrings('timestamp')).toBe(true);
      expect(isTypeWithoutEmptyStrings('timestamptz')).toBe(true);
      expect(isTypeWithoutEmptyStrings('date')).toBe(true);
      expect(isTypeWithoutEmptyStrings('time')).toBe(true);
      expect(isTypeWithoutEmptyStrings('timetz')).toBe(true);
      expect(isTypeWithoutEmptyStrings('TIMESTAMP')).toBe(true);
    });

    it('should return false for text types', () => {
      expect(isTypeWithoutEmptyStrings('text')).toBe(false);
      expect(isTypeWithoutEmptyStrings('varchar')).toBe(false);
      expect(isTypeWithoutEmptyStrings('char')).toBe(false);
      expect(isTypeWithoutEmptyStrings('string')).toBe(false);
    });

    it('should handle empty and whitespace inputs', () => {
      expect(isTypeWithoutEmptyStrings('')).toBe(false);
      expect(isTypeWithoutEmptyStrings('   ')).toBe(false);
      expect(isTypeWithoutEmptyStrings('  uuid  ')).toBe(true); // Should trim
    });

    it('should return false for unknown types', () => {
      expect(isTypeWithoutEmptyStrings('unknown_type')).toBe(false);
      expect(isTypeWithoutEmptyStrings('custom')).toBe(false);
    });
  });

  describe('quoteIdentifier', () => {
    it('should quote simple identifiers', () => {
      expect(quoteIdentifier('users')).toBe('"users"');
      expect(quoteIdentifier('user_id')).toBe('"user_id"');
      expect(quoteIdentifier('table123')).toBe('"table123"');
    });

    it('should escape existing double quotes', () => {
      expect(quoteIdentifier('user"name')).toBe('"user""name"');
      expect(quoteIdentifier('"already_quoted"')).toBe('"""already_quoted"""');
    });

    it('should handle empty string', () => {
      expect(quoteIdentifier('')).toBe('""');
    });

    it('should handle special characters', () => {
      expect(quoteIdentifier('user name')).toBe('"user name"');
      expect(quoteIdentifier('user-name')).toBe('"user-name"');
      expect(quoteIdentifier('user.name')).toBe('"user.name"');
    });
  });

  describe('buildAggregationExpression', () => {
    it('should build COUNT expressions', () => {
      expect(buildAggregationExpression('count', 'id')).toBe('COUNT("id")');
      expect(buildAggregationExpression('COUNT', 'user_id')).toBe(
        'COUNT("user_id")',
      );
    });

    it('should build SUM expressions', () => {
      expect(buildAggregationExpression('sum', 'amount')).toBe('SUM("amount")');
      expect(buildAggregationExpression('SUM', 'price')).toBe('SUM("price")');
    });

    it('should build AVG expressions', () => {
      expect(buildAggregationExpression('avg', 'rating')).toBe('AVG("rating")');
      expect(buildAggregationExpression('AVG', 'score')).toBe('AVG("score")');
    });

    it('should build MIN expressions', () => {
      expect(buildAggregationExpression('min', 'date')).toBe('MIN("date")');
      expect(buildAggregationExpression('MIN', 'created_at')).toBe(
        'MIN("created_at")',
      );
    });

    it('should build MAX expressions', () => {
      expect(buildAggregationExpression('max', 'updated_at')).toBe(
        'MAX("updated_at")',
      );
      expect(buildAggregationExpression('MAX', 'last_login')).toBe(
        'MAX("last_login")',
      );
    });

    it('should handle columns with special characters', () => {
      expect(buildAggregationExpression('count', 'user name')).toBe(
        'COUNT("user name")',
      );
      expect(buildAggregationExpression('sum', 'col"umn')).toBe(
        'SUM("col""umn")',
      );
    });

    it('should throw error for unsupported aggregations', () => {
      expect(() => buildAggregationExpression('invalid', 'column')).toThrow(
        'Unsupported aggregation type: invalid',
      );
      expect(() => buildAggregationExpression('median', 'column')).toThrow(
        'Unsupported aggregation type: median',
      );
    });
  });

  describe('parseSearchPattern', () => {
    it('should add wildcards to search terms', () => {
      expect(parseSearchPattern('test')).toBe('%test%');
      expect(parseSearchPattern('user')).toBe('%user%');
      expect(parseSearchPattern('search term')).toBe('%search term%');
    });

    it('should trim whitespace before adding wildcards', () => {
      expect(parseSearchPattern('  test  ')).toBe('%test%');
      expect(parseSearchPattern('\tuser\n')).toBe('%user%');
    });

    it('should return undefined for empty or whitespace-only input', () => {
      expect(parseSearchPattern('')).toBeUndefined();
      expect(parseSearchPattern('   ')).toBeUndefined();
      expect(parseSearchPattern('\t\n')).toBeUndefined();
      expect(parseSearchPattern(undefined)).toBeUndefined();
    });

    it('should handle special characters', () => {
      expect(parseSearchPattern("O'Connor")).toBe("%O'Connor%");
      expect(parseSearchPattern('user@domain.com')).toBe('%user@domain.com%');
      expect(parseSearchPattern('test-case')).toBe('%test-case%');
    });
  });

  describe('validateColumnNames', () => {
    it('should return true for valid column names', () => {
      expect(validateColumnNames(['id', 'name', 'email'])).toBe(true);
      expect(validateColumnNames(['user_id', 'first_name', 'last_name'])).toBe(
        true,
      );
      expect(validateColumnNames(['_private', 'table123', 'Column_Name'])).toBe(
        true,
      );
    });

    it('should return false for empty column names', () => {
      expect(validateColumnNames([''])).toBe(false);
      expect(validateColumnNames(['id', '', 'name'])).toBe(false);
    });

    it('should return false for columns starting with digits', () => {
      expect(validateColumnNames(['123column'])).toBe(false);
      expect(validateColumnNames(['id', '2column', 'name'])).toBe(false);
    });

    it('should return false for columns with special characters', () => {
      expect(validateColumnNames(['user-name'])).toBe(false); // hyphen
      expect(validateColumnNames(['user.name'])).toBe(false); // dot
      expect(validateColumnNames(['user name'])).toBe(false); // space
      expect(validateColumnNames(['user@domain'])).toBe(false); // @ symbol
    });

    it('should return false for columns exceeding length limit', () => {
      const longName = 'a'.repeat(64); // 64 characters > 63 limit
      expect(validateColumnNames([longName])).toBe(false);
    });

    it('should return false for non-string values', () => {
      expect(validateColumnNames([123 as any])).toBe(false);
      expect(validateColumnNames([null as any])).toBe(false);
      expect(validateColumnNames([undefined as any])).toBe(false);
    });

    it('should handle empty array', () => {
      expect(validateColumnNames([])).toBe(true);
    });

    it('should validate exactly at the character limit', () => {
      const maxLengthName = 'a'.repeat(63); // Exactly 63 characters
      expect(validateColumnNames([maxLengthName])).toBe(true);
    });
  });
});
