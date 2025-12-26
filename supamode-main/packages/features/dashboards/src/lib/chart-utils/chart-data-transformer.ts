import type { ChartWidgetConfig, WidgetData } from '../../types';
import { NumericTransformer } from '../data-transformers/numeric-transformer';

interface ChartDataResult {
  chartData: unknown[];
  seriesKeys: string[];
  originalConfig?: ChartWidgetConfig;
}

interface FieldMapping {
  fieldName: string;
  isAggregation: boolean;
}

/**
 * Transforms raw widget data into chart-ready format
 * Makes explicit all the implicit data transformations that occur
 */
export class ChartDataTransformer {
  /**
   * Main entry point for transforming widget data into chart data
   */
  static transform(
    data: WidgetData | undefined,
    config: ChartWidgetConfig,
  ): ChartDataResult {
    if (!data?.['data'] || !Array.isArray(data['data'])) {
      return { chartData: [], seriesKeys: [], originalConfig: config };
    }

    const rawData = data['data'];
    const xAxisFieldName = this.determineXAxisField(config);

    const numericTransformResult = NumericTransformer.transformChartData(
      rawData as Record<string, unknown>[],
      config,
    );

    const numericData = numericTransformResult.data;

    // Step 2: Convert timestamps to numbers for proper chart rendering
    const timestampProcessedData = xAxisFieldName
      ? this.convertTimestampsToNumbers(numericData, xAxisFieldName)
      : numericData;

    // Step 3: Handle multi-series vs single-series data
    if (this.isMultiSeriesChart(config)) {
      return this.transformMultiSeriesData(timestampProcessedData, config);
    }

    return this.transformSingleSeriesData(timestampProcessedData, config);
  }

  /**
   * Determines the actual X-axis field name based on configuration
   * Makes explicit that time aggregation changes the field to 'time_bucket'
   */
  static determineXAxisField(config: ChartWidgetConfig): string | undefined {
    if (config.timeAggregation && config.xAxis) {
      return 'time_bucket'; // Backend returns this field name for time aggregations
    }

    return config.xAxis;
  }

  /**
   * Determines the actual Y-axis field name from the data
   * Makes explicit the mapping from config.yAxis='*' to backend's 'value' field
   */
  static determineYAxisField(
    config: ChartWidgetConfig,
    data: Record<string, unknown>[],
  ): FieldMapping {
    const configuredYAxis = config.yAxis || 'y';

    // Check if the configured field exists in the data
    if (data.length > 0 && data[0] && configuredYAxis in data[0]) {
      return { fieldName: configuredYAxis, isAggregation: false };
    }

    // Special case: When yAxis='*' with aggregation, backend returns 'value'
    if (
      configuredYAxis === '*' &&
      data.length > 0 &&
      data[0] &&
      'value' in data[0]
    ) {
      return {
        fieldName: 'value',
        isAggregation: true, // This is an aggregated value
      };
    }

    // Fallback: If configured field doesn't exist but 'value' does (common for aggregations)
    if (data.length > 0 && data[0] && 'value' in data[0]) {
      return {
        fieldName: 'value',
        isAggregation: true, // Backend aggregation result
      };
    }

    // Final fallback to configured value
    return { fieldName: configuredYAxis, isAggregation: false };
  }

  /**
   * Converts timestamp strings to numbers for proper time-series rendering
   * Makes explicit the timestamp detection and conversion logic
   */
  static convertTimestampsToNumbers(
    data: unknown[],
    xAxisField: string,
  ): unknown[] {
    return data.map((row: unknown) => {
      if (typeof row !== 'object' || row === null) {
        return row;
      }

      const record = row as Record<string, unknown>;
      const processedRow = { ...record };

      // Only process if the field exists and is a string
      if (!(xAxisField in record) || typeof record[xAxisField] !== 'string') {
        return processedRow;
      }

      const value = record[xAxisField] as string;

      // Check if it looks like a timestamp (ISO format or PostgreSQL timestamp)
      if (this.isTimestampString(value)) {
        const timestamp = new Date(value).getTime();

        if (!isNaN(timestamp)) {
          processedRow[xAxisField] = timestamp;
        }
      }

      return processedRow;
    });
  }

  /**
   * Checks if a string value appears to be a timestamp
   */
  private static isTimestampString(value: string): boolean {
    // Matches ISO format or PostgreSQL timestamp format
    return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}/.test(value);
  }

  /**
   * Determines if this is a multi-series chart based on configuration
   */
  private static isMultiSeriesChart(config: ChartWidgetConfig): boolean {
    return Boolean(config.groupBy);
  }

  /**
   * Transforms data for single-series charts
   * Makes explicit the field mapping for aggregations
   */
  private static transformSingleSeriesData(
    data: unknown[],
    config: ChartWidgetConfig,
  ): ChartDataResult {
    const typedData = data as Record<string, unknown>[];
    const fieldMapping = this.determineYAxisField(config, typedData);

    return {
      chartData: data,
      seriesKeys: [fieldMapping.fieldName],
      originalConfig: config,
    };
  }

  /**
   * Transforms data for multi-series charts by pivoting grouped data
   * Makes explicit the pivot transformation from backend format to chart format
   */
  private static transformMultiSeriesData(
    data: unknown[],
    config: ChartWidgetConfig,
  ): ChartDataResult {
    const xAxisKey = config.timeAggregation ? 'time_bucket' : config.xAxis;
    const yAxisKey = config.yAxis || 'value'; // Default to 'value' for aggregated data

    if (!config.groupBy || !xAxisKey || !yAxisKey) {
      return { chartData: data, seriesKeys: [yAxisKey] };
    }

    const groupColumns = [config.groupBy];
    const maxSeries = 10; // Default limit to prevent performance issues

    // Build pivot table with performance optimizations
    const pivotResult = this.pivotMultiSeriesData(
      data,
      xAxisKey,
      yAxisKey,
      groupColumns,
      maxSeries,
    );

    return {
      chartData: Array.from(pivotResult.pivotData.values()),
      seriesKeys: pivotResult.seriesKeys,
      originalConfig: config,
    };
  }

  /**
   * Pivots multi-series data from backend format to chart format
   * Backend sends: [{ xAxis, groupCol1, groupCol2, yAxis }, ...]
   * We need: [{ xAxis, series1: value, series2: value, ... }, ...]
   */
  private static pivotMultiSeriesData(
    data: unknown[],
    xAxisKey: string,
    yAxisKey: string,
    groupColumns: string[],
    maxSeries: number,
  ) {
    const pivotData = new Map<string, Record<string, unknown>>();
    const seriesKeys = new Set<string>();

    // First pass: count series frequency to limit to top N
    const seriesCounter = this.countSeriesFrequency(data, groupColumns);
    const allowedSeries = this.selectTopSeries(seriesCounter, maxSeries);

    // Second pass: build pivot data
    for (const row of data) {
      if (typeof row !== 'object' || row === null) continue;

      const record = row as Record<string, unknown>;
      const xValue = record[xAxisKey];
      const yValue = record[yAxisKey];

      if (xValue == null || yValue == null) continue;

      // Create series key from grouping columns
      const seriesKey = this.createSeriesKey(record, groupColumns);

      // Skip series that didn't make the cut
      if (!allowedSeries.has(seriesKey)) continue;

      seriesKeys.add(seriesKey);

      // Get or create pivot row
      const pivotKey = String(xValue);
      if (!pivotData.has(pivotKey)) {
        pivotData.set(pivotKey, { [xAxisKey]: xValue });
      }

      const pivotRow = pivotData.get(pivotKey)!;

      // Handle duplicate values by summing them
      this.aggregatePivotValue(pivotRow, seriesKey, yValue);
    }

    // Fill missing values with 0 for consistent chart rendering
    const finalSeriesKeys = Array.from(seriesKeys);
    this.fillMissingValues(pivotData, finalSeriesKeys);

    return { pivotData, seriesKeys: finalSeriesKeys };
  }

  /**
   * Counts how frequently each series appears in the data
   */
  private static countSeriesFrequency(
    data: unknown[],
    groupColumns: string[],
  ): Map<string, number> {
    const counter = new Map<string, number>();

    for (const row of data) {
      if (typeof row !== 'object' || row === null) continue;

      const record = row as Record<string, unknown>;
      const seriesKey = this.createSeriesKey(record, groupColumns);

      counter.set(seriesKey, (counter.get(seriesKey) || 0) + 1);
    }

    return counter;
  }

  /**
   * Selects the top N series by frequency to avoid performance issues
   */
  private static selectTopSeries(
    seriesCounter: Map<string, number>,
    maxSeries: number,
  ): Set<string> {
    const topSeries = Array.from(seriesCounter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxSeries)
      .map(([key]) => key);

    return new Set(topSeries);
  }

  /**
   * Creates a series key from grouping column values
   * Handles null values gracefully by replacing with '(empty)'
   */
  private static createSeriesKey(
    record: Record<string, unknown>,
    groupColumns: string[],
  ): string {
    return groupColumns
      .map((col) => {
        const value = record[col];
        return value != null ? String(value) : '(empty)';
      })
      .join(' | ');
  }

  /**
   * Aggregates values in pivot table (sums numeric duplicates)
   */
  private static aggregatePivotValue(
    pivotRow: Record<string, unknown>,
    seriesKey: string,
    newValue: unknown,
  ): void {
    const currentValue = pivotRow[seriesKey];

    if (typeof currentValue === 'number' && typeof newValue === 'number') {
      pivotRow[seriesKey] = currentValue + newValue;
    } else {
      pivotRow[seriesKey] = newValue;
    }
  }

  /**
   * Fills missing series values with 0 for consistent rendering
   */
  private static fillMissingValues(
    pivotData: Map<string, Record<string, unknown>>,
    seriesKeys: string[],
  ): void {
    for (const row of pivotData.values()) {
      for (const seriesKey of seriesKeys) {
        if (!(seriesKey in row)) {
          row[seriesKey] = 0;
        }
      }
    }
  }
}
