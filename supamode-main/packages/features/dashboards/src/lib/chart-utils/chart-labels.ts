import type { ColumnMetadata } from '@kit/types';

import type { ChartWidgetConfig } from '../../types';

type TranslationFunction = (
  key: string,
  options?: { [key: string]: unknown },
) => string;

/**
 * Generates human-readable labels for chart series
 * Makes explicit how aggregations and column metadata affect labels
 */
export class ChartLabelGenerator {
  /**
   * Generates labels for all series keys
   * Handles special cases like aggregation fields and column display names
   */
  static generateLabels(
    config: ChartWidgetConfig,
    seriesKeys: string[],
    t: TranslationFunction,
    columnMetadata?: ColumnMetadata[],
  ): Record<string, string> {
    const labels: Record<string, string> = {};

    for (const key of seriesKeys) {
      labels[key] = this.generateLabel(key, config, t, columnMetadata);
    }

    return labels;
  }

  /**
   * Generates a single label for a series key
   * Priority: Aggregation label > Column display name > Raw key
   */
  static generateLabel(
    key: string,
    config: ChartWidgetConfig,
    t: TranslationFunction,
    columnMetadata?: ColumnMetadata[],
  ): string {
    // Special case: Handle aggregation fields
    if (this.isAggregationField(key, config)) {
      return this.getAggregationLabel(config, t);
    }

    // Check for column metadata display name
    const displayName = this.getColumnDisplayName(key, columnMetadata);

    if (displayName) {
      return this.truncateLabel(displayName);
    }

    // Handle multi-series keys (e.g., "column1 | column2")
    if (key.includes(' | ')) {
      return this.formatMultiSeriesLabel(key, columnMetadata);
    }

    // Fallback to the raw key
    return this.truncateLabel(key);
  }

  /**
   * Checks if a series key represents an aggregation field
   * The backend returns 'value' for aggregations, regardless of original yAxis config
   */
  private static isAggregationField(
    key: string,
    config: ChartWidgetConfig,
  ): boolean {
    // Direct match for aggregations with yAxis='*'
    if (key === 'value' && config.aggregation != null && config.yAxis === '*') {
      return true;
    }

    // Check if this is 'value' field when aggregation is configured
    // This handles cases where yAxis was configured as a specific column
    // but got mapped to 'value' due to aggregation
    if (key === 'value' && config.aggregation != null) {
      return true;
    }

    return false;
  }

  /**
   * Generates a human-readable label for aggregations
   * Examples: "Total count", "Sum of revenue", "Average price"
   */
  private static getAggregationLabel(
    config: ChartWidgetConfig,
    t: TranslationFunction,
  ): string {
    const aggregation = config.aggregation?.toLowerCase();
    const column = config.yAxis;

    if (!aggregation) {
      return t('dashboard:widgets.chart.labels.value');
    }

    // Special handling for COUNT aggregation
    if (aggregation === 'count') {
      if (column === '*') {
        return t('dashboard:widgets.chart.labels.totalCount');
      }

      // Use the original configured column name for the label
      return t('dashboard:widgets.chart.labels.countOf', {
        column: this.formatColumnName(column || 'records'),
      });
    }

    // Handle other aggregations
    const aggregationKey = `dashboard:widgets.chart.labels.${aggregation}`;
    const aggregationLabel = t(aggregationKey);

    if (column && column !== '*') {
      return t('dashboard:widgets.chart.labels.aggregationOf', {
        aggregation: aggregationLabel,
        column: this.formatColumnName(column),
      });
    }

    return t('dashboard:widgets.chart.labels.aggregationValue', {
      aggregation: aggregationLabel,
    });
  }

  /**
   * Gets the display name for a column from metadata
   */
  private static getColumnDisplayName(
    columnName: string,
    columnMetadata?: ColumnMetadata[],
  ): string | undefined {
    const column = columnMetadata?.find((col) => col.name === columnName);
    return column?.display_name || undefined;
  }

  /**
   * Formats a multi-series label (e.g., "status | category")
   * Attempts to use display names for each part
   */
  private static formatMultiSeriesLabel(
    key: string,
    columnMetadata?: ColumnMetadata[],
  ): string {
    const parts = key.split(' | ');
    const formattedParts = parts.map((part) => {
      const displayName = this.getColumnDisplayName(part, columnMetadata);
      return displayName || part;
    });
    return this.truncateLabel(formattedParts.join(' | '));
  }

  /**
   * Formats a column name for display
   * Converts snake_case to Title Case
   */
  private static formatColumnName(column: string): string {
    // Handle special cases - these will be translated at call site
    if (column === '*') return 'all records';
    if (!column) return 'records';

    // Convert snake_case to Title Case
    return column
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Truncates long labels to prevent UI overflow
   */
  private static truncateLabel(label: string, maxLength: number = 30): string {
    if (label.length <= maxLength) {
      return label;
    }
    return `${label.substring(0, maxLength - 3)}...`;
  }

  /**
   * Generates a tooltip-specific label
   * Can be more verbose than axis labels since space is less constrained
   */
  static generateTooltipLabel(
    key: string,
    config: ChartWidgetConfig,
    t: TranslationFunction,
    columnMetadata?: ColumnMetadata[],
  ): string {
    // For tooltips, we can be more descriptive
    if (this.isAggregationField(key, config)) {
      return this.getVerboseAggregationLabel(config, t);
    }

    return this.generateLabel(key, config, t, columnMetadata);
  }

  /**
   * Generates a verbose aggregation label for tooltips
   * More descriptive than the standard label
   */
  private static getVerboseAggregationLabel(
    config: ChartWidgetConfig,
    t: TranslationFunction,
  ): string {
    const aggregation = config.aggregation?.toLowerCase();
    const column = config.yAxis;

    if (!aggregation) {
      return t('dashboard:widgets.chart.tooltips.value');
    }

    // Special handling for COUNT aggregation
    if (aggregation === 'count') {
      if (column === '*') {
        return t('dashboard:widgets.chart.tooltips.totalCount');
      }
      return t('dashboard:widgets.chart.tooltips.countOf', {
        column: this.formatColumnName(column || 'records'),
      });
    }

    // Handle other aggregations with more descriptive text
    const aggregationKey = `dashboard:widgets.chart.tooltips.${aggregation}`;

    if (column && column !== '*') {
      return t('dashboard:widgets.chart.tooltips.aggregationOf', {
        aggregation: t(aggregationKey),
        column: this.formatColumnName(column),
      });
    }

    return t('dashboard:widgets.chart.tooltips.aggregationValue', {
      aggregation: t(aggregationKey),
    });
  }
}
