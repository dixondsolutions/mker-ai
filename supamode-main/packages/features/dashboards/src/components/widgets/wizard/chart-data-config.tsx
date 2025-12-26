import { useCallback, useId, useMemo, useState } from 'react';

import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  FormatterConfigData,
  FormatterSelect,
  useFormatterOptions,
} from '@kit/formatters/components';
import { useDataFormatter } from '@kit/formatters/hooks';
import type { ColumnMetadata } from '@kit/types';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Switch } from '@kit/ui/switch';
import { Trans } from '@kit/ui/trans';

import type { FlexibleWidgetFormData } from '../../../types/widget-forms';

// Feature flags for initial release
const ENABLE_GROUP_BY = false;
const ENABLE_MULTI_SERIES = false;

interface ChartDataConfigProps {
  data: Partial<FlexibleWidgetFormData>;
  columns: ColumnMetadata[];
}

const CHART_TYPES = [
  {
    value: 'bar',
    icon: '📊',
  },
  {
    value: 'line',
    icon: '📈',
  },
  {
    value: 'area',
    icon: '🏔️',
  },
];

// Time aggregation options for datetime x-axis
const TIME_AGGREGATION_TYPES = [
  { value: 'hour', labelKey: 'dashboard:timeAggregations.hour' },
  { value: 'day', labelKey: 'dashboard:timeAggregations.day' },
  { value: 'week', labelKey: 'dashboard:timeAggregations.week' },
  { value: 'month', labelKey: 'dashboard:timeAggregations.month' },
  { value: 'quarter', labelKey: 'dashboard:timeAggregations.quarter' },
  { value: 'year', labelKey: 'dashboard:timeAggregations.year' },
];

export function ChartDataConfig({ data, columns }: ChartDataConfigProps) {
  // Check if any advanced configuration fields have values
  const hasAdvancedConfig = useMemo(() => {
    const config = data.config as Record<string, unknown>;

    // Check for time aggregation
    if (config?.['timeAggregation']) return true;

    // Check for multi-series enabled
    const multiSeries = config?.['multiSeries'] as
      | { enabled?: boolean }
      | undefined;

    if (multiSeries?.enabled) return true;

    // Check for groupBy (but not 'none' value)
    const groupBy = config?.['groupBy'] as string;
    if (groupBy && groupBy !== 'none') return true;

    // Check for formatter configuration
    if (config?.['yAxisFormatterType']) return true;
    if (config?.['yAxisFormatterConfig']) return true;

    return false;
  }, [data.config]);

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(hasAdvancedConfig);
  const chartTypeId = useId();
  const xAxisId = useId();
  const yAxisId = useId();
  const groupById = useId();
  const aggregationId = useId();

  const { numericColumns, categoricalColumns, dateTimeColumns } =
    useMemo(() => {
      const numeric = columns.filter((col) =>
        col.ui_config?.data_type
          ? [
              'integer',
              'bigint',
              'numeric',
              'real',
              'double precision',
              'decimal',
            ].includes(col.ui_config.data_type)
          : false,
      );

      const categorical = columns.filter((col) =>
        col.ui_config?.data_type
          ? ['text', 'varchar', 'character varying', 'char', 'enum'].includes(
              col.ui_config.data_type,
            )
          : false,
      );

      const dateTime = columns.filter((col) =>
        col.ui_config?.data_type
          ? ['date', 'timestamp', 'timestamp with time zone', 'time'].includes(
              col.ui_config.data_type,
            )
          : false,
      );

      return {
        numericColumns: numeric,
        categoricalColumns: categorical,
        dateTimeColumns: dateTime,
      };
    }, [columns]);

  const config = data.config as Record<string, unknown>;

  const chartType = config?.['chartType'] as string;
  const xAxis = config?.['xAxis'] as string;
  const yAxis = config?.['yAxis'] as string;
  const aggregation = config?.['aggregation'] as string;
  const groupBy = config?.['groupBy'] as string;

  // Check if selected x-axis is a datetime column
  const selectedXColumn = columns.find((col) => col.name === xAxis);

  const isXAxisDateTime =
    selectedXColumn &&
    dateTimeColumns.some((col) => col.name === selectedXColumn.name);

  return (
    <div className="flex flex-col space-y-4">
      {/* Basic Configuration - Always Visible */}
      <ChartTypeSelector chartTypeId={chartTypeId} />

      {/* Warning for line/area charts without date columns */}
      <If
        condition={
          (chartType === 'line' || chartType === 'area') &&
          dateTimeColumns.length === 0
        }
      >
        <Alert className="border-amber-200 bg-amber-50">
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>Date Column Required</AlertTitle>

          <AlertDescription>
            Line and area charts require at least one date/timestamp column in
            your table. Your table &ldquo;{data.tableName}&rdquo; doesn&apos;t
            have any date columns available. Consider using a bar chart instead,
            or add a date column to your table.
          </AlertDescription>
        </Alert>
      </If>

      <If condition={Boolean(chartType)}>
        <AxisConfiguration
          xAxisId={xAxisId}
          yAxisId={yAxisId}
          categoricalColumns={categoricalColumns}
          dateTimeColumns={dateTimeColumns}
          numericColumns={numericColumns}
          chartType={chartType}
        />
      </If>

      <If condition={Boolean(yAxis)}>
        <BasicAggregationSelector
          aggregationId={aggregationId}
          yAxis={yAxis}
          numericColumns={numericColumns}
        />
      </If>

      {/* Chart Preview */}
      <If condition={Boolean(chartType && xAxis && yAxis)}>
        <ChartPreview
          chartType={chartType}
          xAxis={xAxis}
          yAxis={yAxis}
          aggregation={aggregation}
          groupBy={groupBy}
          columns={columns}
        />
      </If>

      {/* Advanced Configuration - Collapsible */}
      <If condition={Boolean(yAxis)}>
        <div className="flex items-center gap-2">
          <Button
            variant="link"
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            <span className="mr-2">
              <Trans i18nKey="dashboard:widgets.chart.config.advancedOptions" />
            </span>

            {isAdvancedOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        <If condition={isAdvancedOpen}>
          <AdvancedAggregationAndGrouping
            groupById={groupById}
            categoricalColumns={categoricalColumns}
            isXAxisDateTime={Boolean(isXAxisDateTime)}
            data={data}
          />

          {/* Formatter Configuration */}
          <ChartFormatterConfiguration yAxis={yAxis} columns={columns} />
        </If>
      </If>
    </div>
  );
}

interface ChartFormatterConfigurationProps {
  yAxis?: string;
  columns: ColumnMetadata[];
}

function ChartFormatterConfiguration({
  yAxis,
  columns,
}: ChartFormatterConfigurationProps) {
  const { t } = useTranslation();
  const { format: formatValue } = useDataFormatter();

  // Determine the data type for Y-axis formatting
  const yAxisDataType = useMemo(() => {
    if (yAxis === '*') {
      return 'integer'; // Count aggregation returns integer
    }

    const selectedColumn = columns.find((col) => col.name === yAxis);

    return selectedColumn?.ui_config?.data_type || 'numeric';
  }, [yAxis, columns]);

  // Get formatters appropriate for the Y-axis data type
  const formatters = useFormatterOptions(yAxisDataType);

  // Preview function that uses actual formatter service
  const handlePreview = useCallback(
    (formatterType: string, value: unknown, config?: FormatterConfigData) => {
      try {
        const formatterConfig = {
          type: formatterType,
          ...config,
        };

        const { formatted } = formatValue(value, formatterConfig);

        return formatted;
      } catch {
        return String(value);
      }
    },
    [formatValue],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.chart.config.formatting.title" />
        </CardTitle>

        <CardDescription>
          <Trans i18nKey="dashboard:widgets.chart.config.formatting.description" />
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Y-Axis Formatter */}
          <div>
            <h4 className="text-xs font-medium">
              <Trans i18nKey="dashboard:widgets.chart.config.formatting.yAxisNumbers" />
            </h4>

            <p className="text-muted-foreground mb-3 text-xs">
              <Trans i18nKey="dashboard:widgets.chart.config.formatting.yAxisDescription" />
            </p>

            <FormField
              name="config.yAxisFormatterType"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <FormField
                      name="config.yAxisFormatterConfig"
                      render={({ field: configField }) => (
                        <FormatterSelect
                          value={field.value || ''}
                          onChange={field.onChange}
                          formatters={formatters}
                          dataType={yAxisDataType}
                          showPreview={true}
                          onPreview={handlePreview}
                          configValue={configField.value as FormatterConfigData}
                          onConfigChange={configField.onChange}
                          placeholder={t(
                            'dashboard:widgets.chart.config.formatting.defaultFormat',
                          )}
                        />
                      )}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChartTypeSelectorProps {
  chartTypeId: string;
}

function ChartTypeSelector({ chartTypeId }: ChartTypeSelectorProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.chart.config.whatStoryTitle" />
        </CardTitle>

        <div className="text-muted-foreground mt-2 text-xs">
          <p>
            <Trans i18nKey="dashboard:widgets.chart.config.whatStorySubtitle" />
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <FormField
          name="config.chartType"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value);
                  }}
                >
                  <SelectTrigger id={chartTypeId} className="min-h-18">
                    <SelectValue
                      placeholder={t(
                        'dashboard:widgets.chart.config.selectVisualization',
                      )}
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {CHART_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{type.icon}</span>

                            <span className="font-medium">
                              <Trans
                                i18nKey={`dashboard:widgets.chart.config.chartTypes.${type.value}.label`}
                              />
                            </span>
                          </div>

                          <span className="text-muted-foreground ml-6 text-xs">
                            <Trans
                              i18nKey={`dashboard:widgets.chart.config.chartTypes.${type.value}.description`}
                            />
                          </span>

                          <span className="text-muted-foreground ml-6 text-xs italic">
                            <Trans
                              i18nKey={`dashboard:widgets.chart.config.chartTypes.${type.value}.examples`}
                            />
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

interface AxisConfigurationProps {
  xAxisId: string;
  yAxisId: string;
  categoricalColumns: ColumnMetadata[];
  dateTimeColumns: ColumnMetadata[];
  numericColumns: ColumnMetadata[];
  chartType?: string;
}

function AxisConfiguration({
  xAxisId,
  yAxisId,
  categoricalColumns,
  dateTimeColumns,
  numericColumns,
  chartType,
}: AxisConfigurationProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.chart.config.whatDataTitle" />
        </CardTitle>
        <div className="text-muted-foreground mt-2 text-xs">
          <p>
            <Trans i18nKey="dashboard:widgets.chart.config.whatDataSubtitle" />
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <div className="flex w-full gap-x-2">
          <XAxisSelector
            xAxisId={xAxisId}
            categoricalColumns={categoricalColumns}
            dateTimeColumns={dateTimeColumns}
            chartType={chartType}
          />

          <YAxisSelector yAxisId={yAxisId} numericColumns={numericColumns} />
        </div>
      </CardContent>
    </Card>
  );
}

interface XAxisSelectorProps {
  xAxisId: string;
  categoricalColumns: ColumnMetadata[];
  dateTimeColumns: ColumnMetadata[];
  chartType?: string;
}

function XAxisSelector({
  xAxisId,
  categoricalColumns,
  dateTimeColumns,
  chartType,
}: XAxisSelectorProps) {
  const { t } = useTranslation();

  // For line and area charts, only allow date columns
  const availableColumns = useMemo(() => {
    if (chartType === 'line' || chartType === 'area') {
      return dateTimeColumns;
    }
    return [...categoricalColumns, ...dateTimeColumns];
  }, [chartType, categoricalColumns, dateTimeColumns]);

  return (
    <FormField
      name="config.xAxis"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>
            <Trans i18nKey="dashboard:widgets.chart.config.whatToCompare" />
            <span className="text-destructive ml-1">*</span>
          </FormLabel>

          <FormControl>
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id={xAxisId} className="min-h-14">
                <SelectValue
                  placeholder={
                    chartType === 'line' || chartType === 'area'
                      ? t('dashboard:widgets.chart.config.chooseTimeColumn')
                      : t(
                          'dashboard:widgets.chart.config.chooseCategoriesOrTime',
                        )
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {availableColumns.length > 0 ? (
                  availableColumns.map((column) => {
                    const isDate = dateTimeColumns.some(
                      (dt) => dt.name === column.name,
                    );
                    return (
                      <SelectItem key={column.name} value={column.name}>
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-base">
                              {isDate ? '📅' : '🏷️'}
                            </span>
                            <span className="font-medium">
                              {column.display_name || column.name}
                            </span>
                          </div>

                          <span className="text-muted-foreground ml-6 text-xs">
                            {isDate ? (
                              <Trans i18nKey="dashboard:widgets.chart.config.compareAcrossTime" />
                            ) : (
                              <Trans i18nKey="dashboard:widgets.chart.config.compareDifferentCategories" />
                            )}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })
                ) : (
                  <div className="text-muted-foreground p-4 text-center text-sm">
                    {chartType === 'line' || chartType === 'area' ? (
                      <Trans i18nKey="dashboard:widgets.chart.config.noDateColumns" />
                    ) : (
                      <Trans i18nKey="dashboard:widgets.chart.config.noColumns" />
                    )}
                  </div>
                )}
              </SelectContent>
            </Select>
          </FormControl>

          <FormDescription>
            {chartType === 'line' || chartType === 'area' ? (
              <Trans i18nKey="dashboard:widgets.chart.config.requiresDateColumn" />
            ) : (
              <Trans i18nKey="dashboard:widgets.chart.config.shownAtBottom" />
            )}
          </FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface YAxisSelectorProps {
  yAxisId: string;
  numericColumns: ColumnMetadata[];
}

function YAxisSelector({ yAxisId, numericColumns }: YAxisSelectorProps) {
  const { t } = useTranslation();

  return (
    <FormField
      name="config.yAxis"
      render={({ field }) => (
        <FormItem className="w-full">
          <FormLabel>
            <Trans i18nKey="dashboard:widgets.chart.config.whatToMeasure" />
            <span className="text-destructive ml-1">*</span>
          </FormLabel>

          <FormControl>
            <Select value={field.value || ''} onValueChange={field.onChange}>
              <SelectTrigger id={yAxisId} className="min-h-14">
                <SelectValue
                  placeholder={t(
                    'dashboard:widgets.chart.config.chooseWhatToCount',
                  )}
                />
              </SelectTrigger>

              <SelectContent>
                {/* Always available: Row Count option */}
                <SelectItem value="*">
                  <div className="flex flex-col items-start py-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-base">🔢</span>
                      <span className="font-medium">
                        <Trans i18nKey="dashboard:widgets.chart.config.countOfRecords" />
                      </span>
                      <span className="text-success ml-2 text-xs">✨</span>
                    </div>
                    <div className="text-muted-foreground ml-6 text-xs">
                      <Trans i18nKey="dashboard:widgets.chart.config.howManyItems" />
                    </div>
                  </div>
                </SelectItem>

                {/* Separator if there are numeric columns */}
                {numericColumns.length > 0 && <div className="my-1 border-t" />}

                {/* Numeric columns */}
                {numericColumns.map((column) => (
                  <SelectItem key={column.name} value={column.name}>
                    <div className="flex flex-col items-start py-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-base">💰</span>
                        <span className="font-medium">
                          {column.display_name || column.name}
                        </span>
                      </div>
                      <div className="text-muted-foreground ml-6 text-xs">
                        <Trans i18nKey="dashboard:widgets.chart.config.valuesFromField" />
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormControl>

          <FormDescription>
            <Trans i18nKey="dashboard:widgets.chart.config.shownOnLeft" />
          </FormDescription>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface AggregationAndGroupingProps {
  groupById: string;
  categoricalColumns: ColumnMetadata[];
  isXAxisDateTime: boolean;
  data: Partial<FlexibleWidgetFormData>;
}

// Basic aggregation selector for the main configuration
interface BasicAggregationSelectorProps {
  aggregationId: string;
  yAxis: string;
  numericColumns: ColumnMetadata[];
}

function BasicAggregationSelector({
  aggregationId,
  yAxis,
  numericColumns,
}: BasicAggregationSelectorProps) {
  const { t } = useTranslation();

  // Determine available aggregations based on Y-axis selection
  const availableAggregations = useMemo(() => {
    const isNumericColumn = numericColumns.some((col) => col.name === yAxis);
    const isWildcard = yAxis === '*';

    if (isWildcard) {
      // Only COUNT makes sense for wildcard
      return [
        {
          value: 'count',
          icon: '🔢',
          labelKey: 'dashboard:widgets.chart.config.calculations.count.label',
          descKey:
            'dashboard:widgets.chart.config.calculations.count.description',
          recommended: true,
        },
      ];
    }

    if (isNumericColumn) {
      // All aggregations available for numeric columns
      return [
        {
          value: 'count',
          icon: '🔢',
          labelKey: 'dashboard:widgets.chart.config.calculations.count.label',
          descKey:
            'dashboard:widgets.chart.config.calculations.count.description',
        },
        {
          value: 'sum',
          icon: '➕',
          labelKey: 'dashboard:widgets.chart.config.calculations.sum.label',
          descKey:
            'dashboard:widgets.chart.config.calculations.sum.description',
          recommended: true,
        },
        {
          value: 'avg',
          icon: '📊',
          labelKey: 'dashboard:widgets.chart.config.calculations.avg.label',
          descKey:
            'dashboard:widgets.chart.config.calculations.avg.description',
        },
        {
          value: 'min',
          icon: '📉',
          labelKey: 'dashboard:widgets.chart.config.calculations.min.label',
          descKey:
            'dashboard:widgets.chart.config.calculations.min.description',
        },
        {
          value: 'max',
          icon: '📈',
          labelKey: 'dashboard:widgets.chart.config.calculations.max.label',
          descKey:
            'dashboard:widgets.chart.config.calculations.max.description',
        },
      ];
    }

    // For non-numeric columns, only COUNT makes sense
    return [
      {
        value: 'count',
        icon: '🔢',
        labelKey: 'dashboard:widgets.chart.config.calculations.count.label',
        descKey:
          'dashboard:widgets.chart.config.calculations.count.description',
        recommended: true,
      },
    ];
  }, [yAxis, numericColumns]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.chart.config.howToCalculateTitle" />
        </CardTitle>

        <div className="text-muted-foreground mt-2 text-xs">
          <p>
            <Trans
              i18nKey="dashboard:widgets.chart.config.howToCalculateSubtitle"
              values={{
                yAxis:
                  yAxis === '*'
                    ? t('dashboard:widgets.chart.config.countOfRecords')
                    : yAxis,
              }}
            />
          </p>
        </div>
      </CardHeader>

      <CardContent>
        <FormField
          name="config.aggregation"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Select
                  value={field.value || 'count'}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id={aggregationId} className="min-h-14">
                    <SelectValue
                      placeholder={t(
                        'dashboard:widgets.chart.config.selectCalculation',
                      )}
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {availableAggregations.map((calc) => (
                      <SelectItem key={calc.value} value={calc.value}>
                        <div className="flex flex-col items-start py-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-base">{calc.icon}</span>
                            <span className="font-medium">
                              <Trans i18nKey={calc.labelKey} />
                            </span>
                            {calc.recommended && (
                              <span className="text-success ml-2 text-xs">
                                ✨{' '}
                                <Trans i18nKey="dashboard:widgets.metric.config.recommended" />
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground ml-6 text-xs">
                            <Trans i18nKey={calc.descKey} />
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>

              <FormDescription>
                <If condition={yAxis === '*'}>
                  <Trans i18nKey="dashboard:widgets.chart.config.countOnlyForAllRecords" />
                </If>
                <If condition={yAxis !== '*'}>
                  <Trans i18nKey="dashboard:widgets.chart.config.calculationHint" />
                </If>
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}

// Advanced aggregation and grouping - moved to collapsible section
function AdvancedAggregationAndGrouping({
  groupById: _groupById,
  categoricalColumns,
  isXAxisDateTime,
  data,
}: AggregationAndGroupingProps) {
  const { t } = useTranslation();

  const config = data.config as Record<string, unknown>;

  const multiSeries = config?.['multiSeries'] as
    | {
        enabled?: boolean;
        groupByColumns?: string[];
        seriesType?: string;
        maxSeries?: number;
      }
    | undefined;

  return (
    <div className="flex flex-col space-y-4">
      {/* Time Aggregation Card - only show for datetime x-axis */}
      <If condition={isXAxisDateTime}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              <Trans i18nKey="dashboard:widgets.chart.config.timeAggregation" />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <FormField
              name="config.timeAggregation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="hidden">
                    <Trans i18nKey="dashboard:widgets.chart.config.timeAggregationPeriod" />

                    <span className="text-destructive ml-1">*</span>
                  </FormLabel>

                  <FormControl>
                    <Select
                      value={field.value}
                      onValueChange={(value) => field.onChange(value)}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={t(
                            'dashboard:widgets.chart.config.selectTimeAggregation',
                          )}
                        />
                      </SelectTrigger>

                      <SelectContent>
                        {TIME_AGGREGATION_TYPES.map((agg) => (
                          <SelectItem key={agg.value} value={agg.value}>
                            <Trans i18nKey={agg.labelKey} />
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>

                  <FormDescription>
                    <Trans i18nKey="dashboard:widgets.chart.config.timeAggregationDescription" />
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </If>

      {/* Multi-Series Configuration Card */}
      {ENABLE_MULTI_SERIES && (
        <MultiSeriesConfiguration
          categoricalColumns={categoricalColumns}
          multiSeries={multiSeries}
        />
      )}

      {/* Split Data by Categories */}
      {ENABLE_GROUP_BY && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              <Trans i18nKey="dashboard:widgets.chart.config.splitDataBy" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="dashboard:widgets.chart.config.splitHint" />
            </CardDescription>
          </CardHeader>

          <CardContent>
            <FormField
              name="config.groupBy"
              render={({ field }) => {
                return (
                  <FormItem className="w-full">
                    <FormControl>
                      <Select
                        value={field.value || 'none'}
                        onValueChange={(value) => {
                          if (value === 'none') {
                            field.onChange(null);
                          } else {
                            field.onChange(value);
                          }
                        }}
                      >
                        <SelectTrigger id={_groupById} className="min-h-14">
                          <SelectValue
                            placeholder={t(
                              'dashboard:widgets.chart.config.chooseSplit',
                            )}
                          />
                        </SelectTrigger>

                        <SelectContent>
                          <SelectItem value="none">
                            <div className="flex flex-col items-start py-1">
                              <div className="flex items-center gap-2">
                                <span className="text-base">➖</span>
                                <span className="font-medium">
                                  <Trans i18nKey="dashboard:widgets.chart.config.noSplit" />
                                </span>
                              </div>

                              <div className="text-muted-foreground ml-6 text-xs">
                                <Trans i18nKey="dashboard:widgets.chart.config.showOverallTotals" />
                              </div>
                            </div>
                          </SelectItem>

                          {categoricalColumns.map((column) => (
                            <SelectItem key={column.name} value={column.name}>
                              <div className="flex flex-col items-start py-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-base">🏷️</span>
                                  <span className="font-medium">
                                    {column.display_name || column.name}
                                  </span>
                                </div>

                                <div className="text-muted-foreground ml-6 text-xs">
                                  <Trans i18nKey="dashboard:widgets.chart.config.separateBarsByCategory" />
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                );
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface MultiSeriesConfigurationProps {
  categoricalColumns: ColumnMetadata[];
  multiSeries?: {
    enabled?: boolean;
    groupByColumns?: string[];
    seriesType?: string;
    maxSeries?: number;
  };
}

function MultiSeriesConfiguration({
  categoricalColumns,
  multiSeries,
}: MultiSeriesConfigurationProps) {
  const { t } = useTranslation();

  // Only show if user wants advanced comparisons - most users won't need this
  if (!multiSeries?.enabled) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">
            <Trans i18nKey="dashboard:widgets.chart.config.enableAdvancedComparisons" />
          </CardTitle>

          <CardDescription>
            <Trans i18nKey="dashboard:widgets.chart.config.advancedComparisonsHint" />
          </CardDescription>
        </CardHeader>

        <CardContent>
          <FormField
            name="config.multiSeries.enabled"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Switch
                    checked={field.value || false}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      // Clear groupBy when disabling
                      if (!checked) {
                        // This would need form context to work properly
                      }
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    );
  }

  // Full version when enabled - with column picker
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.chart.config.enableAdvancedComparisons" />
        </CardTitle>

        <CardDescription>
          <Trans i18nKey="dashboard:widgets.chart.config.advancedComparisonsHint" />
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Disable toggle */}
        <FormField
          name="config.multiSeries.enabled"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {/* Column to group by - this is the missing piece! */}
        <FormField
          name="config.groupBy"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="dashboard:widgets.chart.config.splitDataBy" />
              </FormLabel>
              <FormControl>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select column to compare by..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categoricalColumns.map((column) => (
                      <SelectItem key={column.name} value={column.name}>
                        {column.display_name || column.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Simple series type */}
        <FormField
          name="config.multiSeries.seriesType"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="dashboard:widgets.chart.config.displayStyle" />
                </FormLabel>

                <FormControl>
                  <Select
                    value={field.value || 'grouped'}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="min-h-14">
                      <SelectValue
                        placeholder={t(
                          'dashboard:widgets.chart.config.chooseStyle',
                        )}
                      />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="grouped">
                        <div className="flex flex-col items-start py-1">
                          <span className="font-medium">
                            <Trans i18nKey="dashboard:widgets.chart.config.sideBySide" />
                          </span>

                          <span className="text-muted-foreground text-xs">
                            <Trans i18nKey="dashboard:widgets.chart.config.sideBySideHint" />
                          </span>
                        </div>
                      </SelectItem>

                      <SelectItem value="stacked">
                        <div className="flex flex-col items-start py-1">
                          <span className="font-medium">
                            <Trans i18nKey="dashboard:widgets.chart.config.stacked" />
                          </span>

                          <span className="text-muted-foreground text-xs">
                            <Trans i18nKey="dashboard:widgets.chart.config.stackedHint" />
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </CardContent>
    </Card>
  );
}

interface ChartPreviewProps {
  chartType: string;
  xAxis: string;
  yAxis: string;
  aggregation?: string;
  groupBy?: string;
  columns: ColumnMetadata[];
}

function ChartPreview({
  chartType,
  xAxis,
  yAxis,
  aggregation,
  groupBy,
  columns,
}: ChartPreviewProps) {
  const { t } = useTranslation();
  const xColumn = columns.find((col) => col.name === xAxis);
  const yColumn = columns.find((col) => col.name === yAxis);
  const groupColumn = columns.find((col) => col.name === groupBy);

  const getChartDescription = () => {
    const xLabel = xColumn?.display_name || xAxis;
    const yLabel =
      yColumn?.display_name ||
      yAxis ||
      t('dashboard:widgets.chart.config.recordCount');

    const isCount = yAxis === '*';

    let description = '';

    // Chart type specific descriptions
    switch (chartType) {
      case 'bar':
        if (isCount) {
          description = t('dashboard:widgets.chart.config.preview.barCount', {
            xLabel,
          });
        } else {
          const calc =
            aggregation === 'sum'
              ? t('dashboard:widgets.chart.config.preview.total')
              : aggregation === 'avg'
                ? t('dashboard:widgets.chart.config.preview.average')
                : aggregation === 'min'
                  ? t('dashboard:widgets.chart.config.preview.minimum')
                  : aggregation === 'max'
                    ? t('dashboard:widgets.chart.config.preview.maximum')
                    : '';
          description = t('dashboard:widgets.chart.config.preview.barValue', {
            calc,
            yLabel,
            xLabel,
          });
        }
        break;
      case 'line':
        if (isCount) {
          description = t('dashboard:widgets.chart.config.preview.lineCount', {
            xLabel,
          });
        } else {
          const calc =
            aggregation === 'sum'
              ? t('dashboard:widgets.chart.config.preview.total')
              : aggregation === 'avg'
                ? t('dashboard:widgets.chart.config.preview.average')
                : aggregation === 'min'
                  ? t('dashboard:widgets.chart.config.preview.minimum')
                  : aggregation === 'max'
                    ? t('dashboard:widgets.chart.config.preview.maximum')
                    : '';
          description = t('dashboard:widgets.chart.config.preview.lineValue', {
            calc,
            yLabel,
            xLabel,
          });
        }
        break;
      case 'area':
        if (isCount) {
          description = t('dashboard:widgets.chart.config.preview.areaCount', {
            xLabel,
          });
        } else {
          const calc =
            aggregation === 'sum'
              ? t('dashboard:widgets.chart.config.preview.total')
              : aggregation === 'avg'
                ? t('dashboard:widgets.chart.config.preview.average')
                : aggregation === 'min'
                  ? t('dashboard:widgets.chart.config.preview.minimum')
                  : aggregation === 'max'
                    ? t('dashboard:widgets.chart.config.preview.maximum')
                    : '';
          description = t('dashboard:widgets.chart.config.preview.areaValue', {
            calc,
            yLabel,
            xLabel,
          });
        }
        break;
      default:
        description = t('dashboard:widgets.chart.config.preview.default', {
          yLabel,
          xLabel,
        });
    }

    // Add grouping information
    if (groupBy && groupColumn) {
      const groupLabel = groupColumn.display_name || groupBy;
      description +=
        ' ' +
        t('dashboard:widgets.chart.config.preview.withSeries', { groupLabel });
    }

    return description;
  };

  const getExampleValue = () => {
    switch (chartType) {
      case 'bar':
        return t('dashboard:widgets.chart.config.preview.barStyle');
      case 'line':
        return t('dashboard:widgets.chart.config.preview.lineStyle');
      case 'area':
        return t('dashboard:widgets.chart.config.preview.areaStyle');
      default:
        return t('dashboard:widgets.chart.config.preview.defaultStyle');
    }
  };

  return (
    <Alert className="mb-4">
      <TrendingUp className="h-4 w-4" />

      <AlertTitle>
        <Trans i18nKey="dashboard:widgets.chart.config.thisWillShow" />
      </AlertTitle>

      <AlertDescription>
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            {getChartDescription()}
          </p>

          <p className="text-muted-foreground text-xs">
            <Trans i18nKey="dashboard:widgets.chart.config.visualStyle" />:{' '}
            {getExampleValue()}
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
