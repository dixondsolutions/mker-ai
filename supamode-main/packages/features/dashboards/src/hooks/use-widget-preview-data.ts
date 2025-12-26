import { useCallback, useEffect, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  generateFallbackPreviewData,
  loadWidgetPreviewData,
} from '../lib/preview-data-loader';
import type { WidgetData } from '../types';
import type { PartialWidgetFormData } from '../types/widget-forms';

/**
 * Hook to load preview data for a widget configuration
 * Uses real API data when possible, falls back to mock data if needed
 */
export function useWidgetPreviewData(data: PartialWidgetFormData) {
  const [shouldLoadRealData, setShouldLoadRealData] = useState(false);

  // Determine if we have enough configuration to load real data
  const canLoadRealData = Boolean(data.schemaName && data.tableName);

  useEffect(() => {
    if (!canLoadRealData) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShouldLoadRealData(false);
    }
  }, [canLoadRealData]);

  // Query for real data
  const realDataQuery = useQuery({
    queryKey: [
      'widget-preview-data',
      data.schemaName,
      data.tableName,
      data.type,
      data.config,
    ],
    queryFn: () => loadWidgetPreviewData(data),
    enabled: shouldLoadRealData && canLoadRealData,
    retry: 1, // Only retry once for previews
    staleTime: 0, // Always consider data stale for previews
    gcTime: 0, // Don't cache preview data
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Always refetch when component mounts
  });

  // Generate fallback data
  const fallbackData = generateFallbackPreviewData(data);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (canLoadRealData) {
      setShouldLoadRealData(true);
      realDataQuery.refetch();
    }
  }, [canLoadRealData, realDataQuery]);

  // Return appropriate data based on state
  const widgetData: WidgetData | null = (() => {
    if (!canLoadRealData) {
      // No data source configured - return null to show config message
      return null;
    }

    if (realDataQuery.isLoading) {
      // Still loading - return null to show loading state
      return null;
    }

    if (realDataQuery.data) {
      // Successfully loaded real data
      return realDataQuery.data;
    }

    if (realDataQuery.error) {
      // Error loading real data - return fallback with error info
      return {
        ...fallbackData,
        metadata: {
          ...fallbackData.metadata,
          ['error']:
            realDataQuery.error instanceof Error
              ? realDataQuery.error.message
              : 'Failed to load preview data',
          isPreview: true,
        },
      };
    }

    // Default to fallback data
    return fallbackData;
  })();

  return {
    data: widgetData,
    isLoading: realDataQuery.isLoading && canLoadRealData,
    error:
      realDataQuery.error instanceof Error ? realDataQuery.error.message : null,
    isLoadingRealData: realDataQuery.isLoading,
    hasRealData: Boolean(
      realDataQuery.data &&
        !(
          realDataQuery.data.metadata &&
          'error' in realDataQuery.data.metadata &&
          realDataQuery.data.metadata['error']
        ),
    ),
    canLoadRealData,
    refresh,
  };
}
