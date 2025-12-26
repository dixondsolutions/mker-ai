import { formatValue } from '@kit/formatters';

import type { ChartWidgetConfig } from '../../types';

export interface ChartFormatters {
  xAxisTickFormatter?: (value: string | number) => string;
  tooltipLabelFormatter?: (value: string | number) => string;
  yAxisFormatter: (value: number) => string;
}

type TranslationFunction = (
  key: string,
  options?: { [key: string]: unknown },
) => string;

/**
 * Gets the appropriate date format string based on time aggregation level
 */
function getDateFormatForAggregation(
  timeAggregation?: string,
  t?: TranslationFunction,
): string {
  switch (timeAggregation) {
    case 'year':
      return 'yyyy'; // "2021"
    case 'quarter':
      return "QQQ ''yy"; // "Q1 '21"
    case 'month':
      return 'MMM yyyy'; // "Jan 2021"
    case 'week': {
      // Use i18n for "Week of" prefix
      const weekPrefix =
        t?.('dashboard:widgets.chart.dateFormats.weekOf') || 'Week of';
      return `'${weekPrefix}' MMM dd`; // "Week of Jul 15"
    }
    case 'day':
      return 'MMM dd'; // "Jul 15"
    case 'hour':
      return 'MMM dd, ha'; // "Jul 15, 3PM"
    default:
      return 'MMM dd'; // "Jul 15"
  }
}

/**
 * Gets the appropriate detailed date format for tooltips based on aggregation level
 */
function getTooltipDateFormatForAggregation(
  timeAggregation?: string,
  t?: TranslationFunction,
): string {
  switch (timeAggregation) {
    case 'year':
      return 'yyyy'; // "2021"
    case 'quarter':
      return 'QQQQ yyyy'; // "1st quarter 2021"
    case 'month':
      return 'MMMM yyyy'; // "January 2021"
    case 'week': {
      // Use i18n for "Week of" prefix in tooltips
      const weekPrefix =
        t?.('dashboard:widgets.chart.dateFormats.weekOf') || 'Week of';
      return `'${weekPrefix}' PPP`; // "Week of July 15th, 2021"
    }
    case 'day':
      return 'PPpp'; // "Jul 15, 2021 at 12:00 AM"
    case 'hour':
      return 'PPP pp'; // "July 15th, 2021 at 3:00 PM"
    default:
      return 'PPpp'; // "Jul 15, 2021 at 12:00 AM"
  }
}

/**
 * Creates formatters for chart axes and tooltips
 * Eliminates duplication between Bar, Line, and Area chart renderers
 */
export function createChartFormatters(
  config: ChartWidgetConfig,
  dateFormatter: (date: Date, format: string) => string | null,
  isTimeSeries: boolean,
  t?: TranslationFunction,
): ChartFormatters {
  return {
    xAxisTickFormatter: isTimeSeries
      ? createXAxisFormatter(config, dateFormatter, t)
      : undefined,
    tooltipLabelFormatter: isTimeSeries
      ? createTooltipFormatter(config, dateFormatter, t)
      : undefined,
    yAxisFormatter: createYAxisFormatter(config),
  };
}

/**
 * Creates X-axis tick formatter for time series charts
 * Handles both custom formatters and default date formatting
 */
function createXAxisFormatter(
  config: ChartWidgetConfig,
  dateFormatter: (date: Date, format: string) => string | null,
  t?: TranslationFunction,
): (value: string | number) => string {
  return (value: string | number) => {
    try {
      // Try custom formatter first if configured
      if (config.xAxisFormatterType && config.xAxisFormatterConfig) {
        try {
          const formatterConfig = {
            type: config.xAxisFormatterType,
            ...config.xAxisFormatterConfig,
          };

          return formatValue(value, formatterConfig);
        } catch (error) {
          console.warn(
            'Failed to format X-axis value with custom formatter:',
            error,
          );
        }
      }

      // Default date formatting for time series
      const date = new Date(value);

      if (isNaN(date.getTime())) {
        return String(value);
      }

      // Use format appropriate for the time aggregation level
      const format = getDateFormatForAggregation(config.timeAggregation, t);
      return dateFormatter(date, format) || date.toLocaleDateString();
    } catch {
      return String(value);
    }
  };
}

/**
 * Creates tooltip label formatter for time series charts
 * Handles both custom formatters and default date formatting
 */
function createTooltipFormatter(
  config: ChartWidgetConfig,
  dateFormatter: (date: Date, format: string) => string | null,
  t?: TranslationFunction,
): (value: string | number) => string {
  return (value: string | number) => {
    try {
      // Try custom formatter first if configured
      if (config.tooltipFormatterType && config.tooltipFormatterConfig) {
        try {
          const formatterConfig = {
            type: config.tooltipFormatterType,
            ...config.tooltipFormatterConfig,
          };

          return formatValue(value, formatterConfig);
        } catch (error) {
          console.warn(
            'Failed to format tooltip value with custom formatter:',
            error,
          );
        }
      }

      // Default date formatting for time series tooltips
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return String(value);
      }

      // Use detailed format appropriate for the time aggregation level
      const format = getTooltipDateFormatForAggregation(
        config.timeAggregation,
        t,
      );
      return dateFormatter(date, format) || date.toLocaleDateString();
    } catch {
      return String(value);
    }
  };
}

/**
 * Creates Y-axis formatter for numeric values
 * Handles both custom formatters and default compact formatting
 */
function createYAxisFormatter(
  config: ChartWidgetConfig,
): (value: number) => string {
  return (value: number) => {
    // Try custom formatter first if configured
    if (config.yAxisFormatterType) {
      try {
        // For percentage formatter, don't convert the value
        // Chart values are typically raw counts, not decimals
        if (config.yAxisFormatterType === 'percentage') {
          // Append % symbol without converting the value
          return `${value}%`;
        }

        const formatterConfig = {
          type: config.yAxisFormatterType,
          ...(config.yAxisFormatterConfig || {}),
        };

        return formatValue(value, formatterConfig);
      } catch (error) {
        console.warn(
          'Failed to format Y-axis value with custom formatter:',
          error,
        );
      }
    }

    // Fall back to default compact formatting
    return formatValue(value, { type: 'compact' });
  };
}
