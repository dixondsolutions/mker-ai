import { describe, expect, it, vi } from 'vitest';

import type { ColumnMetadata } from '@kit/types';

import type { ChartWidgetConfig } from '../../../types';
import { ChartLabelGenerator } from '../chart-labels';

describe('ChartLabelGenerator', () => {
  const mockT = vi.fn((key: string, options?: any) => {
    // Mock translations
    const translations: Record<string, string> = {
      'dashboard:widgets.chart.labels.totalCount': 'Total Count',
      'dashboard:widgets.chart.labels.countOf': `Count of ${options?.column || 'records'}`,
      'dashboard:widgets.chart.labels.count': 'Count',
      'dashboard:widgets.chart.labels.aggregationOf': `${options?.aggregation || 'Aggregation'} of ${options?.column || 'records'}`,
      'dashboard:widgets.chart.labels.value': 'Value',
    };
    return translations[key] || key;
  });

  describe('aggregation field detection and labeling', () => {
    it('should detect value field as aggregation when aggregation is configured', () => {
      const config: ChartWidgetConfig = {
        yAxis: 'comment_count', // Original configured field
        aggregation: 'count',
        chartType: 'bar',
      };

      const label = ChartLabelGenerator.generateLabel('value', config, mockT);

      expect(label).toBe('Count of Comment Count');
      expect(mockT).toHaveBeenCalledWith(
        'dashboard:widgets.chart.labels.countOf',
        {
          column: 'Comment Count',
        },
      );
    });

    it('should handle yAxis="*" with count aggregation', () => {
      const config: ChartWidgetConfig = {
        yAxis: '*',
        aggregation: 'count',
        chartType: 'bar',
      };

      const label = ChartLabelGenerator.generateLabel('value', config, mockT);

      expect(label).toBe('Total Count');
      expect(mockT).toHaveBeenCalledWith(
        'dashboard:widgets.chart.labels.totalCount',
      );
    });

    it('should use column display name when available', () => {
      const config: ChartWidgetConfig = {
        yAxis: 'comment_count',
        chartType: 'bar',
      };

      const columnMetadata: ColumnMetadata[] = [
        {
          name: 'comment_count',
          display_name: 'Number of Comments',
          data_type: 'integer',
          is_nullable: false,
        },
      ];

      const label = ChartLabelGenerator.generateLabel(
        'comment_count',
        config,
        mockT,
        columnMetadata,
      );

      expect(label).toBe('Number of Comments');
    });

    it('should format snake_case to Title Case when no metadata', () => {
      const config: ChartWidgetConfig = {
        yAxis: 'user_registration_count',
        aggregation: 'count',
        chartType: 'bar',
      };

      const label = ChartLabelGenerator.generateLabel('value', config, mockT);

      expect(label).toBe('Count of User Registration Count');
    });

    it('should handle non-aggregation fields', () => {
      const config: ChartWidgetConfig = {
        yAxis: 'revenue',
        chartType: 'bar',
      };

      const label = ChartLabelGenerator.generateLabel('revenue', config, mockT);

      expect(label).toBe('revenue'); // Fallback to raw key
    });
  });

  describe('formatColumnName', () => {
    it('should convert snake_case to Title Case', () => {
      const result = ChartLabelGenerator['formatColumnName']('comment_count');
      expect(result).toBe('Comment Count');
    });

    it('should handle single words', () => {
      const result = ChartLabelGenerator['formatColumnName']('revenue');
      expect(result).toBe('Revenue');
    });

    it('should handle special cases', () => {
      expect(ChartLabelGenerator['formatColumnName']('*')).toBe('all records');
      expect(ChartLabelGenerator['formatColumnName']('')).toBe('records');
    });
  });

  describe('isAggregationField', () => {
    it('should detect value field with aggregation as aggregation field', () => {
      const config: ChartWidgetConfig = {
        yAxis: 'comment_count',
        aggregation: 'count',
        chartType: 'bar',
      };

      const result = ChartLabelGenerator['isAggregationField']('value', config);

      expect(result).toBe(true);
    });

    it('should detect value field with yAxis="*" as aggregation field', () => {
      const config: ChartWidgetConfig = {
        yAxis: '*',
        aggregation: 'count',
        chartType: 'bar',
      };

      const result = ChartLabelGenerator['isAggregationField']('value', config);

      expect(result).toBe(true);
    });

    it('should not detect non-value fields as aggregation', () => {
      const config: ChartWidgetConfig = {
        yAxis: 'comment_count',
        aggregation: 'count',
        chartType: 'bar',
      };

      const result = ChartLabelGenerator['isAggregationField'](
        'comment_count',
        config,
      );

      expect(result).toBe(false);
    });

    it('should not detect value field without aggregation', () => {
      const config: ChartWidgetConfig = {
        yAxis: 'value',
        chartType: 'bar',
      };

      const result = ChartLabelGenerator['isAggregationField']('value', config);

      expect(result).toBe(false);
    });
  });
});
