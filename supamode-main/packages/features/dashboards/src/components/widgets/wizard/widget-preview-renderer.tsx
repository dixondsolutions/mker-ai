import { useMemo } from 'react';

import { Alert, AlertDescription } from '@kit/ui/alert';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

import type {
  ChartWidgetConfig,
  MetricWidgetConfig,
  TableWidgetConfig,
  WidgetData,
} from '../../../types';
import type { PartialWidgetFormData } from '../../../types/widget-forms';
import { ChartWidget } from '../chart-widget';
import { MetricWidget } from '../metric-widget';
import { TableWidget } from '../table-widget';

interface WidgetPreviewRendererProps {
  data: PartialWidgetFormData;
  widgetData: WidgetData | null;
  isLoading?: boolean;
  error?: string | null;
  className?: string;
}

/**
 * Reusable widget preview renderer that accepts data through props
 * This component handles the rendering logic for different widget types
 * and can be used both in the creation wizard and other preview contexts
 */
export function WidgetPreviewRenderer({
  data,
  widgetData,
  isLoading = false,
  error = null,
  className,
}: WidgetPreviewRendererProps) {
  // Show loading state
  if (isLoading) {
    return (
      <div
        className={`flex h-64 items-center justify-center ${className || ''}`}
      >
        <div className="flex items-center gap-2">
          <Spinner className="h-4 w-4" />

          <span className="text-muted-foreground text-sm">
            <Trans i18nKey="dashboard:widgetContainer.loading" />
          </span>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div
        className={`flex h-64 items-center justify-center p-4 ${className || ''}`}
      >
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show message if no data source configured
  if (!data.schemaName || !data.tableName) {
    return (
      <div
        className={`text-muted-foreground flex h-64 items-center justify-center ${className || ''}`}
      >
        <div className="text-center">
          <p>
            <Trans i18nKey="dashboard:filters.configureDataSourceFirst" />
          </p>
          <p className="mt-1 text-xs">
            <Trans i18nKey="dashboard:filters.configureDataSourceHelp" />
          </p>
        </div>
      </div>
    );
  }

  // Show message if no widget data available
  if (!widgetData) {
    return (
      <div
        className={`text-muted-foreground flex h-64 items-center justify-center ${className || ''}`}
      >
        <div className="text-center">
          <p>
            <Trans i18nKey="dashboard:wizard.dataConfig.noDataPreview" />
          </p>
        </div>
      </div>
    );
  }

  // Show data error if present in metadata
  if (
    widgetData.metadata &&
    'error' in widgetData.metadata &&
    widgetData.metadata['error']
  ) {
    return (
      <div
        className={`flex h-64 items-center justify-center p-4 ${className || ''}`}
      >
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            {String(widgetData.metadata['error'])}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Render the appropriate widget type
  switch (data.type) {
    case 'chart': {
      // Ensure we have a valid config with defaults
      const chartConfig: ChartWidgetConfig = {
        chartType: 'bar', // Default chart type
        showLegend: true,
        showGrid: true,
        ...(data.config || {}), // Override with user config if available
      };

      return (
        <ChartWidget
          data={widgetData}
          config={chartConfig}
          isEditing={false}
          className={className || 'h-64'}
        />
      );
    }

    case 'metric': {
      const metricConfig: MetricWidgetConfig = {
        metric: 'count', // Default metric
        aggregation: 'count',
        ...(data.config || {}),
      };

      return (
        <MetricWidget
          data={widgetData}
          config={metricConfig}
          isEditing={false}
          className={className || 'h-64'}
        />
      );
    }

    case 'table': {
      const tableConfig: TableWidgetConfig = {
        columns: [],
        showSearch: true,
        showPagination: true,
        pageSize: 10,
        ...(data.config || {}),
      };

      return (
        <TableWidget
          data={widgetData}
          config={tableConfig}
          isEditing={false}
          className={className || 'h-64'}
          currentPage={1}
          currentSearch=""
          onPaginationChange={() => {}}
          onSearchChange={() => {}}
        />
      );
    }

    default:
      return (
        <div
          className={`text-muted-foreground flex h-64 items-center justify-center ${className || ''}`}
        >
          <div className="text-center">
            <p>
              <Trans i18nKey="dashboard:wizard.preview.unknownWidgetType" />
            </p>
          </div>
        </div>
      );
  }
}

/**
 * Hook to extract widget configuration in a consistent way
 */
export function useWidgetConfig(data: PartialWidgetFormData) {
  return useMemo(() => {
    const getChartConfig = () =>
      data.type === 'chart'
        ? (data.config as ChartWidgetConfig | undefined)
        : undefined;

    const getMetricConfig = () =>
      data.type === 'metric'
        ? (data.config as MetricWidgetConfig | undefined)
        : undefined;

    const getTableConfig = () =>
      data.type === 'table'
        ? (data.config as TableWidgetConfig | undefined)
        : undefined;

    return { getChartConfig, getMetricConfig, getTableConfig };
  }, [data.type, data.config]);
}
