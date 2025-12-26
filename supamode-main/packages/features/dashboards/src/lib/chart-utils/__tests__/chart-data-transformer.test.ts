import { describe, expect, it } from 'vitest';

import type { ChartWidgetConfig, WidgetData } from '../../../types';
import { ChartDataTransformer } from '../chart-data-transformer';

describe('ChartDataTransformer', () => {
  describe('field mapping for aggregations', () => {
    it('should map configured yAxis to value field when aggregation exists', () => {
      const mockData: WidgetData = {
        data: [
          { time_bucket: 1629676800000, value: 15 },
          { time_bucket: 1630281600000, value: 31 },
          { time_bucket: 1630886400000, value: 25 },
        ],
      };

      const config: ChartWidgetConfig = {
        yAxis: 'comment_count', // Configured field that doesn't exist in data
        aggregation: 'count', // Has aggregation
        chartType: 'bar',
      };

      const result = ChartDataTransformer.transform(mockData, config);

      expect(result.seriesKeys).toEqual(['value']); // Should map to actual field
      expect(result.chartData).toEqual(mockData.data);
      expect(result.originalConfig).toEqual(config); // Should preserve original config
    });

    it('should use configured yAxis when field exists in data', () => {
      const mockData: WidgetData = {
        data: [
          { time_bucket: 1629676800000, comment_count: 15 },
          { time_bucket: 1630281600000, comment_count: 31 },
        ],
      };

      const config: ChartWidgetConfig = {
        yAxis: 'comment_count', // Field exists in data
        aggregation: 'count',
        chartType: 'bar',
      };

      const result = ChartDataTransformer.transform(mockData, config);

      expect(result.seriesKeys).toEqual(['comment_count']); // Should use configured field
    });

    it('should handle yAxis="*" with aggregation', () => {
      const mockData: WidgetData = {
        data: [
          { time_bucket: 1629676800000, value: 15 },
          { time_bucket: 1630281600000, value: 31 },
        ],
      };

      const config: ChartWidgetConfig = {
        yAxis: '*', // Wildcard aggregation
        aggregation: 'count',
        chartType: 'bar',
      };

      const result = ChartDataTransformer.transform(mockData, config);

      expect(result.seriesKeys).toEqual(['value']);
    });
  });

  describe('determineYAxisField', () => {
    it('should fallback to value field when configured field missing', () => {
      const data = [{ time_bucket: 123, value: 42 }];
      const config: ChartWidgetConfig = {
        yAxis: 'missing_field',
        aggregation: 'count',
        chartType: 'bar',
      };

      const result = ChartDataTransformer['determineYAxisField'](config, data);

      expect(result.fieldName).toBe('value');
      expect(result.isAggregation).toBe(true);
    });

    it('should use configured field when it exists', () => {
      const data = [{ time_bucket: 123, existing_field: 42 }];
      const config: ChartWidgetConfig = {
        yAxis: 'existing_field',
        chartType: 'bar',
      };

      const result = ChartDataTransformer['determineYAxisField'](config, data);

      expect(result.fieldName).toBe('existing_field');
      expect(result.isAggregation).toBe(false);
    });
  });

  describe('timestamp conversion', () => {
    it('should convert timestamp strings to numbers', () => {
      const data = [
        { time_bucket: '2021-08-23T00:00:00Z', value: 15 },
        { time_bucket: '2021-08-30T00:00:00Z', value: 31 },
      ];

      const result = ChartDataTransformer['convertTimestampsToNumbers'](
        data,
        'time_bucket',
      );

      expect(result).toEqual([
        { time_bucket: 1629676800000, value: 15 },
        { time_bucket: 1630281600000, value: 31 },
      ]);
    });

    it('should leave numeric timestamps unchanged', () => {
      const data = [
        { time_bucket: 1629676800000, value: 15 },
        { time_bucket: 1630281600000, value: 31 },
      ];

      const result = ChartDataTransformer['convertTimestampsToNumbers'](
        data,
        'time_bucket',
      );

      expect(result).toEqual(data); // Should be unchanged
    });
  });
});
