import type { ColumnMetadata } from '@kit/types';
import type { ChartConfig } from '@kit/ui/chart';

import type { ChartWidgetConfig } from '../../types';
import { ChartLabelGenerator } from './chart-labels';

type TranslationFunction = (
  key: string,
  options?: { [key: string]: unknown },
) => string;

const DEFAULT_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
  'var(--chart-9)',
  'var(--chart-10)',
  'var(--chart-11)',
  'var(--chart-12)',
];

/**
 * Builds chart configuration including labels and colors
 * Centralizes the logic for creating Recharts configuration
 */
export class ChartConfigBuilder {
  /**
   * Builds the complete chart configuration
   */
  static build(
    config: ChartWidgetConfig,
    seriesKeys: string[],
    t: TranslationFunction,
    columnMetadata?: ColumnMetadata[],
  ): ChartConfig {
    // Handle empty series case
    if (seriesKeys.length === 0) {
      return this.buildFallbackConfig(config, t, columnMetadata);
    }

    // Generate labels for all series
    const labels = ChartLabelGenerator.generateLabels(
      config,
      seriesKeys,
      t,
      columnMetadata,
    );

    // Determine colors for all series
    const colors = this.determineSeriesColors(config, seriesKeys);

    // Build the configuration object
    const chartConfig: ChartConfig = {};

    for (let i = 0; i < seriesKeys.length; i++) {
      const key = seriesKeys[i];
      if (key) {
        chartConfig[key] = {
          label: labels[key] || key,
          color: colors[i] || 'var(--chart-1)',
        };
      }
    }

    return chartConfig;
  }

  /**
   * Builds a fallback configuration when no series keys are available
   */
  private static buildFallbackConfig(
    config: ChartWidgetConfig,
    t: TranslationFunction,
    columnMetadata?: ColumnMetadata[],
  ): ChartConfig {
    const fallbackKey = config.yAxis || 'value';
    const label = ChartLabelGenerator.generateLabel(
      fallbackKey,
      config,
      t,
      columnMetadata,
    );

    return {
      [fallbackKey]: {
        label,
        color: this.getDefaultColor(0, config),
      },
    };
  }

  /**
   * Determines colors for all series
   * Priority: Series-specific color > Config colors > Default colors
   */
  private static determineSeriesColors(
    config: ChartWidgetConfig,
    seriesKeys: string[],
  ): string[] {
    return seriesKeys.map((key, index) => {
      // Check for series-specific color override
      const customColor = config.seriesColors?.[key];
      if (customColor) {
        return customColor;
      }

      // Use default color for this index
      return this.getDefaultColor(index, config);
    });
  }

  /**
   * Gets the default color for a series index
   * Uses custom palette if configured, otherwise falls back to defaults
   */
  private static getDefaultColor(
    index: number,
    config: ChartWidgetConfig,
  ): string {
    const colorPalette = config.colors?.length ? config.colors : DEFAULT_COLORS;
    const colorIndex = index % colorPalette.length;

    return (
      colorPalette[colorIndex] ||
      DEFAULT_COLORS[colorIndex] ||
      `var(--chart-${(index % 12) + 1})`
    );
  }

  /**
   * Creates a configuration for chart axes
   * Consolidates common axis configuration patterns
   */
  static buildAxisConfig(config: ChartWidgetConfig, isTimeSeries: boolean) {
    return {
      xAxis: {
        type: isTimeSeries ? ('number' as const) : ('category' as const),
        scale: isTimeSeries ? ('time' as const) : ('auto' as const),
        domain: isTimeSeries ? (['dataMin', 'dataMax'] as const) : undefined,
        tickLine: config.chartType === 'line',
        tickMargin: 10,
        axisLine: false,
        tick: { fontSize: 10.5 },
      },
      yAxis: {
        tickLine: false,
        axisLine: false,
        tick: { fontSize: 10.5 },
      },
    };
  }

  /**
   * Creates configuration for stacked charts
   * Determines if stacking should be applied based on chart type and config
   */
  static getStackConfig(config: ChartWidgetConfig): string | undefined {
    const isStackable =
      config.chartType === 'bar' || config.chartType === 'area';

    const isStacked = config.multiSeries?.seriesType === 'stacked';

    return isStackable && isStacked ? 'stack' : undefined;
  }
}
