import { describe, expect, it } from 'vitest';

// Test utility to simulate chart widget logic
function detectTimeSeriesMode(
  config: Record<string, unknown>,
  chartData: Record<string, unknown>[],
) {
  // This mirrors the logic from chart-widget.tsx

  // Determine x-axis key
  const xAxisKey = (() => {
    if (config?.timeAggregation && config.xAxis) {
      return 'time_bucket';
    }

    if (
      chartData.length > 0 &&
      'time_bucket' in (chartData[0] as Record<string, unknown>)
    ) {
      return 'time_bucket';
    }

    return config?.xAxis || 'x';
  })();

  // Detect time series
  const firstRow =
    chartData.length > 0 ? (chartData[0] as Record<string, unknown>) : null;
  const xAxisValue = firstRow?.[xAxisKey];
  const isTimeSeries =
    Boolean(config?.timeAggregation) ||
    xAxisKey === 'time_bucket' ||
    (typeof xAxisValue === 'number' && xAxisValue > 946684800000);

  return { xAxisKey, isTimeSeries };
}

describe('Chart Time Series Detection', () => {
  it('should detect time series when timeAggregation is configured', () => {
    const config = {
      chartType: 'bar',
      xAxis: 'created_at',
      yAxis: 'value',
      timeAggregation: 'day',
    };

    const chartData = [
      { time_bucket: '2025-07-28 00:00:00+00', value: 1719 },
      { time_bucket: '2025-08-04 00:00:00+00', value: 1614 },
    ];

    const result = detectTimeSeriesMode(config, chartData);

    expect(result.xAxisKey).toBe('time_bucket');
    expect(result.isTimeSeries).toBe(true);
  });

  it('should auto-detect time series when data contains time_bucket (fix for reported issue)', () => {
    const config = {
      chartType: 'bar',
      xAxis: 'created_at',
      yAxis: 'value',
      // NOTE: timeAggregation NOT set - this was the bug
    };

    const chartData = [
      { time_bucket: '2025-07-28 00:00:00+00', value: 1719 },
      { time_bucket: '2025-08-04 00:00:00+00', value: 1614 },
    ];

    const result = detectTimeSeriesMode(config, chartData);

    expect(result.xAxisKey).toBe('time_bucket');
    expect(result.isTimeSeries).toBe(true);
  });

  it('should detect time series with timestamp numbers', () => {
    const config = {
      chartType: 'line',
      xAxis: 'created_at',
      yAxis: 'value',
    };

    const chartData = [
      { created_at: 1690502400000, value: 1719 }, // Timestamp number
      { created_at: 1691107200000, value: 1614 },
    ];

    const result = detectTimeSeriesMode(config, chartData);

    expect(result.xAxisKey).toBe('created_at');
    expect(result.isTimeSeries).toBe(true);
  });

  it('should not detect time series for categorical data', () => {
    const config = {
      chartType: 'bar',
      xAxis: 'category',
      yAxis: 'value',
    };

    const chartData = [
      { category: 'A', value: 100 },
      { category: 'B', value: 200 },
    ];

    const result = detectTimeSeriesMode(config, chartData);

    expect(result.xAxisKey).toBe('category');
    expect(result.isTimeSeries).toBe(false);
  });

  it('should handle empty data gracefully', () => {
    const config = {
      chartType: 'bar',
      xAxis: 'created_at',
      yAxis: 'value',
    };

    const chartData: Record<string, unknown>[] = [];

    const result = detectTimeSeriesMode(config, chartData);

    expect(result.xAxisKey).toBe('created_at');
    expect(result.isTimeSeries).toBe(false);
  });
});
