import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { DashboardWithStats, WidgetData } from '../../types';
import type {
  GetDashboardRoute,
  GetDashboardsRoute,
} from '../routes/dashboards-routes';
import type {
  GetWidgetDataRoute,
  GetWidgetsByDashboardRoute,
} from '../routes/widgets-routes';

// Cache duration in milliseconds (1 hour)
const CACHE_DURATION = 60 * 60 * 1000;

interface CachedWidgetData {
  data: WidgetData;
  timestamp: number;
  error?: string;
}

/**
 * Generate cache key for widget data
 */
export function getWidgetCacheKey(
  widgetId: string,
  options?: {
    pagination?: { page: number; pageSize: number };
    search?: string;
    sortColumn?: string;
    sortDirection?: string;
  },
): string {
  const keyParts = [`widget_data_${widgetId}`];

  if (options?.pagination) {
    const { page, pageSize } = options.pagination;
    keyParts.push(`page${page}_size${pageSize}`);
  }

  if (options?.search) {
    keyParts.push(`search_${encodeURIComponent(options.search)}`);
  }

  if (options?.sortColumn) {
    keyParts.push(
      `sort_${options.sortColumn}_${options.sortDirection || 'asc'}`,
    );
  }

  return keyParts.join('_');
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(timestamp: number): boolean {
  return Date.now() - timestamp < CACHE_DURATION;
}

/**
 * Get cached widget data from sessionStorage
 */
function getCachedWidgetData(
  widgetId: string,
  options?: {
    pagination?: { page: number; pageSize: number };
    search?: string;
    sortColumn?: string;
    sortDirection?: string;
  },
): CachedWidgetData | null {
  try {
    const cacheKey = getWidgetCacheKey(widgetId, options);
    const cached = sessionStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const parsedCache: CachedWidgetData = JSON.parse(cached);

    if (!isCacheValid(parsedCache.timestamp)) {
      // Cache expired, remove it
      sessionStorage.removeItem(cacheKey);
      return null;
    }

    return parsedCache;
  } catch {
    // If there's any error parsing cached data, ignore it
    return null;
  }
}

/**
 * Cache widget data in sessionStorage
 */
function setCachedWidgetData(
  widgetId: string,
  data: WidgetData,
  error?: string,
  options?: {
    pagination?: { page: number; pageSize: number };
    search?: string;
    sortColumn?: string;
    sortDirection?: string;
  },
): void {
  try {
    const cacheKey = getWidgetCacheKey(widgetId, options);

    const cacheData: CachedWidgetData = {
      data,
      timestamp: Date.now(),
      error,
    };

    sessionStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    // If sessionStorage is full or not available, silently fail
    console.warn('Failed to cache widget data:', error);
  }
}

/**
 * Clear all cached widget data variants for a specific widget
 * This includes base cache and all pagination/search/sort variants
 */
export function clearWidgetCacheAllVariants(widgetId: string): void {
  try {
    const basePrefix = `widget_data_${widgetId}`;

    // Get all sessionStorage keys that start with our widget prefix
    const keysToRemove: string[] = [];

    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);

      if (key && key.startsWith(basePrefix)) {
        keysToRemove.push(key);
      }
    }

    // Remove all variant keys
    keysToRemove.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear widget cache variants:', error);
  }
}

/**
 * Clear all widget caches
 */
export function clearAllWidgetCaches(): void {
  try {
    const keys = Object.keys(sessionStorage);

    const widgetCacheKeys = keys.filter((key) =>
      key.startsWith('widget_data_'),
    );

    widgetCacheKeys.forEach((key) => {
      sessionStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear widget caches:', error);
  }
}

/**
 * Clear widget cache and force refetch for multiple widgets
 * Useful for dashboard-level cache invalidation
 */
export function clearWidgetCaches(widgetIds: string[]): void {
  widgetIds.forEach((widgetId) => {
    clearWidgetCacheAllVariants(widgetId);
  });
}

/**
 * Clear widget cache and invalidate TanStack Query cache for a widget
 * This is the comprehensive function for widget cache invalidation
 */
export async function invalidateWidgetCache(
  widgetId: string,
  queryClient?: {
    invalidateQueries: (options: { queryKey: string[] }) => Promise<void>;
  },
): Promise<void> {
  // Clear sessionStorage cache
  clearWidgetCacheAllVariants(widgetId);

  // Clear TanStack Query cache if queryClient is provided
  if (queryClient) {
    await queryClient.invalidateQueries({
      queryKey: ['widget-data', widgetId],
    });
  }
}

/**
 * Clear widget caches and invalidate TanStack Query caches for multiple widgets
 */
export async function invalidateWidgetCaches(
  widgetIds: string[],
  queryClient?: {
    invalidateQueries: (options: { queryKey: string[] }) => Promise<void>;
  },
) {
  // Clear sessionStorage caches
  clearWidgetCaches(widgetIds);

  // Clear TanStack Query caches if queryClient is provided
  if (queryClient) {
    await Promise.all(
      widgetIds.map((widgetId) =>
        queryClient.invalidateQueries({
          queryKey: ['widget-data', widgetId],
        }),
      ),
    );
  }
}

/**
 * Load all dashboards for the current user
 */
export async function dashboardsLoader({
  page = 1,
  pageSize = 20,
  search,
  filter = 'all',
}: {
  page?: number;
  pageSize?: number;
  search?: string;
  filter?: 'all' | 'owned' | 'shared';
} = {}) {
  const client = createHonoClient<GetDashboardsRoute>();

  const response = await client['v1']['dashboards'].$get({
    query: {
      page: page.toString(),
      pageSize: pageSize.toString(),
      search,
      filter,
    },
  });
  const result = await handleHonoClientResponse(response);

  return result.data;
}

/**
 * Load a specific dashboard by ID
 */
export async function dashboardLoader({
  dashboardId,
}: {
  dashboardId: string;
}) {
  try {
    // Fetch dashboard and widgets in parallel
    const [dashboardResponse, widgetsResponse] = await Promise.all([
      (() => {
        const client = createHonoClient<GetDashboardRoute>();

        return client['v1']['dashboards'][':id'].$get({
          param: { id: dashboardId },
        });
      })(),
      (() => {
        const client = createHonoClient<GetWidgetsByDashboardRoute>();

        return client['v1']['dashboards'][':dashboardId']['widgets'].$get({
          param: { dashboardId },
        });
      })(),
    ]);

    // Check if dashboard was not found (404)
    if (!dashboardResponse.ok) {
      const status = dashboardResponse.status;
      if (status === 404) {
        // Return a special marker to indicate dashboard not found
        return {
          dashboard: null,
          widgets: [],
          error: 'Dashboard not found',
        };
      }
    }

    const [dashboardResult, widgetsResult] = await Promise.all([
      handleHonoClientResponse(dashboardResponse),
      handleHonoClientResponse(widgetsResponse),
    ]);

    return {
      dashboard: dashboardResult.data,
      widgets: widgetsResult.data,
    };
  } catch (error) {
    // If it's a 404 error, return the not found marker
    if (error instanceof Error) {
      return {
        dashboard: null,
        widgets: [],
        error: 'Dashboard not found',
      };
    }

    // Re-throw other errors to be handled by error boundary
    throw error;
  }
}

/**
 * Load widget data for a specific widget with caching
 */
export async function widgetDataLoader({
  widgetId,
  useCache = true,
  pagination,
  search,
  sortColumn,
  sortDirection,
}: {
  widgetId: string;
  useCache?: boolean;
  pagination?: { page: number; pageSize: number };
  search?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
}): Promise<{
  data: WidgetData;
  relations?: Array<{
    column: string;
    original: unknown;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>;
  error?: string;
}> {
  // Check cache first if caching is enabled
  if (useCache) {
    const cacheOptions = {
      pagination,
      search,
      sortColumn,
      sortDirection,
    };
    const cachedData = getCachedWidgetData(widgetId, cacheOptions);

    if (cachedData) {
      return {
        data: cachedData.data,
        error: cachedData.error,
      };
    } else {
      console.debug(
        `[Cache] No cache found for widget ${widgetId}, fetching fresh data`,
      );
    }
  }

  try {
    // Use single unified endpoint for all widgets
    const client = createHonoClient<GetWidgetDataRoute>();

    // Build query parameters
    const query: Record<string, string> = {};

    if (pagination) {
      query['page'] = pagination.page.toString();
      query['pageSize'] = pagination.pageSize.toString();
    }

    if (search) {
      query['search'] = search;
    }

    if (sortColumn) {
      query['sort_column'] = sortColumn;
    }

    if (sortDirection) {
      query['sort_direction'] = sortDirection;
    }

    const response = await client['v1']['widgets'][':id']['data'].$get({
      param: { id: widgetId },
      query,
    });

    const result = await handleHonoClientResponse(response);

    const widgetData = result.data;
    const relations = ('relations' in result ? result.relations : []) as Array<{
      column: string;
      original: unknown;
      formatted: string | null | undefined;
      link: string | null | undefined;
    }>;

    // Cache the successful result
    if (useCache) {
      const cacheOptions = {
        pagination,
        search,
        sortColumn,
        sortDirection,
      };

      setCachedWidgetData(widgetId, widgetData, undefined, cacheOptions);
    }

    return {
      data: widgetData,
      relations,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to load widget data';

    const errorData = {
      data: [],
      metadata: {
        error: errorMessage,
      },
    };

    // Cache the error result as well to avoid repeated failed requests
    if (useCache) {
      const cacheOptions = {
        pagination,
        search,
        sortColumn,
        sortDirection,
      };

      setCachedWidgetData(widgetId, errorData, errorMessage, cacheOptions);
    }

    return {
      data: errorData,
      error: errorMessage,
    };
  }
}

/**
 * Search dashboards by query - now uses the main dashboards loader with search parameter
 */
export async function searchDashboardsLoader({
  query,
}: {
  query: string;
}): Promise<{
  dashboards: DashboardWithStats[];
  query: string;
}> {
  if (!query) {
    return { dashboards: [], query: '' };
  }

  const result = await dashboardsLoader({
    search: query,
    pageSize: 50, // Return more results for search
  });

  return {
    dashboards: result.dashboards,
    query,
  };
}
