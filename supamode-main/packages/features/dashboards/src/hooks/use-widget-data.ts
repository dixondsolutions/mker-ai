import { useCallback, useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { widgetDataLoader } from '../api/loaders/bridge-loaders';
import { getRefreshInterval } from '../lib/widget-utils';
import type { DashboardWidget, WidgetOptionsByType } from '../types';
import { useWidgetCacheManager } from './use-widget-cache-manager';

/**
 * @param widget - The widget to fetch data for
 * @param options - The options for the widget
 * @returns The widget data
 */
export function useWidgetData(
  widget: DashboardWidget,
  options?: WidgetOptionsByType[keyof WidgetOptionsByType],
) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { invalidateWidget, forceRefetchWidget } = useWidgetCacheManager();

  // Create stable query key from primitive values only
  const queryKey = useMemo(() => {
    const typedOptions = options as {
      pagination?: { page: number; pageSize: number };
      search?: { query: string; columns?: string[] };
      sorting?: { column: string; direction: 'asc' | 'desc' };
    };

    return [
      'widget-data',
      widget.id,
      // Extract primitive values for stable key
      typedOptions?.pagination?.page,
      typedOptions?.pagination?.pageSize,
      typedOptions?.search?.query,
      typedOptions?.sorting?.column,
      typedOptions?.sorting?.direction,
    ] as const;
  }, [widget.id, options]);

  const refetchInterval = getRefreshInterval(widget);

  const query = useQuery({
    queryKey,
    queryFn: async ({ queryKey }) => {
      const [
        ,
        widgetId,
        page,
        pageSize,
        searchQuery,
        sortColumn,
        sortDirection,
      ] = queryKey;

      const result = await widgetDataLoader({
        widgetId: widgetId as string,
        useCache: true,
        pagination:
          page && pageSize
            ? { page: page as number, pageSize: pageSize as number }
            : undefined,
        search: searchQuery as string | undefined,
        sortColumn: sortColumn as string | undefined,
        sortDirection: sortDirection as 'asc' | 'desc' | undefined,
      });

      return result;
    },
    refetchInterval,
    refetchOnWindowFocus: false,
    retry: 3,
    staleTime: 60 * 1000,
    refetchOnMount: 'always',
  });

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await forceRefetchWidget(widget.id);
    } finally {
      setIsRefreshing(false);
    }
  }, [forceRefetchWidget, widget.id]);

  const invalidateAndRefetch = useCallback(async () => {
    return invalidateWidget(widget.id);
  }, [invalidateWidget, widget.id]);

  return {
    ...query,
    isRefreshing,
    handleRefresh,
    invalidateAndRefetch,
  };
}
