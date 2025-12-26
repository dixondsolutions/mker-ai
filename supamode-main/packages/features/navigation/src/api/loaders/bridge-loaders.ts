import { useQuery } from '@tanstack/react-query';

import { globalSearchLoader } from '@kit/resources/loaders';

/**
 * Query key factory for navigation
 */
export const navigationQueryKeys = {
  all: ['navigation'] as const,
  globalSearch: (query: string, offset?: number, limit?: number) =>
    [
      ...navigationQueryKeys.all,
      'global-search',
      { query, offset, limit },
    ] as const,
};

/**
 * Bridge-powered hook for global search with smart caching
 * Uses TanStack Query for caching and deduplication
 */
export function useGlobalSearch(params: {
  query: string;
  offset?: number;
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: navigationQueryKeys.globalSearch(
      params.query,
      params.offset,
      params.limit,
    ),
    queryFn: () =>
      globalSearchLoader({
        query: params.query,
        offset: params.offset,
        limit: params.limit,
      }),
    enabled: params.enabled,
    staleTime: 30 * 1000, // 30 seconds - search results can be cached for better performance
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
  });
}
