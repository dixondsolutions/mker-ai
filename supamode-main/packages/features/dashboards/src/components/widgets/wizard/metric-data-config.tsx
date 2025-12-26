import { useCallback, useId, useMemo, useState } from 'react';

import { useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { type FilterItem, type FilterValue } from '@kit/filters';
import { AddFilterDropdown, FiltersList } from '@kit/filters/components';
import { formatValue } from '@kit/formatters';
import {
  FormatterConfigData,
  FormatterSelect,
  useFormatterOptions,
} from '@kit/formatters/components';
import type { ColumnMetadata } from '@kit/types';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
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

import { adaptFiltersForQuery } from '../../../lib/filters/dashboard-filter-adapter';
import { createDashboardDisplayService } from '../../../lib/filters/dashboard-services';
import type { AdvancedFilterCondition } from '../../../types';
import type { FlexibleWidgetFormData } from '../../../types/widget-forms';
import { MetricPreview } from './metric-preview';

type TrendConditions = AdvancedFilterCondition<{
  isTrendFilter: true;
}>;

interface MetricDataConfigProps {
  data: Partial<FlexibleWidgetFormData>;
  columns: ColumnMetadata[];
}

export function MetricDataConfig({ data, columns }: MetricDataConfigProps) {
  const aggregationId = useId();
  const metricId = useId();

  const { numericColumns } = useMemo(() => {
    const numeric = columns.filter((col) =>
      [
        'integer',
        'bigint',
        'numeric',
        'real',
        'double precision',
        'decimal',
      ].includes(col.ui_config?.data_type || ''),
    );

    return {
      numericColumns: numeric,
    };
  }, [columns]);

  const config = data.config as Record<string, unknown>;
  const aggregation = config?.['aggregation'] as string;
  const metric = config?.['metric'] as string;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          <Trans i18nKey="dashboard:widgets.metric.config.title" />
        </CardTitle>

        <div className="text-muted-foreground mt-2 space-y-1 text-xs">
          <p>
            <Trans i18nKey="dashboard:widgets.metric.config.explanation" />
          </p>

          <p>
            <Trans i18nKey="dashboard:widgets.metric.config.examplesTitle" />
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {/* Preview of what this metric will show */}
        <If
          condition={Boolean(
            aggregation && (aggregation === 'count' || metric),
          )}
        >
          <MetricPreview
            metric={metric}
            aggregation={aggregation}
            columns={columns}
            trendPeriod={config?.['trendPeriod'] as number}
          />
        </If>

        <div className="space-y-6">
          {/* What to Calculate */}
          <AggregationMethodSelector
            aggregationId={aggregationId}
            numericColumns={numericColumns}
          />

          {/* Which Column (only for non-count) */}
          <If condition={Boolean(aggregation && aggregation !== 'count')}>
            <MetricColumnSelector
              metricId={metricId}
              numericColumns={numericColumns}
              aggregation={aggregation}
            />
          </If>

          {/* Hidden field to set metric to "*" for count operations */}
          <If condition={aggregation === 'count'}>
            <FormField
              name="config.metric"
              render={({ field }) => {
                // Auto-set to "*" for count operations
                if (field.value !== '*') {
                  field.onChange('*');
                }

                return <div style={{ display: 'none' }} />;
              }}
            />
          </If>

          {/* Trend Analysis - Simple checkbox when aggregation is set */}
          <If condition={Boolean(aggregation)}>
            <TrendComparison columns={columns} />
          </If>

          {/* Formatter Selection */}
          <If condition={Boolean(aggregation)}>
            <FormatterSelector
              metric={metric}
              aggregation={aggregation}
              columns={columns}
            />
          </If>
        </div>
      </CardContent>
    </Card>
  );
}

interface FormatterSelectorProps {
  metric?: string;
  aggregation?: string;
  columns: ColumnMetadata[];
}

function FormatterSelector({
  metric,
  aggregation,
  columns,
}: FormatterSelectorProps) {
  const { t } = useTranslation();

  // Get the data type of the selected metric column
  const selectedColumn = useMemo(() => {
    if (aggregation === 'count' || !metric) {
      return null;
    }

    return columns.find((col) => col.name === metric);
  }, [metric, aggregation, columns]);

  // Determine data type for formatter options
  const dataType = useMemo(() => {
    if (aggregation === 'count') {
      return 'integer'; // Count always returns integer
    }

    if (selectedColumn) {
      return selectedColumn.ui_config?.data_type || 'unknown';
    }

    return 'numeric'; // Default fallback
  }, [aggregation, selectedColumn]);

  // Get appropriate formatters for the data type
  const formatters = useFormatterOptions(dataType);

  // Preview function that uses actual formatter service
  const handlePreview = useCallback(
    (formatterType: string, value: unknown, config?: FormatterConfigData) => {
      try {
        const formatterConfig = {
          type: formatterType,
          ...config,
        };

        return formatValue(value, formatterConfig);
      } catch {
        return String(value);
      }
    },
    [],
  );

  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-2 text-sm font-medium">
          <Trans i18nKey="dashboard:widgets.metric.config.formatting.question" />
        </h4>

        <p className="text-muted-foreground text-xs">
          <Trans i18nKey="dashboard:widgets.metric.config.formatting.description" />
        </p>
      </div>

      <FormField
        name="config.formatterType"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <FormField
                name="config.formatterConfig"
                render={({ field: configField }) => (
                  <FormatterSelect
                    value={field.value || ''}
                    onChange={field.onChange}
                    formatters={formatters}
                    dataType={dataType}
                    showPreview={true}
                    onPreview={handlePreview}
                    configValue={configField.value as FormatterConfigData}
                    onConfigChange={configField.onChange}
                    showConfiguration={true}
                    placeholder={t(
                      'dashboard:widgets.metric.config.formatting.placeholder',
                    )}
                  />
                )}
              />
            </FormControl>

            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface MetricColumnSelectorProps {
  metricId: string;
  numericColumns: ColumnMetadata[];
  aggregation?: string;
}

function MetricColumnSelector({
  metricId,
  numericColumns,
  aggregation,
}: MetricColumnSelectorProps) {
  // Helper to get field type info based on data type only
  const { t } = useTranslation();

  const getFieldTypeInfo = (column: ColumnMetadata) => {
    const dataType = column.ui_config?.data_type || 'unknown';

    if (
      [
        'integer',
        'bigint',
        'numeric',
        'real',
        'double precision',
        'decimal',
      ].includes(dataType)
    ) {
      return {
        icon: '💰',
        hint: `${dataType} field`,
      };
    }

    return { icon: '📊', hint: dataType };
  };

  const getActionText = () => {
    switch (aggregation) {
      case 'sum':
        return t('dashboard:wizard.metric.addUpValuesFrom');
      case 'avg':
        return t('dashboard:wizard.metric.calculateAverageOf');
      case 'min':
        return t('dashboard:wizard.metric.findMinimum');
      case 'max':
        return t('dashboard:wizard.metric.findMaximum');
      default:
        return t('dashboard:wizard.metric.selectColumn');
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-2 text-sm font-medium">
          <Trans i18nKey="dashboard:wizard.metric.whichColumn" />
        </h4>

        <p className="text-muted-foreground text-xs">
          {getActionText()}{' '}
          <Trans i18nKey="dashboard:wizard.metric.whichNumeric" />
        </p>
      </div>

      <FormField
        name="config.metric"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Select value={field.value || ''} onValueChange={field.onChange}>
                <SelectTrigger
                  id={metricId}
                  className="min-h-14"
                  data-testid="metric-column-select"
                >
                  <SelectValue
                    placeholder={t(
                      'dashboard:wizard.metric.selectNumericColumn',
                    )}
                  />
                </SelectTrigger>

                <SelectContent>
                  {numericColumns.map((column) => {
                    const fieldInfo = getFieldTypeInfo(column);

                    return (
                      <SelectItem
                        key={column.name}
                        value={column.name}
                        data-testid={`column-option-${column.name}`}
                      >
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{fieldInfo.icon}</span>

                            <span className="font-medium">
                              {column.display_name || column.name}
                            </span>
                          </div>

                          <span className="text-muted-foreground ml-6 text-xs">
                            {fieldInfo.hint}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </FormControl>

            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface AggregationMethodSelectorProps {
  aggregationId: string;
  numericColumns: ColumnMetadata[];
}

function AggregationMethodSelector({
  aggregationId,
  numericColumns,
}: AggregationMethodSelectorProps) {
  const hasNumericColumns = numericColumns.length > 0;

  const { t: t2 } = useTranslation();

  const CALCULATION_OPTIONS = [
    {
      value: 'count',
      icon: '🔢',
      label: t2('dashboard:wizard.metric.calc.count.label'),
      description: t2('dashboard:wizard.metric.calc.count.description'),
    },
    {
      value: 'sum',
      icon: '➕',
      label: t2('dashboard:wizard.metric.calc.sum.label'),
      description: t2('dashboard:wizard.metric.calc.sum.description'),
      requiresNumeric: true,
    },
    {
      value: 'avg',
      icon: '📊',
      label: t2('dashboard:wizard.metric.calc.avg.label'),
      description: t2('dashboard:wizard.metric.calc.avg.description'),
      requiresNumeric: true,
    },
    {
      value: 'min',
      icon: '📉',
      label: t2('dashboard:wizard.metric.calc.min.label'),
      description: t2('dashboard:wizard.metric.calc.min.description'),
      requiresNumeric: true,
    },
    {
      value: 'max',
      icon: '📈',
      label: t2('dashboard:wizard.metric.calc.max.label'),
      description: t2('dashboard:wizard.metric.calc.max.description'),
      requiresNumeric: true,
    },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h4 className="mb-2 text-sm font-medium">
          <Trans i18nKey="dashboard:wizard.metric.whatToCalculate" />
        </h4>
        <p className="text-muted-foreground text-xs">
          <Trans i18nKey="dashboard:wizard.metric.chooseWhatToMeasure" />
        </p>
      </div>

      <FormField
        name="config.aggregation"
        render={({ field }) => {
          return (
            <FormItem>
              <FormControl>
                <Select
                  value={field.value || ''}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id={aggregationId}
                    className="min-h-14"
                    data-testid="metric-aggregation-select"
                  >
                    <SelectValue
                      placeholder={t2(
                        'dashboard:wizard.metric.selectWhatToCalculate',
                      )}
                    />
                  </SelectTrigger>

                  <SelectContent>
                    {CALCULATION_OPTIONS.map((option) => {
                      // Hide numeric options if no numeric columns available
                      if (option.requiresNumeric && !hasNumericColumns) {
                        return null;
                      }

                      return (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          data-testid={`aggregation-option-${option.value}`}
                        >
                          <div className="flex flex-col items-start">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{option.icon}</span>

                              <span className="font-medium">
                                {option.label}
                              </span>

                              {!option.requiresNumeric && (
                                <span className="text-xs">✨</span>
                              )}
                            </div>

                            <span className="text-muted-foreground ml-6 text-xs">
                              {option.description}
                            </span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FormControl>

              <FormMessage />
            </FormItem>
          );
        }}
      />
    </div>
  );
}

function TrendComparison({ columns }: { columns: ColumnMetadata[] }) {
  const { control } = useFormContext();

  const showTrend = useWatch({
    control,
    name: 'config.showTrend',
  });

  // Filter to only date/timestamp columns
  const dateColumns = useMemo(() => {
    return columns.filter((col) =>
      [
        'timestamp',
        'timestamptz',
        'timestamp with time zone',
        'date',
        'time',
        'timetz',
        'datetime',
      ].includes(col.ui_config?.data_type?.toLowerCase() || ''),
    );
  }, [columns]);

  return (
    <div className="space-y-4">
      <FormField
        name="config.showTrend"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans i18nKey="dashboard:widgets.metric.config.enableTrendComparison" />
            </FormLabel>

            <FormControl>
              <Switch
                checked={field.value || false}
                onCheckedChange={field.onChange}
                data-testid="trend-analysis-switch"
              />
            </FormControl>

            <FormDescription>
              <Trans i18nKey="dashboard:widgets.metric.config.trendComparisonDescription" />
            </FormDescription>

            <FormMessage />
          </FormItem>
        )}
      />

      {showTrend && (
        <div className="space-y-4">
          <FormField
            name="config.trendDirection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="dashboard:widgets.metric.config.trendDirection" />
                </FormLabel>

                <FormControl>
                  <Select
                    value={field.value || 'positive'}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger data-testid="trend-direction-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">
                        <div className="flex items-center gap-2">
                          <span className="text-green-600">↑</span>
                          <span>
                            <Trans i18nKey="dashboard:widgets.metric.config.higherIsBetter" />
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="negative">
                        <div className="flex items-center gap-2">
                          <span className="text-red-600">↓</span>
                          <span>
                            <Trans i18nKey="dashboard:widgets.metric.config.lowerIsBetter" />
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl>

                <FormDescription>
                  <Trans i18nKey="dashboard:widgets.metric.config.trendDirectionDescription" />
                </FormDescription>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="config.filters"
            render={({ field }) => {
              return (
                <FormItem>
                  <FormControl>
                    <TrendDateFilter
                      dateColumns={dateColumns}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}

function TrendDateFilter({
  dateColumns,
  value,
  onChange,
}: {
  dateColumns: ColumnMetadata[];
  value: TrendConditions[];
  onChange: (value: TrendConditions[]) => void;
}) {
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [openFilterName, setOpenFilterName] = useState<string | null>(null);

  const displayService = useMemo(() => {
    return createDashboardDisplayService();
  }, []);

  // Convert form filters to FilterItem format for display (only show trend filters)
  const filters = useMemo(() => {
    const trendFilters = value.filter(
      (filter: TrendConditions) => filter.config?.isTrendFilter === true,
    );

    return adaptFiltersForQuery(trendFilters, dateColumns, []);
  }, [value, dateColumns]);

  // Check if there's already a marked trend filter (to hide add button)
  const hasActiveTrendFilter = useMemo(() => {
    return value.some(
      (filter: TrendConditions) => filter.config?.isTrendFilter === true,
    );
  }, [value]);

  // Handle adding a new filter (only allow one trend filter)
  const handleAddFilter = useCallback(
    (column: ColumnMetadata) => {
      if (hasActiveTrendFilter) {
        return;
      }

      const newAdvancedFilter: TrendConditions = {
        column: column.name,
        operator: 'between',
        value: '',
        config: {
          isTrendFilter: true,
        },
      };

      const newAdvancedFilters = [...value, newAdvancedFilter];

      onChange(newAdvancedFilters);

      setOpenFilterName(column.name);
      setAddFilterOpen(false);
    },
    [value, onChange, hasActiveTrendFilter],
  );

  // Handle removing a filter
  const handleRemoveFilter = useCallback(
    (column: ColumnMetadata) => {
      const newAdvancedFilters = value.filter(
        (f: { column: string }) => f.column !== column.name,
      );

      onChange(newAdvancedFilters);
    },
    [value, onChange],
  );

  // Handle updating filter values
  const handleUpdateFilterValue = useCallback(
    (
      column: ColumnMetadata,
      filterValue: FilterValue,
      shouldClose?: boolean,
    ) => {
      const newAdvancedFilters = value.map(
        (filter: AdvancedFilterCondition) => {
          if (filter.column === column.name) {
            return {
              ...filter,
              operator: filterValue.operator,
              value: filterValue.value,
            };
          }
          return filter;
        },
      );

      onChange(newAdvancedFilters as TrendConditions[]);

      if (shouldClose) {
        setOpenFilterName(null);
      }
    },
    [value, onChange],
  );

  // Handle filter changes (operator changes, etc.)
  const handleFilterChange = useCallback(
    (updatedFilter: FilterItem) => {
      const newAdvancedFilters = value.map(
        (filter: AdvancedFilterCondition) => {
          if (filter.column === updatedFilter.name) {
            return {
              ...filter,
              operator: updatedFilter.values[0]?.operator,
              value: updatedFilter.values[0]?.value,
            };
          }

          return filter;
        },
      );

      onChange(newAdvancedFilters as TrendConditions[]);
    },
    [value, onChange],
  );

  // Handle clearing all trend filters
  const handleClearFilters = useCallback(() => {
    // preserve filters out of scope
    const nonTrendFilters = value.filter((f) => !f.config?.isTrendFilter);

    onChange(nonTrendFilters);
  }, [value, onChange]);

  // Handle opening/closing filter editors
  const handleOpenChange = useCallback(
    (filterName: string, isOpen: boolean) => {
      if (isOpen) {
        setOpenFilterName(filterName);
      } else {
        setOpenFilterName(null);
      }
    },
    [],
  );

  if (dateColumns.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          <Trans i18nKey="dashboard:widgets.metric.config.noDateColumnsAvailable" />
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <h4 className="text-xs font-medium">
          <Trans i18nKey="dashboard:widgets.metric.config.dateFilterRequired" />
        </h4>

        <p className="text-muted-foreground text-xs">
          <Trans i18nKey="dashboard:widgets.metric.config.dateFilterRequiredDescription" />
        </p>
      </div>

      <div className="space-y-3">
        <If condition={!hasActiveTrendFilter}>
          <div className="flex justify-start gap-x-2.5">
            <AddFilterDropdown
              columns={dateColumns}
              onSelect={handleAddFilter}
              open={addFilterOpen}
              onOpenChange={setAddFilterOpen}
            />
          </div>
        </If>

        <If condition={filters.length > 0}>
          <FiltersList
            filters={filters}
            onRemove={handleRemoveFilter}
            onValueChange={handleUpdateFilterValue}
            onOpenChange={handleOpenChange}
            onClearFilters={handleClearFilters}
            onFilterChange={handleFilterChange}
            // @ts-expect-error - no need for tableDataLoader
            tableDataLoader={() => ({})}
            openFilterName={openFilterName}
            displayService={displayService}
          />
        </If>
      </div>
    </div>
  );
}
