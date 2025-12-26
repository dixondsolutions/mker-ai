import { useMemo } from 'react';

import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from 'lucide-react';

import { formatValue } from '@kit/formatters';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { NumericTransformer } from '../../lib/data-transformers/numeric-transformer';
import type { MetricWidgetConfig, WidgetData } from '../../types';

interface MetricWidgetProps {
  data?: WidgetData;
  config: MetricWidgetConfig;
  isEditing?: boolean;
  className?: string;
}

interface ProcessedMetricData {
  value: number;
  previousValue?: number;
  trend?: 'up' | 'down' | 'stable';
  trendPercentage?: number;
  previousPeriodStart?: string;
  previousPeriodEnd?: string;
}

function useMetricData(data?: WidgetData): ProcessedMetricData {
  return useMemo(() => {
    if (!data) {
      return {
        value: 0,
        previousValue: undefined,
        trend: 'stable' as const,
        trendPercentage: 0,
      };
    }

    // Handle the standard widget data format: { data: [...] }
    if (
      typeof data === 'object' &&
      'data' in data &&
      Array.isArray(data.data) &&
      data.data.length > 0
    ) {
      // Use numeric transformer for robust type-safe conversion
      const transformResult = NumericTransformer.transformWidgetData(
        data.data as Record<string, unknown>[],
        {
          numericFields: ['value', 'previousValue', 'trendPercentage'],
          defaultValue: 0,
          logWarnings: false, // Don't log warnings for individual metrics
        },
      );

      const firstRow = transformResult.data[0] || {};

      // Extract values (now guaranteed to be numbers)
      const value =
        typeof firstRow['value'] === 'number' ? firstRow['value'] : 0;
      const previousValue =
        typeof firstRow['previousValue'] === 'number'
          ? firstRow['previousValue']
          : undefined;

      // Extract trend (string field, no numeric conversion needed)
      const trend =
        typeof firstRow['trend'] === 'string' &&
        ['up', 'down', 'stable'].includes(firstRow['trend'])
          ? (firstRow['trend'] as 'up' | 'down' | 'stable')
          : 'stable';

      const trendPercentage =
        typeof firstRow['trendPercentage'] === 'number'
          ? firstRow['trendPercentage']
          : 0;

      const previousPeriodStart =
        typeof firstRow['previousPeriodStart'] === 'string'
          ? firstRow['previousPeriodStart']
          : undefined;

      const previousPeriodEnd =
        typeof firstRow['previousPeriodEnd'] === 'string'
          ? firstRow['previousPeriodEnd']
          : undefined;

      return {
        value,
        previousValue,
        trend,
        trendPercentage,
        previousPeriodStart,
        previousPeriodEnd,
      };
    }

    // Check if data has required metric properties directly (legacy format)
    if (typeof data === 'object' && 'value' in data) {
      const dataRecord = data as unknown as Record<string, unknown>;
      let value = 0;
      if (typeof dataRecord['value'] === 'number') {
        value = dataRecord['value'];
      } else if (typeof dataRecord['value'] === 'string') {
        const parsed = parseFloat(dataRecord['value']);
        value = isNaN(parsed) ? 0 : parsed;
      }

      const previousValue =
        typeof dataRecord['previousValue'] === 'number'
          ? dataRecord['previousValue']
          : undefined;
      const trend =
        typeof dataRecord['trend'] === 'string' &&
        ['up', 'down', 'stable'].includes(dataRecord['trend'])
          ? (dataRecord['trend'] as 'up' | 'down' | 'stable')
          : 'stable';
      const trendPercentage =
        typeof dataRecord['trendPercentage'] === 'number'
          ? dataRecord['trendPercentage']
          : 0;
      const previousPeriodStart =
        typeof dataRecord['previousPeriodStart'] === 'string'
          ? dataRecord['previousPeriodStart']
          : undefined;
      const previousPeriodEnd =
        typeof dataRecord['previousPeriodEnd'] === 'string'
          ? dataRecord['previousPeriodEnd']
          : undefined;

      return {
        value,
        previousValue,
        trend,
        trendPercentage,
        previousPeriodStart,
        previousPeriodEnd,
      };
    }

    // Fallback for unexpected data format
    return {
      value: 0,
      previousValue: undefined,
      trend: 'stable' as const,
      trendPercentage: 0,
    };
  }, [data]);
}

function useFormattedValue(value: number, config: MetricWidgetConfig): string {
  return useMemo(() => {
    if (typeof value !== 'number' || isNaN(value)) {
      return '—';
    }

    // Use custom formatter if specified (new approach)
    if (config.formatterType) {
      try {
        const formatterConfig = {
          type: config.formatterType,
          ...config.formatterConfig,
        };
        return formatValue(value, formatterConfig);
      } catch (error) {
        console.warn('Failed to format value with custom formatter:', error);
        // Fall back to legacy formatting
      }
    }

    // Legacy formatting using formatValue for consistency
    const precision = config.precision ?? 2;
    const format = config.format || 'number';

    try {
      switch (format) {
        case 'currency':
          return formatValue(value, {
            type: 'currency',
            currency: 'USD', // Default currency, should be configurable in the future
            minimumFractionDigits: precision === 0 ? 0 : 2,
            maximumFractionDigits: precision,
          });

        case 'percentage':
          return formatValue(value, {
            type: 'percentage',
            minimumFractionDigits: 0,
            maximumFractionDigits: precision === 0 ? 0 : 1,
          });

        case 'decimal':
          return formatValue(value, {
            type: 'decimal',
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
          });

        case 'number':
        default:
          return formatValue(value, {
            type: 'number',
            minimumFractionDigits: 0,
            maximumFractionDigits: precision,
          });
      }
    } catch (error) {
      console.warn('Failed to format value:', error);
      return String(value);
    }
  }, [
    value,
    config.format,
    config.formatterType,
    config.formatterConfig,
    config.precision,
  ]);
}

function useFormattedTrend(
  trendPercentage?: number,
  showTrend?: boolean,
): string | null {
  return useMemo(() => {
    if (!showTrend || !trendPercentage) {
      return null;
    }

    const percentage = Math.abs(trendPercentage);
    try {
      return formatValue(percentage / 100, {
        type: 'percentage',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1,
      });
    } catch (error) {
      console.warn('Failed to format trend percentage:', error);
      return `${Math.round(percentage)}%`;
    }
  }, [trendPercentage, showTrend]);
}

interface TrendDisplay {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

function useTrendDisplay(
  trend?: string,
  showTrend?: boolean,
  trendDirection?: 'positive' | 'negative',
): TrendDisplay | null {
  return useMemo(() => {
    if (!showTrend || !trend) {
      return null;
    }

    // Default to 'positive' if not specified (higher is better)
    const direction = trendDirection || 'positive';

    switch (trend) {
      case 'up':
        return {
          icon: ArrowUpIcon,
          // If positive direction (higher is better), up is green (good)
          // If negative direction (lower is better), up is red (bad)
          color: direction === 'positive' ? 'text-green-600' : 'text-red-600',
          bgColor: direction === 'positive' ? 'bg-green-100' : 'bg-red-100',
        };
      case 'down':
        return {
          icon: ArrowDownIcon,
          // If positive direction (higher is better), down is red (bad)
          // If negative direction (lower is better), down is green (good)
          color: direction === 'positive' ? 'text-red-600' : 'text-green-600',
          bgColor: direction === 'positive' ? 'bg-red-100' : 'bg-green-100',
        };
      case 'stable':
      default:
        return {
          icon: MinusIcon,
          color: 'text-gray-600',
          bgColor: 'bg-gray-100',
        };
    }
  }, [trend, showTrend, trendDirection]);
}

interface MetricEditingStateProps {
  className?: string;
}

function MetricEditingState({ className }: MetricEditingStateProps) {
  return (
    <div
      className={cn(
        'metric-widget flex h-full flex-col items-center justify-center p-4',
        className,
      )}
    >
      <div className="text-center">
        <div className="text-muted-foreground mb-2 text-3xl font-bold">123</div>
        <p className="text-muted-foreground text-sm">
          <Trans i18nKey="dashboard:widgets.metric.widgetType" />
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          <Trans i18nKey="dashboard:widgets.metric.configureToDisplay" />
        </p>
      </div>
    </div>
  );
}

interface MetricValueDisplayProps {
  formattedValue: string;
  config: MetricWidgetConfig;
}

function MetricValueDisplay({
  formattedValue,
  config,
}: MetricValueDisplayProps) {
  return (
    <div className="space-y-1">
      {config.prefix && (
        <span className="text-muted-foreground text-sm">{config.prefix}</span>
      )}

      <div className="text-6xl font-bold tracking-tight">{formattedValue}</div>

      {config.suffix && (
        <span className="text-muted-foreground ml-1 text-sm">
          {config.suffix}
        </span>
      )}
    </div>
  );
}

interface MetricDescriptionProps {
  description?: string;
}

function MetricDescription({ description }: MetricDescriptionProps) {
  if (!description) return null;

  return <p className="text-muted-foreground text-sm">{description}</p>;
}

interface TopRightTrendProps {
  trendDisplay: TrendDisplay | null;
  formattedTrend: string | null;
  showTrend?: boolean;
}

function TopRightTrend({
  trendDisplay,
  formattedTrend,
  showTrend,
}: TopRightTrendProps) {
  if (!showTrend || !trendDisplay || !formattedTrend) {
    return null;
  }

  return (
    <div className="absolute top-4 right-4">
      <div className={cn('flex items-center gap-1', trendDisplay.color)}>
        <trendDisplay.icon className="h-3 w-3" />
        <span className="text-sm font-medium">{formattedTrend}</span>
      </div>
    </div>
  );
}

interface TrendDisplayProps {
  trendDisplay: TrendDisplay | null;
  formattedTrend: string | null;
  previousValue?: number;
  config: MetricWidgetConfig;
  metricData: {
    previousPeriodStart?: string;
    previousPeriodEnd?: string;
    trend?: 'up' | 'down' | 'stable';
    trendPercentage?: number;
  };
}

function TrendDisplay({
  trendDisplay,
  formattedTrend,
  previousValue,
  config,
  metricData,
}: TrendDisplayProps) {
  const formattedPreviousValue = useFormattedValue(previousValue ?? 0, config);

  // Calculate a period description based on the date range
  const { periodKey, periodValues } = useMemo(() => {
    if (!metricData.previousPeriodStart || !metricData.previousPeriodEnd) {
      return {
        periodKey: 'dashboard:widgets.metric.previousPeriod',
        periodValues: {},
      };
    }

    const startDate = new Date(metricData.previousPeriodStart);
    const endDate = new Date(metricData.previousPeriodEnd);

    const diffDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Provide more user-friendly period descriptions
    if (diffDays === 1) {
      return {
        periodKey: 'dashboard:widgets.metric.yesterday',
        periodValues: {},
      };
    } else if (diffDays === 7) {
      return {
        periodKey: 'dashboard:widgets.metric.lastWeek',
        periodValues: {},
      };
    } else if (diffDays >= 28 && diffDays <= 31) {
      return {
        periodKey: 'dashboard:widgets.metric.lastMonth',
        periodValues: {},
      };
    } else {
      return {
        periodKey: 'dashboard:widgets.metric.lastDays',
        periodValues: { days: diffDays },
      };
    }
  }, [metricData.previousPeriodStart, metricData.previousPeriodEnd]);

  // Show previous value comparison if we have trend data or just previous value
  if (
    (trendDisplay &&
      formattedTrend &&
      metricData.trend &&
      metricData.trendPercentage !== undefined) ||
    previousValue !== undefined
  ) {
    return (
      <div className="text-center">
        <p className="text-muted-foreground text-sm">
          <Trans i18nKey="dashboard:widgets.metric.vs" />{' '}
          <Trans i18nKey={periodKey} values={periodValues} />:{' '}
          <span className="font-medium">{formattedPreviousValue}</span>
        </p>
      </div>
    );
  }

  return null;
}

interface AggregationInfoProps {
  config: MetricWidgetConfig;
}

function AggregationInfo({ config }: AggregationInfoProps) {
  if (!config.aggregation || config.aggregation === 'count') return null;

  return (
    <p className="text-muted-foreground text-xs capitalize">
      {config.aggregation} <Trans i18nKey="dashboard:widgets.metric.of" />{' '}
      {config.metric}
    </p>
  );
}

export function MetricWidget({
  data,
  config,
  isEditing,
  className,
}: MetricWidgetProps) {
  const metricData = useMetricData(data);
  const formattedValue = useFormattedValue(metricData.value, config);

  const formattedTrend = useFormattedTrend(
    metricData.trendPercentage,
    config.showTrend,
  );

  const trendDisplay = useTrendDisplay(
    metricData.trend,
    config.showTrend,
    config.trendDirection,
  );

  if (isEditing) {
    return <MetricEditingState className={className} />;
  }

  return (
    <div
      className={cn(
        'metric-widget relative flex h-full flex-col justify-center p-4',
        className,
      )}
    >
      <TopRightTrend
        trendDisplay={trendDisplay}
        formattedTrend={formattedTrend}
        showTrend={config.showTrend}
      />

      <div className="space-y-2 text-center">
        <MetricValueDisplay formattedValue={formattedValue} config={config} />

        <MetricDescription description={config.description} />

        <TrendDisplay
          trendDisplay={trendDisplay}
          formattedTrend={formattedTrend}
          previousValue={metricData.previousValue}
          config={config}
          metricData={{
            previousPeriodStart: metricData.previousPeriodStart,
            previousPeriodEnd: metricData.previousPeriodEnd,
            trend: metricData.trend,
            trendPercentage: metricData.trendPercentage,
          }}
        />

        <AggregationInfo config={config} />
      </div>
    </div>
  );
}
