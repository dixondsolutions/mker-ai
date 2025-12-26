import { useMemo } from 'react';

import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from 'recharts';

import { useDateFormatter } from '@kit/formatters/hooks';
import type { ColumnMetadata } from '@kit/types';
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@kit/ui/chart';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import {
  ChartConfigBuilder,
  ChartDataTransformer,
  createChartFormatters,
} from '../../lib/chart-utils';
import type { ChartWidgetConfig, WidgetData } from '../../types';

interface ChartWidgetProps {
  data?: WidgetData;
  config: ChartWidgetConfig;
  isEditing?: boolean;
  className?: string;
  columnMetadata?: ColumnMetadata[];
}

const MARGIN = { top: 25, right: 25, left: 0, bottom: 15 };

interface ChartDataHookProps {
  data?: WidgetData;
  config: ChartWidgetConfig;
}

function useChartData({ data, config }: ChartDataHookProps) {
  return useMemo(() => {
    // Use the new ChartDataTransformer for explicit data transformations
    return ChartDataTransformer.transform(data, config);
  }, [data, config]);
}

interface ChartConfigHookProps {
  config: ChartWidgetConfig;
  seriesKeys: string[];
  columnMetadata?: ColumnMetadata[];
}

function useChartConfig({
  config,
  seriesKeys,
  columnMetadata,
}: ChartConfigHookProps): ChartConfig {
  const { t } = useTranslation();

  return useMemo(() => {
    // Use the new ChartConfigBuilder for explicit configuration building
    return ChartConfigBuilder.build(config, seriesKeys, t, columnMetadata);
  }, [config, seriesKeys, t, columnMetadata]);
}

interface EmptyChartStateProps {
  isEditing?: boolean;
  className?: string;
}

function EmptyChartState({ isEditing, className }: EmptyChartStateProps) {
  return (
    <div
      className={cn(
        'chart-widget flex h-full items-center justify-center',
        className,
      )}
    >
      <div className="text-muted-foreground text-center">
        <p className="text-sm">
          <Trans i18nKey="dashboard:widgets.chart.noData" />
        </p>

        {isEditing && (
          <p className="mt-1 text-xs">
            <Trans i18nKey="dashboard:widgets.chart.configureToDisplay" />
          </p>
        )}
      </div>
    </div>
  );
}

interface BaseChartRendererProps {
  chartData: unknown[];
  chartConfig: ChartConfig;
  xAxisKey: string;
  seriesKeys: string[];
  config: ChartWidgetConfig;
  isTimeSeries?: boolean;
  t?: (key: string, options?: { [key: string]: unknown }) => string;
}

type BarChartRendererProps = BaseChartRendererProps;

function BarChartRenderer({
  chartData,
  chartConfig,
  xAxisKey,
  seriesKeys,
  config,
  isTimeSeries = false,
  t,
}: BarChartRendererProps) {
  const dateFormatter = useDateFormatter();

  // Use the new createChartFormatters for all formatters
  const formatters = useMemo(
    () => createChartFormatters(config, dateFormatter, isTimeSeries, t),
    [config, dateFormatter, isTimeSeries, t],
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="h-full min-h-[200px] w-full"
    >
      <BarChart accessibilityLayer data={chartData} margin={MARGIN}>
        {config.showGrid && <CartesianGrid vertical={false} />}

        <XAxis
          dataKey={xAxisKey}
          tickMargin={10}
          axisLine={false}
          tick={{ fontSize: 10.5 }}
          tickFormatter={formatters.xAxisTickFormatter}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10.5 }}
          tickFormatter={formatters.yAxisFormatter}
        />

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={
                isTimeSeries ? formatters.tooltipLabelFormatter : undefined
              }
              formatter={(value) => formatters.yAxisFormatter(Number(value))}
            />
          }
        />
        {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}

        {/* Render multiple bars for multi-series */}
        {seriesKeys.map((seriesKey, index) => {
          const stackId = ChartConfigBuilder.getStackConfig(config);
          const seriesConfig = chartConfig[seriesKey];
          const fillColor = seriesConfig?.color || `var(--chart-${index + 1})`;

          return (
            <Bar
              key={seriesKey}
              dataKey={seriesKey}
              fill={fillColor}
              radius={4}
              stackId={stackId}
            />
          );
        })}
      </BarChart>
    </ChartContainer>
  );
}

function LineChartRenderer({
  chartData,
  chartConfig,
  xAxisKey,
  seriesKeys,
  config,
  isTimeSeries = false,
  t,
}: BaseChartRendererProps) {
  const dateFormatter = useDateFormatter();

  // Use the new createChartFormatters for all formatters
  const formatters = useMemo(
    () => createChartFormatters(config, dateFormatter, isTimeSeries, t),
    [config, dateFormatter, isTimeSeries, t],
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-full min-h-[200px] w-full"
    >
      <LineChart accessibilityLayer data={chartData} margin={MARGIN}>
        {config.showGrid && <CartesianGrid vertical={false} />}

        <XAxis
          dataKey={xAxisKey}
          tickLine={true}
          tickMargin={10}
          axisLine={false}
          tick={{ fontSize: 10.5 }}
          tickFormatter={formatters.xAxisTickFormatter}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10.5 }}
          tickFormatter={formatters.yAxisFormatter}
        />

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={
                isTimeSeries ? formatters.tooltipLabelFormatter : undefined
              }
              formatter={(value) => formatters.yAxisFormatter(Number(value))}
            />
          }
        />

        {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}

        {/* Render multiple lines for multi-series */}
        {seriesKeys.map((seriesKey, index) => {
          const seriesConfig = chartConfig[seriesKey];

          const strokeColor =
            seriesConfig?.color || `var(--chart-${index + 1})`;

          return (
            <Line
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              stroke={strokeColor}
              strokeWidth={2}
              dot={false}
            />
          );
        })}
      </LineChart>
    </ChartContainer>
  );
}

function AreaChartRenderer({
  chartData,
  chartConfig,
  xAxisKey,
  seriesKeys,
  config,
  isTimeSeries = false,
  t,
}: BarChartRendererProps) {
  const dateFormatter = useDateFormatter();

  // Use the new createChartFormatters for all formatters
  const formatters = useMemo(
    () => createChartFormatters(config, dateFormatter, isTimeSeries, t),
    [config, dateFormatter, isTimeSeries, t],
  );

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-full min-h-[200px] w-full"
    >
      <AreaChart accessibilityLayer data={chartData} margin={MARGIN}>
        {config.showGrid && <CartesianGrid vertical={false} />}

        <XAxis
          dataKey={xAxisKey}
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tick={{ fontSize: 10.5 }}
          tickFormatter={formatters.xAxisTickFormatter}
        />

        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 10.5 }}
          tickFormatter={formatters.yAxisFormatter}
        />

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={
                isTimeSeries ? formatters.tooltipLabelFormatter : undefined
              }
              formatter={(value) => formatters.yAxisFormatter(Number(value))}
            />
          }
        />

        {config.showLegend && <ChartLegend content={<ChartLegendContent />} />}

        {/* Render multiple areas for multi-series */}
        {seriesKeys.map((seriesKey, index) => {
          const stackId = ChartConfigBuilder.getStackConfig(config);
          const seriesConfig = chartConfig[seriesKey];

          const seriesColor =
            seriesConfig?.color || `var(--chart-${index + 1})`;

          return (
            <Area
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              stroke={seriesColor}
              fill={seriesColor}
              fillOpacity={0.3}
              stackId={stackId}
            />
          );
        })}
      </AreaChart>
    </ChartContainer>
  );
}

function UnsupportedChartType({ chartType }: { chartType: string }) {
  return (
    <div className="text-muted-foreground flex h-full items-center justify-center">
      <p className="text-sm">
        <Trans
          i18nKey="dashboard:widgets.chart.unsupportedType"
          values={{ chartType }}
        />
      </p>
    </div>
  );
}

interface ChartRendererProps {
  chartData: unknown[];
  xAxisKey: string;
  seriesKeys: string[];
  config: ChartWidgetConfig;
  chartConfig: ChartConfig;
  isEditing?: boolean;
  className?: string;
  t?: (key: string, options?: { [key: string]: unknown }) => string;
}

function ChartRenderer({
  chartData,
  xAxisKey,
  seriesKeys,
  config,
  chartConfig,
  isEditing,
  className,
  t,
}: ChartRendererProps) {
  // Detect if this is a time series based on timeAggregation setting or if x-axis contains timestamp data
  const firstRow =
    chartData.length > 0 ? (chartData[0] as Record<string, unknown>) : null;

  const xAxisValue = firstRow?.[xAxisKey];

  const isTimeSeries =
    Boolean(config?.timeAggregation) ||
    xAxisKey === 'time_bucket' || // Auto-detect if using time_bucket key
    (typeof xAxisValue === 'number' && xAxisValue > 946684800000); // After year 2000 timestamp

  const baseRendererProps = {
    chartData,
    xAxisKey,
    seriesKeys,
    config,
    chartConfig,
    isTimeSeries,
    t,
  };

  const stackableRendererProps = {
    ...baseRendererProps,
  };

  if (!chartData.length) {
    return <EmptyChartState isEditing={isEditing} className={className} />;
  }

  const chartComponent = (() => {
    switch (config.chartType) {
      case 'bar':
        return <BarChartRenderer {...stackableRendererProps} />;

      case 'line':
        return <LineChartRenderer {...baseRendererProps} />;

      case 'area':
        return <AreaChartRenderer {...stackableRendererProps} />;

      default:
        return <UnsupportedChartType chartType={config.chartType || ''} />;
    }
  })();

  return chartComponent;
}

export function ChartWidget({
  data,
  config,
  isEditing,
  className,
  columnMetadata,
}: ChartWidgetProps) {
  const { t } = useTranslation();
  const { chartData, seriesKeys, originalConfig } = useChartData({
    data,
    config,
  });

  // Determine x-axis key with fallback logic for time series detection
  const xAxisKey: string = (() => {
    // Explicit time aggregation configuration
    if (config?.timeAggregation && config.xAxis) {
      return 'time_bucket';
    }

    // Auto-detect time series: if data contains 'time_bucket', it's likely a time series
    if (
      chartData.length > 0 &&
      'time_bucket' in (chartData[0] as Record<string, unknown>)
    ) {
      return 'time_bucket';
    }

    return config?.xAxis || 'x';
  })();

  const chartConfig = useChartConfig({
    config: originalConfig || config, // Use originalConfig for better labeling
    seriesKeys,
    columnMetadata,
  });

  return (
    <div className={cn('chart-widget h-full w-full', className)}>
      <ChartRenderer
        chartData={chartData}
        xAxisKey={xAxisKey}
        seriesKeys={seriesKeys}
        config={config}
        chartConfig={chartConfig}
        isEditing={isEditing}
        className={className}
        t={t}
      />
    </div>
  );
}
