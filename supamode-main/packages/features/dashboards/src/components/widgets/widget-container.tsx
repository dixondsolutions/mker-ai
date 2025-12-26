import { useCallback, useState } from 'react';

import { Card, CardContent, CardHeader } from '@kit/ui/card';
import { cn } from '@kit/ui/utils';

import { useWidgetData } from '../../hooks/use-widget-data';
import { getRefreshInterval } from '../../lib/widget-utils';
import type {
  DashboardWidget,
  WidgetData,
  WidgetOptionsByType,
} from '../../types';
import { hasWidgetOptions } from '../../types';
import { WidgetErrorBoundary } from '../error-boundaries/widget-error-boundary';
import { WidgetContent } from './widget-content';
import { WidgetHeader } from './widget-header';

interface WidgetContainerProps {
  widget: DashboardWidget;
  dashboardId: string;
  isEditing?: boolean;
  className?: string;
}

export function WidgetContainer({
  widget,
  dashboardId,
  isEditing,
  className,
}: WidgetContainerProps) {
  // Generic widget options - only initialize if widget supports options
  const [options, setOptions] = useState<
    WidgetOptionsByType[keyof WidgetOptionsByType] | undefined
  >(() => {
    if (!hasWidgetOptions(widget.widget_type)) {
      return;
    }

    // Initialize with default options for supported widget types
    switch (widget.widget_type) {
      case 'table': {
        const config = widget.config as {
          pageSize?: number;
          sortBy?: string;
          sortDirection?: 'asc' | 'desc';
        };

        return {
          pagination: { page: 1, pageSize: config?.pageSize || 10 },
          search: { query: '' },
          sorting: config?.sortBy
            ? {
                column: config.sortBy,
                direction: config.sortDirection || 'asc',
              }
            : undefined,
        };
      }

      default:
        return {};
    }
  });

  const {
    data: widgetResponse,
    isLoading,
    isPending,
    isError,
    error,
    isRefreshing,
    handleRefresh,
  } = useWidgetData(widget, options);

  const widgetData = widgetResponse?.data;
  const relations = widgetResponse?.relations;

  // Generic options change handler
  const handleOptionsChange = useCallback(
    (newOptions: Partial<WidgetOptionsByType[keyof WidgetOptionsByType]>) => {
      setOptions((prev) => ({ ...prev, ...newOptions }));
    },
    [],
  );

  const lastUpdated = widgetData?.['metadata']?.lastUpdated;
  const refreshInterval = getRefreshInterval(widget);

  return (
    <Card
      className={cn(
        'widget-container group/widget flex h-full flex-col rounded-lg',
        className,
      )}
      data-testid="widget-container"
      data-widget-id={widget.id}
      data-widget-title={widget.title}
    >
      <WidgetErrorBoundary
        widgetId={widget.id}
        widgetTitle={widget.title}
        onRetry={handleRefresh}
      >
        <CardHeader className="flex-none px-4 py-2.5">
          <WidgetHeader
            dashboardId={dashboardId}
            widget={widget}
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            refreshInterval={refreshInterval}
            lastUpdated={lastUpdated}
            onRefresh={handleRefresh}
            isEditing={isEditing}
          />
        </CardHeader>

        <CardContent
          className="flex-1 overflow-hidden p-2 pt-0"
          data-testid="widget-content"
        >
          <WidgetContent
            widget={widget}
            data={widgetData as WidgetData}
            relations={relations}
            isLoading={isPending}
            isError={isError}
            error={error}
            onOptionsChange={
              hasWidgetOptions(widget.widget_type)
                ? handleOptionsChange
                : undefined
            }
            options={options}
          />
        </CardContent>
      </WidgetErrorBoundary>
    </Card>
  );
}
