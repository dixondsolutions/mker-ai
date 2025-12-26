import { useMemo } from 'react';

import { RefreshCwIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { useWidgetPreviewData } from '../../../hooks/use-widget-preview-data';
import type { PartialWidgetFormData } from '../../../types/widget-forms';
import { useWidgetConfig } from './widget-preview-renderer';
import { WidgetPreviewRenderer } from './widget-preview-renderer';

interface PreviewHeaderProps {
  data: PartialWidgetFormData;
  hasRealData: boolean;
  isLoading: boolean;
  onRefresh: () => void;
}

function PreviewHeader({
  data,
  hasRealData,
  isLoading,
  onRefresh,
}: PreviewHeaderProps) {
  const { t } = useTranslation();

  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <span>
          <Trans i18nKey="dashboard:wizard.preview.widgetPreview" />
        </span>

        <Badge variant="outline" className="text-xs">
          {data.type || t('dashboard:wizard.preview.unknownWidgetType')}
        </Badge>

        <If condition={hasRealData}>
          <Badge variant="secondary" className="text-xs">
            <Trans i18nKey="dashboard:wizard.preview.liveData" />
          </Badge>
        </If>

        <If condition={data.schemaName && data.tableName}>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="ml-auto h-6 w-6 p-0"
          >
            <RefreshCwIcon
              className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`}
            />
          </Button>
        </If>
      </CardTitle>
    </CardHeader>
  );
}

interface ConfigurationSummaryProps {
  data: PartialWidgetFormData;
}

function ConfigurationSummary({ data }: ConfigurationSummaryProps) {
  const { t } = useTranslation();

  const { getChartConfig, getMetricConfig, getTableConfig } =
    useWidgetConfig(data);

  const currentFilters = useMemo(
    () => data.config?.filters || [],
    [data.config?.filters],
  );

  const chartConfig = getChartConfig();
  const metricConfig = getMetricConfig();
  const tableConfig = getTableConfig();

  const widgetName = data.title || t('dashboard:wizard.preview.notSet');
  const widgetType = data.type || t('dashboard:wizard.preview.notSelected');

  const schemaName =
    data.schemaName || t('dashboard:wizard.preview.notSelected');

  const tableName = data.tableName || t('dashboard:wizard.preview.notSelected');
  const activeFiltersCount = currentFilters.length;

  const chartType =
    chartConfig?.chartType || t('dashboard:wizard.preview.notSet');

  // Chart axes are stored in unified config
  const chartQueryConfig =
    data.type === 'chart'
      ? (data.config as {
          xAxis?: string;
          yAxis?: string;
          aggregation?: string;
          timeAggregation?: string;
          multiSeries?: {
            enabled?: boolean;
            groupByColumns?: string[];
            seriesType?: string;
          };
        })
      : undefined;

  const xAxis = chartQueryConfig?.xAxis || t('dashboard:wizard.preview.notSet');
  const yAxis = chartQueryConfig?.yAxis || t('dashboard:wizard.preview.notSet');
  const chartAggregation = chartQueryConfig?.aggregation || 'count';
  const timeAggregation = chartQueryConfig?.timeAggregation;
  const multiSeries = chartQueryConfig?.multiSeries;

  const metricSource =
    metricConfig?.metric || t('dashboard:wizard.preview.notSet');

  const metricAggregation = metricConfig?.aggregation || 'count';
  const hasTrend = Boolean(metricConfig?.showTrend);

  const selectedColumnsCount = tableConfig?.columns?.length || 0;
  const sortByColumn = tableConfig?.sortBy;
  const sortDirection = tableConfig?.sortDirection || 'asc';
  const pageSize = tableConfig?.pageSize || 25;

  const searchStatus =
    tableConfig?.showSearch !== false
      ? t('dashboard:wizard.preview.status.enabled')
      : t('dashboard:wizard.preview.status.disabled');

  return (
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-medium">
            <Trans i18nKey="dashboard:wizard.preview.basicInformation" />
          </h4>

          <div className="text-muted-foreground space-y-1 text-sm">
            <div>
              <strong>
                <Trans i18nKey="dashboard:wizard.preview.labels.name" />:
              </strong>{' '}
              {widgetName}
            </div>
            <div>
              <strong>
                <Trans i18nKey="dashboard:wizard.preview.labels.type" />:
              </strong>{' '}
              {widgetType}
            </div>

            <If condition={data.description}>
              <div>
                <strong>
                  <Trans i18nKey="dashboard:wizard.preview.labels.description" />
                  :
                </strong>{' '}
                {data.description}
              </div>
            </If>
          </div>
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium">
            <Trans i18nKey="dashboard:wizard.dataConfig.dataSource" />
          </h4>

          <div className="text-muted-foreground space-y-1 text-sm">
            <div>
              <strong>
                <Trans i18nKey="dashboard:wizard.preview.labels.schema" />:
              </strong>{' '}
              {schemaName}
            </div>

            <div>
              <strong>
                <Trans i18nKey="dashboard:wizard.preview.labels.table" />:
              </strong>{' '}
              {tableName}
            </div>

            <div>
              <strong>
                <Trans i18nKey="dashboard:wizard.preview.labels.filters" />:
              </strong>{' '}
              {activeFiltersCount}{' '}
              <Trans i18nKey="dashboard:wizard.preview.labels.active" />
            </div>
          </div>
        </div>
      </div>

      <If condition={data.config && Object.keys(data.config).length > 0}>
        <div>
          <h4 className="mb-2 text-sm font-medium">
            <Trans i18nKey="dashboard:wizard.preview.widgetConfiguration" />
          </h4>

          <div className="text-muted-foreground space-y-1 text-sm">
            <If condition={data.type === 'chart'}>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.chartType" />
                    :
                  </strong>{' '}
                  {chartType}
                </div>
                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.xAxis" />:
                  </strong>{' '}
                  {xAxis}
                </div>
                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.yAxis" />:
                  </strong>{' '}
                  {yAxis}
                </div>
                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.aggregation" />
                    :
                  </strong>{' '}
                  {chartAggregation}
                </div>

                {/* Time series configuration */}
                <If condition={Boolean(timeAggregation)}>
                  <div>
                    <strong>
                      <Trans i18nKey="dashboard:wizard.preview.labels.timeAggregation" />
                      :
                    </strong>{' '}
                    {timeAggregation
                      ? t(`dashboard:timeAggregations.${timeAggregation}`)
                      : ''}
                  </div>
                </If>

                {/* Multi-series configuration */}
                <If condition={Boolean(multiSeries?.enabled)}>
                  <div>
                    <strong>
                      <Trans i18nKey="dashboard:wizard.preview.labels.multiSeries" />
                      :
                    </strong>{' '}
                    {multiSeries?.seriesType
                      ? t(`dashboard:seriesTypes.${multiSeries.seriesType}`)
                      : t('dashboard:seriesTypes.grouped')}
                  </div>
                </If>
                <If
                  condition={Boolean(
                    multiSeries?.enabled && multiSeries?.groupByColumns?.length,
                  )}
                >
                  <div>
                    <strong>
                      <Trans i18nKey="dashboard:wizard.preview.labels.groupByColumn" />
                      :
                    </strong>{' '}
                    {multiSeries?.groupByColumns?.join(', ')}
                  </div>
                </If>
              </div>
            </If>

            <If condition={data.type === 'metric'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.metric" />:
                  </strong>{' '}
                  {metricSource}
                </div>
                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.calculation" />
                    :
                  </strong>{' '}
                  {metricAggregation}
                </div>
                <If condition={hasTrend}>
                  <div>
                    <strong>
                      <Trans i18nKey="dashboard:wizard.preview.labels.trendComparison" />
                      :
                    </strong>{' '}
                    <Trans i18nKey="dashboard:wizard.preview.enabled" />
                  </div>
                </If>
              </div>
            </If>

            <If condition={data.type === 'table'}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.columns" />:
                  </strong>{' '}
                  {selectedColumnsCount}{' '}
                  <Trans i18nKey="dashboard:wizard.preview.labels.selected" />
                </div>

                <If condition={Boolean(sortByColumn)}>
                  <div>
                    <strong>
                      <Trans i18nKey="dashboard:wizard.preview.labels.sortBy" />
                      :
                    </strong>{' '}
                    {sortByColumn} ({sortDirection})
                  </div>
                </If>

                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.pageSize" />
                    :
                  </strong>{' '}
                  {pageSize}{' '}
                  <Trans i18nKey="dashboard:wizard.preview.labels.rows" />
                </div>

                <div>
                  <strong>
                    <Trans i18nKey="dashboard:wizard.preview.labels.search" />:
                  </strong>{' '}
                  {searchStatus}
                </div>
              </div>
            </If>
          </div>
        </div>
      </If>
    </CardContent>
  );
}

type CreateWidgetPreviewProps = {
  id?: string;
  data: PartialWidgetFormData;
  onSubmit: () => void;
};

export function CreateWidgetPreview({
  id,
  data,
  onSubmit,
}: CreateWidgetPreviewProps) {
  // Load preview data using the new hook
  const {
    data: previewData,
    isLoading,
    error,
    hasRealData,
    refresh,
  } = useWidgetPreviewData(data);

  return (
    <div className="flex w-full flex-col space-y-8">
      <div>
        <form
          className="flex flex-col gap-y-4"
          id={id}
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();

            onSubmit();
          }}
        >
          <Card className="max-w-full" data-testid="widget-preview-container">
            <PreviewHeader
              data={data}
              hasRealData={hasRealData}
              isLoading={isLoading}
              onRefresh={refresh}
            />

            <CardContent className="overflow-y-auto">
              <div data-testid="widget-preview-data">
                <WidgetPreviewRenderer
                  data={data}
                  widgetData={previewData}
                  isLoading={isLoading}
                  error={error}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="pt-5">
            <ConfigurationSummary data={data} />
          </Card>
        </form>
      </div>
    </div>
  );
}
