import { useCallback } from 'react';

import { useQueryClient } from '@tanstack/react-query';

import {
  clearWidgetCacheAllVariants,
  clearWidgetCaches,
} from '../api/loaders/bridge-loaders';

/**
 * Hook for managing widget cache invalidation and refetching
 */
export function useWidgetCacheManager() {
  const queryClient = useQueryClient();

  // Invalidate cache and refetch data for a single widget
  const invalidateWidget = useCallback(
    async (widgetId: string) => {
      // Clear sessionStorage cache (all variants)
      clearWidgetCacheAllVariants(widgetId);

      // Invalidate and refetch TanStack Query cache
      await queryClient.invalidateQueries({
        queryKey: ['widget-data', widgetId],
      });
    },
    [queryClient],
  );

  // Invalidate cache and refetch data for multiple widgets
  const invalidateWidgets = useCallback(
    async (widgetIds: string[]) => {
      // Clear localStorage caches
      clearWidgetCaches(widgetIds);

      // Invalidate and refetch TanStack Query caches
      await Promise.all(
        widgetIds.map((widgetId) =>
          queryClient.invalidateQueries({
            queryKey: ['widget-data', widgetId],
          }),
        ),
      );
    },
    [queryClient],
  );

  // Force refetch a widget (bypasses cache entirely)
  const forceRefetchWidget = useCallback(
    async (widgetId: string) => {
      // Clear sessionStorage cache (all variants)
      clearWidgetCacheAllVariants(widgetId);

      // Force refetch by invalidating and immediately refetching
      await queryClient.refetchQueries({
        queryKey: ['widget-data', widgetId],
        type: 'active',
      });
    },
    [queryClient],
  );

  // Force refetch multiple widgets (bypasses cache entirely)
  const forceRefetchWidgets = useCallback(
    async (widgetIds: string[]) => {
      // Clear localStorage caches
      clearWidgetCaches(widgetIds);

      // Force refetch by invalidating and immediately refetching
      await Promise.all(
        widgetIds.map((widgetId) =>
          queryClient.refetchQueries({
            queryKey: ['widget-data', widgetId],
            type: 'active',
          }),
        ),
      );
    },
    [queryClient],
  );

  return {
    invalidateWidget,
    invalidateWidgets,
    forceRefetchWidget,
    forceRefetchWidgets,
  };
}
