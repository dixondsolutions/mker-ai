import { describe, expect, it, vi } from 'vitest';

import { NumericTransformer } from '../numeric-transformer';

describe('NumericTransformer', () => {
  describe('transformWidgetData', () => {
    it('should transform string aggregations to numbers', () => {
      const input = [
        { time_bucket: '2023-01-01', value: '535' },
        { time_bucket: '2023-02-01', value: '1234' },
        { time_bucket: '2023-03-01', value: '0' },
      ];

      const result = NumericTransformer.transformWidgetData(input);

      expect(result.data).toEqual([
        { time_bucket: '2023-01-01', value: 535 },
        { time_bucket: '2023-02-01', value: 1234 },
        { time_bucket: '2023-03-01', value: 0 },
      ]);

      expect(result.stats.stringToNumberConversions).toBe(3);
      expect(result.stats.totalRecords).toBe(3);
      expect(result.stats.transformedFields).toBe(3);
    });

    it('should preserve existing numbers without transformation', () => {
      const input = [
        { time_bucket: '2023-01-01', value: 535 },
        { time_bucket: '2023-02-01', value: 1234.5 },
      ];

      const result = NumericTransformer.transformWidgetData(input);

      expect(result.data).toEqual(input);
      expect(result.stats.stringToNumberConversions).toBe(0);
      expect(result.stats.transformedFields).toBe(0);
    });

    it('should handle mixed data types correctly', () => {
      const input = [
        { category: 'A', value: '100', count: 50 },
        { category: 'B', value: 200, count: '75' },
        { category: 'C', value: '300.5', count: 0 },
      ];

      const result = NumericTransformer.transformWidgetData(input, {
        numericFields: ['value', 'count'],
      });

      expect(result.data).toEqual([
        { category: 'A', value: 100, count: 50 },
        { category: 'B', value: 200, count: 75 },
        { category: 'C', value: 300.5, count: 0 },
      ]);

      expect(result.stats.stringToNumberConversions).toBe(3);
    });

    it('should handle invalid string values with default fallback', () => {
      const input = [
        { value: 'not-a-number' },
        { value: '' },
        { value: 'abc123' },
        { value: '123abc' }, // parseFloat would return 123, but our validation catches this
      ];

      const result = NumericTransformer.transformWidgetData(input, {
        defaultValue: -1,
      });

      expect(result.data).toEqual([
        { value: -1 },
        { value: -1 },
        { value: -1 },
        { value: -1 },
      ]);

      expect(result.stats.invalidConversions).toBe(4);
      expect(result.warnings).toHaveLength(4);
    });

    it('should handle null and undefined values', () => {
      const input = [
        { value: null },
        { value: undefined },
        { other: 'data' }, // missing value field
      ];

      const result = NumericTransformer.transformWidgetData(input);

      expect(result.data).toEqual([
        { value: 0 },
        { value: 0 },
        { other: 'data' }, // unchanged
      ]);

      expect(result.stats.invalidConversions).toBe(2);
    });

    it('should handle edge cases in numeric parsing', () => {
      const input = [
        { value: '1,234.56' }, // thousands separator
        { value: '$100.50' }, // currency symbol (this will fail strict validation)
        { value: '42.0' }, // trailing zero
        { value: '  123  ' }, // whitespace
        { value: '0.00' },
        { value: '-456.78' }, // negative
      ];

      const result = NumericTransformer.transformWidgetData(input);

      expect(result.data).toEqual([
        { value: 1234.56 },
        { value: 0 }, // Currency symbol fails strict validation
        { value: 42 },
        { value: 123 },
        { value: 0 },
        { value: -456.78 },
      ]);

      expect(result.stats.stringToNumberConversions).toBe(6);
      expect(result.stats.invalidConversions).toBe(1); // Currency symbol
    });

    it('should handle non-finite numbers', () => {
      const input = [{ value: Infinity }, { value: -Infinity }, { value: NaN }];

      const result = NumericTransformer.transformWidgetData(input, {
        defaultValue: 999,
      });

      expect(result.data).toEqual([
        { value: 999 },
        { value: 999 },
        { value: 999 },
      ]);

      expect(result.stats.invalidConversions).toBe(3);
    });

    it('should preserve raw values when requested', () => {
      const input = [
        { value: '123.45' },
        { value: 678.9 }, // already number, no raw preservation
      ];

      const result = NumericTransformer.transformWidgetData(input, {
        preserveRaw: true,
      });

      expect(result.data).toEqual([
        { value: 123.45, __raw_value: '123.45' },
        { value: 678.9 },
      ]);
    });

    it('should handle invalid record types gracefully', () => {
      const input = [
        { value: '100' }, // valid
        null, // invalid
        'string', // invalid
        [], // invalid
        { value: '200' }, // valid
      ] as any;

      const result = NumericTransformer.transformWidgetData(input);

      expect(result.data).toEqual([
        { value: 100 },
        null,
        'string',
        [],
        { value: 200 },
      ]);

      expect(result.stats.skippedRecords).toBe(3);
      expect(result.stats.stringToNumberConversions).toBe(2);
    });

    it('should respect custom numeric fields configuration', () => {
      const input = [
        {
          name: 'Product A',
          price: '99.99',
          quantity: '5',
          description: 'A great product',
        },
      ];

      const result = NumericTransformer.transformWidgetData(input, {
        numericFields: ['price', 'quantity'],
      });

      expect(result.data).toEqual([
        {
          name: 'Product A',
          price: 99.99,
          quantity: 5,
          description: 'A great product',
        },
      ]);

      expect(result.stats.stringToNumberConversions).toBe(2);
    });

    it('should control warning logging', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation();

      const input = [{ value: 'invalid' }];

      // With warnings enabled (default)
      NumericTransformer.transformWidgetData(input, {
        logWarnings: true,
      });
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockClear();

      // With warnings disabled
      NumericTransformer.transformWidgetData(input, {
        logWarnings: false,
      });
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('transformChartData', () => {
    it('should determine appropriate numeric fields for chart config', () => {
      const input = [{ time_bucket: '2023-01-01', value: '100', count: '50' }];

      const result = NumericTransformer.transformChartData(input, {
        aggregation: 'COUNT',
        yAxis: '*',
      });

      expect(result.data[0]).toEqual({
        time_bucket: '2023-01-01',
        value: 100,
        count: 50,
      });
    });

    it('should use chart-optimized settings', () => {
      const input = [{ value: 'invalid-number' }];

      const result = NumericTransformer.transformChartData(input, {
        aggregation: 'SUM',
      });

      // Chart transformer uses 0 as default, no raw preservation
      expect(result.data[0]).toEqual({ value: 0 });
      expect(result.data[0]).not.toHaveProperty('__raw_value');
    });
  });

  describe('getAggregationFields', () => {
    it('should identify standard aggregation patterns', () => {
      const fields = NumericTransformer.getAggregationFields({
        aggregation: 'COUNT',
        yAxis: '*',
      });

      expect(fields).toContain('value');
      expect(fields).toContain('count');
      expect(fields).toContain('sum');
    });

    it('should include specific yAxis columns', () => {
      const fields = NumericTransformer.getAggregationFields({
        aggregation: 'AVG',
        yAxis: 'revenue',
      });

      expect(fields).toContain('value');
      expect(fields).toContain('revenue');
    });

    it('should remove duplicates', () => {
      const fields = NumericTransformer.getAggregationFields({
        aggregation: 'COUNT',
        yAxis: 'count', // Duplicate with common fields
      });

      const uniqueFields = [...new Set(fields)];
      expect(fields).toEqual(uniqueFields);
    });
  });

  describe('validateTransformation', () => {
    it('should validate successful transformations', () => {
      const result = {
        data: [{ value: 100 }],
        stats: {
          totalRecords: 1,
          transformedFields: 1,
          stringToNumberConversions: 1,
          invalidConversions: 0,
          skippedRecords: 0,
        },
        warnings: [],
      };

      const validation = NumericTransformer.validateTransformation(result);

      expect(validation.isValid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect validation issues', () => {
      const result = {
        data: [],
        stats: {
          totalRecords: 100,
          transformedFields: 5, // Only 5 fields transformed out of 100 records
          stringToNumberConversions: 0,
          invalidConversions: 3,
          skippedRecords: 2,
        },
        warnings: ['Warning 1', 'Warning 2'],
      };

      const validation = NumericTransformer.validateTransformation(result);

      expect(validation.isValid).toBe(false);
      expect(validation.issues).toContain('3 invalid numeric conversions');
      expect(validation.issues).toContain('2 records skipped');
      expect(validation.issues).toContain('Low transformation rate: 5.0%');
    });
  });

  describe('edge cases and performance', () => {
    it('should handle empty data sets', () => {
      const result = NumericTransformer.transformWidgetData([]);

      expect(result.data).toEqual([]);
      expect(result.stats.totalRecords).toBe(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should handle large data sets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: String(i * 10),
        amount: i * 1.5,
      }));

      const start = performance.now();
      const result = NumericTransformer.transformWidgetData(largeDataset, {
        numericFields: ['value', 'amount'],
        logWarnings: false,
      });
      const duration = performance.now() - start;

      expect(result.data).toHaveLength(1000);
      expect(result.stats.stringToNumberConversions).toBe(1000);
      expect(duration).toBeLessThan(100); // Should complete in < 100ms
    });

    it('should handle deeply nested or complex objects', () => {
      const input = [
        {
          metadata: { nested: 'data' },
          value: '123',
          complex: { array: [1, 2, 3] },
        },
      ];

      const result = NumericTransformer.transformWidgetData(input);

      expect(result.data[0]).toEqual({
        metadata: { nested: 'data' },
        value: 123,
        complex: { array: [1, 2, 3] },
      });
    });
  });

  describe('real-world scenarios', () => {
    it('should handle PostgreSQL aggregation response format', () => {
      // Simulate actual PostgreSQL JSON response
      const postgresResponse = [
        { time_bucket: '2020-01-01 00:00:00+00', value: '535' },
        { time_bucket: '2020-04-01 00:00:00+00', value: '548' },
        { time_bucket: '2020-07-01 00:00:00+00', value: '583' },
      ];

      const result = NumericTransformer.transformChartData(postgresResponse, {
        aggregation: 'COUNT',
        timeAggregation: 'quarter',
        xAxis: 'created_at',
        yAxis: '*',
      });

      expect(result.data).toEqual([
        { time_bucket: '2020-01-01 00:00:00+00', value: 535 },
        { time_bucket: '2020-04-01 00:00:00+00', value: 548 },
        { time_bucket: '2020-07-01 00:00:00+00', value: 583 },
      ]);

      expect(result.stats.stringToNumberConversions).toBe(3);
      expect(result.stats.invalidConversions).toBe(0);
    });

    it('should handle metric widget with trend data', () => {
      const metricData = [
        {
          value: '1550',
          previousValue: '1315',
          trend: 'up',
          trendPercentage: '17.9',
        },
      ];

      const result = NumericTransformer.transformWidgetData(metricData, {
        numericFields: ['value', 'previousValue', 'trendPercentage'],
      });

      expect(result.data[0]).toEqual({
        value: 1550,
        previousValue: 1315,
        trend: 'up',
        trendPercentage: 17.9,
      });
    });

    it('should handle multi-series chart data', () => {
      const multiSeriesData = [
        { category: 'A', quarter: 'Q1', revenue: '1000.50' },
        { category: 'A', quarter: 'Q2', revenue: '1200.75' },
        { category: 'B', quarter: 'Q1', revenue: '800.25' },
        { category: 'B', quarter: 'Q2', revenue: '950.00' },
      ];

      const result = NumericTransformer.transformChartData(multiSeriesData, {
        aggregation: 'SUM',
        yAxis: 'revenue',
        groupBy: 'category',
      });

      expect(result.data.every((row) => typeof row.revenue === 'number')).toBe(
        true,
      );
      expect(result.stats.stringToNumberConversions).toBe(4);
    });
  });
});
