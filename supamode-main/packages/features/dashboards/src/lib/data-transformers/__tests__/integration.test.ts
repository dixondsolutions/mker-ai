import { describe, expect, it } from 'vitest';

import { ChartDataTransformer } from '../../chart-utils/chart-data-transformer';

/**
 * Integration tests to verify the complete data transformation pipeline
 * from PostgreSQL string results to chart-ready numeric data
 */
describe('Numeric Transformation Integration', () => {
  describe('Real-world PostgreSQL response transformation', () => {
    it('should transform the user-provided data example correctly', () => {
      // This is the exact data from the user's problem description
      const postgresResponse = {
        success: true,
        data: {
          data: [
            { time_bucket: '2020-01-01 00:00:00+00', value: '535' },
            { time_bucket: '2020-04-01 00:00:00+00', value: '548' },
            { time_bucket: '2020-07-01 00:00:00+00', value: '583' },
            { time_bucket: '2020-10-01 00:00:00+00', value: '608' },
            { time_bucket: '2021-01-01 00:00:00+00', value: '585' },
            { time_bucket: '2021-04-01 00:00:00+00', value: '632' },
            { time_bucket: '2021-07-01 00:00:00+00', value: '711' },
            { time_bucket: '2021-10-01 00:00:00+00', value: '690' },
            { time_bucket: '2022-01-01 00:00:00+00', value: '671' },
            { time_bucket: '2022-04-01 00:00:00+00', value: '729' },
            { time_bucket: '2022-07-01 00:00:00+00', value: '758' },
            { time_bucket: '2022-10-01 00:00:00+00', value: '817' },
            { time_bucket: '2023-01-01 00:00:00+00', value: '820' },
            { time_bucket: '2023-04-01 00:00:00+00', value: '892' },
            { time_bucket: '2023-07-01 00:00:00+00', value: '923' },
            { time_bucket: '2023-10-01 00:00:00+00', value: '1020' },
            { time_bucket: '2024-01-01 00:00:00+00', value: '1131' },
            { time_bucket: '2024-04-01 00:00:00+00', value: '1178' },
            { time_bucket: '2024-07-01 00:00:00+00', value: '1315' },
            { time_bucket: '2024-10-01 00:00:00+00', value: '1550' },
            { time_bucket: '2025-01-01 00:00:00+00', value: '1896' },
            { time_bucket: '2025-04-01 00:00:00+00', value: '2831' },
            { time_bucket: '2025-07-01 00:00:00+00', value: '3579' },
          ],
          metadata: {
            totalCount: 23,
            pageCount: 1,
            lastUpdated: '2025-08-16T18:17:10.239Z',
          },
        },
      };

      const chartConfig = {
        aggregation: 'COUNT',
        timeAggregation: 'quarter',
        xAxis: 'created_at',
        yAxis: '*',
        chartType: 'line' as const,
      };

      // Transform the data using our new transformer
      const result = ChartDataTransformer.transform(
        postgresResponse.data,
        chartConfig,
      );

      // Verify all values are now numbers, not strings
      result.chartData.forEach((row: Record<string, unknown>) => {
        expect(typeof row.value).toBe('number');
        expect(row.value).toBeGreaterThan(0);
      });

      // Verify specific transformations
      expect(result.chartData[0]).toEqual({
        time_bucket: expect.any(Number), // Converted to timestamp
        value: 535, // Converted from string to number
      });

      expect(result.chartData[22]).toEqual({
        time_bucket: expect.any(Number),
        value: 3579, // Largest value converted correctly
      });

      // Verify the complete dataset
      const expectedValues = [
        535, 548, 583, 608, 585, 632, 711, 690, 671, 729, 758, 817, 820, 892,
        923, 1020, 1131, 1178, 1315, 1550, 1896, 2831, 3579,
      ];

      expectedValues.forEach((expectedValue, index) => {
        expect(result.chartData[index].value).toBe(expectedValue);
      });

      expect(result.seriesKeys).toEqual(['value']);
    });

    it('should handle mixed numeric and string data', () => {
      const mixedData = {
        data: [
          { time_bucket: '2023-01-01 00:00:00+00', value: 100 }, // Already number
          { time_bucket: '2023-02-01 00:00:00+00', value: '200' }, // String
          { time_bucket: '2023-03-01 00:00:00+00', value: 300.5 }, // Float
          { time_bucket: '2023-04-01 00:00:00+00', value: '450.75' }, // String float
        ],
      };

      const result = ChartDataTransformer.transform(mixedData, {
        aggregation: 'SUM',
        timeAggregation: 'month',
        xAxis: 'created_at',
        yAxis: 'amount',
      });

      // All values should be numbers
      expect(
        result.chartData.map((row: Record<string, unknown>) => row.value),
      ).toEqual([100, 200, 300.5, 450.75]);

      // All should be actual number types
      result.chartData.forEach((row: Record<string, unknown>) => {
        expect(typeof row.value).toBe('number');
      });
    });

    it('should handle metric widget data', () => {
      const metricData = {
        data: [
          {
            value: '1550',
            previousValue: '1315',
            trend: 'up',
            trendPercentage: '17.9',
          },
        ],
      };

      const result = ChartDataTransformer.transform(metricData, {
        aggregation: 'COUNT',
        yAxis: '*',
      });

      // Note: ChartDataTransformer focuses on 'value' field for aggregations
      // Other fields like previousValue and trendPercentage should be handled
      // by the MetricWidget's NumericTransformer
      expect(result.chartData[0].value).toBe(1550);
      expect(typeof result.chartData[0].value).toBe('number');

      // Other metric fields are not transformed by ChartDataTransformer
      // This is correct behavior - they're handled by the MetricWidget
      expect(result.chartData[0].trend).toBe('up');
    });

    it('should handle multi-series chart data', () => {
      const multiSeriesData = {
        data: [
          { category: 'A', time_bucket: '2023-Q1', revenue: '1000.50' },
          { category: 'A', time_bucket: '2023-Q2', revenue: '1200.75' },
          { category: 'B', time_bucket: '2023-Q1', revenue: '800.25' },
          { category: 'B', time_bucket: '2023-Q2', revenue: '950.00' },
        ],
      };

      const result = ChartDataTransformer.transform(multiSeriesData, {
        aggregation: 'SUM',
        yAxis: 'revenue',
        groupBy: 'category',
        timeAggregation: 'quarter',
      });

      // Should have pivoted data with numeric values
      expect(result.chartData.length).toBeGreaterThan(0);
      expect(result.seriesKeys).toEqual(['A', 'B']);

      // All revenue values should be numbers
      result.chartData.forEach((row: Record<string, unknown>) => {
        if (row.A !== undefined) expect(typeof row.A).toBe('number');
        if (row.B !== undefined) expect(typeof row.B).toBe('number');
      });
    });

    it('should maintain performance with large datasets', () => {
      // Generate a large dataset
      const largeData = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          time_bucket: `2023-${String((i % 12) + 1).padStart(2, '0')}-01 00:00:00+00`,
          value: String(Math.floor(Math.random() * 10000)),
        })),
      };

      const start = performance.now();

      const result = ChartDataTransformer.transform(largeData, {
        aggregation: 'COUNT',
        timeAggregation: 'month',
        xAxis: 'created_at',
        yAxis: '*',
      });

      const duration = performance.now() - start;

      // Should complete in reasonable time (< 500ms for 10k records)
      expect(duration).toBeLessThan(500);

      // Should have correct number of records
      expect(result.chartData).toHaveLength(10000);

      // All values should be numbers
      result.chartData.forEach((row: Record<string, unknown>) => {
        expect(typeof row.value).toBe('number');
      });
    });

    it('should handle edge cases gracefully', () => {
      const edgeCaseData = {
        data: [
          { value: '0' }, // Zero
          { value: '-100' }, // Negative
          { value: '999999999999' }, // Very large number
          { value: '0.000001' }, // Very small decimal
          { value: '' }, // Empty string (should become 0)
          { value: null }, // Null (should become 0)
        ],
      };

      const result = ChartDataTransformer.transform(edgeCaseData, {
        aggregation: 'COUNT',
        yAxis: '*',
      });

      expect(result.chartData).toEqual([
        { value: 0 },
        { value: -100 },
        { value: 999999999999 },
        { value: 0.000001 },
        { value: 0 }, // Empty string converted to 0
        { value: 0 }, // Null converted to 0
      ]);

      // All should be numbers
      result.chartData.forEach((row: Record<string, unknown>) => {
        expect(typeof row.value).toBe('number');
        expect(Number.isFinite(row.value)).toBe(true);
      });
    });
  });

  describe('Type safety validation', () => {
    it('should ensure chart data is compatible with Recharts', () => {
      const data = {
        data: [
          { time_bucket: '2023-01-01 00:00:00+00', value: '100' },
          { time_bucket: '2023-02-01 00:00:00+00', value: '200' },
        ],
      };

      const result = ChartDataTransformer.transform(data, {
        aggregation: 'COUNT',
        timeAggregation: 'month',
        xAxis: 'created_at',
        yAxis: '*',
      });

      // Simulate what Recharts would do with the data
      result.chartData.forEach((row: Record<string, unknown>) => {
        // Recharts performs mathematical operations on values
        const doubled = row.value * 2;
        const scaled = row.value / 100;
        const compared = row.value > 150;

        expect(typeof doubled).toBe('number');
        expect(typeof scaled).toBe('number');
        expect(typeof compared).toBe('boolean');
      });

      // Verify sorting works correctly (important for line charts)
      const sortedByValue = [...result.chartData].sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          (a.value as number) - (b.value as number),
      );
      expect(sortedByValue[0].value).toBeLessThanOrEqual(
        sortedByValue[1].value,
      );

      // Verify min/max calculations work
      const values = result.chartData.map(
        (row: Record<string, unknown>) => row.value,
      );
      const min = Math.min(...values);
      const max = Math.max(...values);

      expect(typeof min).toBe('number');
      expect(typeof max).toBe('number');
      expect(min).toBeLessThanOrEqual(max);
    });
  });
});
