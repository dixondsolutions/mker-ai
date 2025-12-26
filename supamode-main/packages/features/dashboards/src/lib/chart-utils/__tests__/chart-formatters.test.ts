import { describe, expect, it, vi } from 'vitest';

import type { ChartWidgetConfig } from '../../../types';
import { createChartFormatters } from '../chart-formatters';

describe('createChartFormatters', () => {
  const mockDateFormatter = vi.fn((date: Date, format: string) => {
    // Mock date formatter that returns predictable results based on format
    const formatMap: Record<string, string> = {
      yyyy: '2021',
      "QQQ ''yy": "Q3 '21",
      'MMM yyyy': 'Jul 2021',
      'MMM dd': 'Jul 15',
      "'Week of' MMM dd": 'Week of Jul 15',
      'MMMM yyyy': 'July 2021',
      'QQQQ yyyy': '3rd quarter 2021',
      PPP: 'July 15th, 2021',
      "'Week of' PPP": 'Week of July 15th, 2021',
      PPpp: 'Jul 15, 2021 at 12:00 AM',
      'MMM dd, ha': 'Jul 15, 3PM',
      'PPP pp': 'July 15th, 2021 at 3:00 PM',
    };
    return formatMap[format] || date.toLocaleDateString();
  });

  beforeEach(() => {
    mockDateFormatter.mockClear();
  });

  describe('X-axis date formatting by aggregation level', () => {
    const testDate = new Date('2021-07-15T00:00:00Z');
    const timestamp = testDate.getTime();

    it('should format years appropriately', () => {
      const config: ChartWidgetConfig = {
        timeAggregation: 'year',
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.xAxisTickFormatter?.(timestamp);

      expect(result).toBe('2021');
      expect(mockDateFormatter).toHaveBeenCalledWith(testDate, 'yyyy');
    });

    it('should format quarters appropriately', () => {
      const config: ChartWidgetConfig = {
        timeAggregation: 'quarter',
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.xAxisTickFormatter?.(timestamp);

      expect(result).toBe("Q3 '21");
      expect(mockDateFormatter).toHaveBeenCalledWith(testDate, "QQQ ''yy");
    });

    it('should format months appropriately', () => {
      const config: ChartWidgetConfig = {
        timeAggregation: 'month',
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.xAxisTickFormatter?.(timestamp);

      expect(result).toBe('Jul 2021');
      expect(mockDateFormatter).toHaveBeenCalledWith(testDate, 'MMM yyyy');
    });

    it('should format weeks appropriately', () => {
      const config: ChartWidgetConfig = {
        timeAggregation: 'week',
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.xAxisTickFormatter?.(timestamp);

      expect(result).toBe('Week of Jul 15');
      expect(mockDateFormatter).toHaveBeenCalledWith(
        testDate,
        "'Week of' MMM dd",
      );
    });

    it('should format hours appropriately', () => {
      const config: ChartWidgetConfig = {
        timeAggregation: 'hour',
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.xAxisTickFormatter?.(timestamp);

      expect(result).toBe('Jul 15, 3PM');
      expect(mockDateFormatter).toHaveBeenCalledWith(testDate, 'MMM dd, ha');
    });

    it('should default to day format when no aggregation specified', () => {
      const config: ChartWidgetConfig = {
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.xAxisTickFormatter?.(timestamp);

      expect(result).toBe('Jul 15');
      expect(mockDateFormatter).toHaveBeenCalledWith(testDate, 'MMM dd');
    });
  });

  describe('Tooltip date formatting by aggregation level', () => {
    const testDate = new Date('2021-07-15T00:00:00Z');
    const timestamp = testDate.getTime();

    it('should format year tooltips appropriately', () => {
      const config: ChartWidgetConfig = {
        timeAggregation: 'year',
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.tooltipLabelFormatter?.(timestamp);

      expect(result).toBe('2021');
      expect(mockDateFormatter).toHaveBeenCalledWith(testDate, 'yyyy');
    });

    it('should format quarter tooltips appropriately', () => {
      const config: ChartWidgetConfig = {
        timeAggregation: 'quarter',
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.tooltipLabelFormatter?.(timestamp);

      expect(result).toBe('3rd quarter 2021');
      expect(mockDateFormatter).toHaveBeenCalledWith(testDate, 'QQQQ yyyy');
    });

    it('should format month tooltips appropriately', () => {
      const config: ChartWidgetConfig = {
        timeAggregation: 'month',
        chartType: 'bar',
      };

      const formatters = createChartFormatters(config, mockDateFormatter, true);
      const result = formatters.tooltipLabelFormatter?.(timestamp);

      expect(result).toBe('July 2021');
      expect(mockDateFormatter).toHaveBeenCalledWith(testDate, 'MMMM yyyy');
    });
  });

  describe('Non-time series formatting', () => {
    it('should not create time formatters for non-time series charts', () => {
      const config: ChartWidgetConfig = {
        chartType: 'bar',
      };

      const formatters = createChartFormatters(
        config,
        mockDateFormatter,
        false,
      );

      expect(formatters.xAxisTickFormatter).toBeUndefined();
      expect(formatters.tooltipLabelFormatter).toBeUndefined();
      expect(formatters.yAxisFormatter).toBeDefined();
    });
  });

  describe('Y-axis formatting', () => {
    it('should create numeric formatter for Y-axis', () => {
      const config: ChartWidgetConfig = {
        chartType: 'bar',
      };

      const formatters = createChartFormatters(
        config,
        mockDateFormatter,
        false,
      );

      // Test that it returns a function
      expect(typeof formatters.yAxisFormatter).toBe('function');
    });
  });
});
