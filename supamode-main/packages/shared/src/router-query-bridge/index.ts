import type {
  ActionFunction,
  ActionFunctionArgs,
  LoaderFunction,
  LoaderFunctionArgs,
} from 'react-router';

import {
  MutationFunction,
  QueryClient,
  QueryFunction,
  QueryKey,
  UseQueryOptions,
  useQuery,
} from '@tanstack/react-query';

/**
 * Global query client instance - should be set by the application
 */
let queryClient: QueryClient | null = null;

/**
 * Initialize the query client for the bridge
 */
export function initializeQueryClient(client: QueryClient) {
  queryClient = client;
}

/**
 * Get the query client instance
 */
function getQueryClient(): QueryClient {
  if (!queryClient) {
    throw new Error(
      'QueryClient not initialized. Call initializeQueryClient() in your app startup.',
    );
  }
  return queryClient;
}

/* -------------------------------------------------------------------------- */
/*                               createLoader                                 */
/* -------------------------------------------------------------------------- */

export interface CreateLoaderOptions<T> {
  /** A static key or a function that receives Loader args to build the key. */
  queryKey: QueryKey | ((args: LoaderFunctionArgs) => QueryKey);
  /** Fetcher that returns the data you would normally pass to React Query. */
  queryFn: (args: LoaderFunctionArgs) => Promise<T>;
  /** Pass straight to React Query's prefetchQuery options. */
  staleTime?: number;
  /** Cache time in milliseconds */
  gcTime?: number;
  /**
   * Force prefetch every navigation even if data is in cache and fresh.
   * Default: false (respects staleTime).
   */
  force?: boolean;
}

/**
 * Create a loader function that can be used in a router.
 * @param opts - The options for the loader.
 * @returns A loader function that can be used in a router.
 */
export function createLoader<T>(opts: CreateLoaderOptions<T>) {
  return async (args: LoaderFunctionArgs) => {
    const client = getQueryClient();

    const key =
      typeof opts.queryKey === 'function' ? opts.queryKey(args) : opts.queryKey;

    // Check if we have fresh data and force is false
    if (!opts.force) {
      const existingData = client.getQueryData<T>(key);
      const queryState = client.getQueryState<T>(key);

      if (existingData && queryState && !queryState.isInvalidated) {
        const staleTime = opts.staleTime ?? 0;
        const dataTime = queryState.dataUpdatedAt;
        const now = Date.now();

        if (now - dataTime < staleTime) {
          // Data is fresh
          return existingData;
        }
      }
    }

    // Fetch data
    return client.fetchQuery({
      queryKey: key,
      queryFn: () => opts.queryFn(args),
      staleTime: opts.staleTime,
      gcTime: opts.gcTime,
    });
  };
}

/* -------------------------------------------------------------------------- */
/*                               createAction                                 */
/* -------------------------------------------------------------------------- */

export interface CreateActionOptions<TData = unknown, TError = unknown> {
  /** Async mutation function */
  mutationFn: MutationFunction<TData, ActionFunctionArgs>;
  /**
   * Which query keys to invalidate after successful mutation.
   */
  invalidateKeys?:
    | QueryKey[]
    | ((args: ActionFunctionArgs, data: TData) => QueryKey[]);
  /**
   * Query keys to remove from cache after successful mutation.
   */
  removeQueries?:
    | QueryKey[]
    | ((args: ActionFunctionArgs, data: TData) => QueryKey[]);
  /**
   * Optional redirect or plain value to return from Action.
   */
  onSuccessReturn?: (data: TData, args: ActionFunctionArgs) => unknown;
  /**
   * Handle errors in mutations
   */
  onError?: (error: TError, args: ActionFunctionArgs) => unknown;
}

export function createAction<TData = unknown, TError = unknown>(
  opts: CreateActionOptions<TData, TError>,
): ActionFunction {
  return async (args: ActionFunctionArgs) => {
    const client = getQueryClient();

    try {
      const data = await opts.mutationFn(args, { client, meta: args.context });

      // Handle invalidations
      if (opts.invalidateKeys) {
        const keys =
          typeof opts.invalidateKeys === 'function'
            ? opts.invalidateKeys(args, data)
            : opts.invalidateKeys;

        await Promise.all(
          keys.map((key) => client.invalidateQueries({ queryKey: key })),
        );
      }

      // Handle query removals
      if (opts.removeQueries) {
        const keys =
          typeof opts.removeQueries === 'function'
            ? opts.removeQueries(args, data)
            : opts.removeQueries;

        keys.forEach((key) => client.removeQueries({ queryKey: key }));
      }

      return opts.onSuccessReturn ? opts.onSuccessReturn(data, args) : data;
    } catch (error) {
      if (opts.onError) {
        return opts.onError(error as TError, args);
      }
      throw error;
    }
  };
}

/* -------------------------------------------------------------------------- */
/*                               useLoaderQuery                               */
/* -------------------------------------------------------------------------- */

export interface UseLoaderQueryOptions<T> {
  /** A static key or a function that receives Loader args to build the key. */
  queryKey: QueryKey | ((args: LoaderFunctionArgs) => QueryKey);
  /** Fetcher that returns the data you would normally pass to React Query. */
  queryFn: (args: LoaderFunctionArgs) => Promise<T>;
  /** Pass straight to React Query's prefetchQuery options. */
  staleTime?: number;
  /** Cache time in milliseconds */
  gcTime?: number;
  /** Additional useQuery options */
  options?: Omit<
    UseQueryOptions<T>,
    'queryKey' | 'queryFn' | 'staleTime' | 'gcTime'
  >;
}

export function useLoaderQuery<T>(opts: UseLoaderQueryOptions<T>) {
  // This assumes you have a way to get loader args in your router setup
  // You might need to adjust this based on your router implementation
  const key =
    typeof opts.queryKey === 'function'
      ? opts.queryKey({} as LoaderFunctionArgs) // You'll need to provide actual args
      : opts.queryKey;

  return useQuery({
    queryKey: key,
    queryFn: () => opts.queryFn({} as LoaderFunctionArgs),
    staleTime: opts.staleTime,
    gcTime: opts.gcTime,
    ...opts.options,
  });
}

/* -------------------------------------------------------------------------- */
/*                           Cache Dependencies Mapping                       */
/* -------------------------------------------------------------------------- */

/**
 * Maps operation types to their cache clearing functions
 */
export const CACHE_DEPENDENCIES = {
  PERMISSION_CHANGE: () => clearPermissionsCache(),
  ROLE_CHANGE: (params?: string) => clearRoleCache(params),
  MEMBER_CHANGE: (params?: string) => clearMemberCache(params),
  TABLE_METADATA_CHANGE: (
    params?: string | { schema: string; table: string },
  ) => clearTableCache(params),
  TABLE_DISPLAY_CHANGE: () => clearAllTablesCache(), // Clear all tables when display format changes
  ALL_TABLES: () => clearAllTablesCache(),
} as const;

export type CacheDependencyType = keyof typeof CACHE_DEPENDENCIES;

/**
 * Enhanced createAction that supports automatic cache dependency clearing
 */
export interface CreateActionWithCacheOptions<TData = unknown, TError = unknown>
  extends CreateActionOptions<TData, TError> {
  /**
   * Cache dependencies to clear after successful mutation
   */
  cacheDependencies?:
    | {
        type: CacheDependencyType;
        params?: string | { schema: string; table: string };
      }[]
    | ((
        args: ActionFunctionArgs,
        data: TData,
      ) => {
        type: CacheDependencyType;
        params?: string | { schema: string; table: string };
      }[]);
}

/**
 * Enhanced createAction with automatic cache dependency handling
 */
export function createActionWithCache<TData = unknown, TError = unknown>(
  opts: CreateActionWithCacheOptions<TData, TError>,
): ActionFunction {
  return async (args: ActionFunctionArgs) => {
    const client = getQueryClient();

    try {
      const data = await opts.mutationFn(args, { client, meta: args.context });

      // Handle standard invalidations first
      if (opts.invalidateKeys) {
        const keys =
          typeof opts.invalidateKeys === 'function'
            ? opts.invalidateKeys(args, data)
            : opts.invalidateKeys;

        await Promise.all(
          keys.map((key) => client.invalidateQueries({ queryKey: key })),
        );
      }

      // Handle query removals
      if (opts.removeQueries) {
        const keys =
          typeof opts.removeQueries === 'function'
            ? opts.removeQueries(args, data)
            : opts.removeQueries;

        keys.forEach((key) => client.removeQueries({ queryKey: key }));
      }

      // Handle cache dependencies
      if (opts.cacheDependencies) {
        const dependencies =
          typeof opts.cacheDependencies === 'function'
            ? opts.cacheDependencies(args, data)
            : opts.cacheDependencies;

        await Promise.all(
          dependencies.map(async (dep) => {
            switch (dep.type) {
              case 'PERMISSION_CHANGE':
                return CACHE_DEPENDENCIES.PERMISSION_CHANGE();
              case 'ROLE_CHANGE':
                return CACHE_DEPENDENCIES.ROLE_CHANGE(dep.params as string);
              case 'MEMBER_CHANGE':
                return CACHE_DEPENDENCIES.MEMBER_CHANGE(dep.params as string);
              case 'TABLE_METADATA_CHANGE':
                return CACHE_DEPENDENCIES.TABLE_METADATA_CHANGE(dep.params);
              case 'TABLE_DISPLAY_CHANGE':
                return CACHE_DEPENDENCIES.TABLE_DISPLAY_CHANGE();
              case 'ALL_TABLES':
                return CACHE_DEPENDENCIES.ALL_TABLES();
              default:
                throw new Error(`Unknown cache dependency type: ${dep.type}`);
            }
          }),
        );
      }

      return opts.onSuccessReturn ? opts.onSuccessReturn(data, args) : data;
    } catch (error) {
      if (opts.onError) {
        return opts.onError(error as TError, args);
      }
      throw error;
    }
  };
}

/* -------------------------------------------------------------------------- */
/*                               Utility Functions                            */
/* -------------------------------------------------------------------------- */

/**
 * Prefetch a query for upcoming navigation
 */
export async function prefetchQuery<T>(
  queryKey: QueryKey,
  queryFn: QueryFunction<T, QueryKey>,
  options?: { staleTime?: number; gcTime?: number },
) {
  const client = getQueryClient();

  return client.prefetchQuery({
    queryKey,
    queryFn,
    staleTime: options?.staleTime,
    gcTime: options?.gcTime,
  });
}

/**
 * Invalidate queries by key
 */
export async function invalidateQueries(queryKey: QueryKey) {
  const client = getQueryClient();

  return client.invalidateQueries({ queryKey, refetchType: 'all' });
}

/**
 * Remove queries by key
 */
export function removeQueries(queryKey: QueryKey) {
  const client = getQueryClient();

  return client.removeQueries({ queryKey });
}

/**
 * Clear all table-related caches when we can't determine specific affected tables
 */
export async function clearAllTablesCache() {
  const client = getQueryClient();

  // Clear all data-explorer table data queries
  await client.invalidateQueries({ queryKey: ['table-data'] });

  // Clear all combined table route loaders
  await client.invalidateQueries({ queryKey: ['combined-table-route'] });

  // Clear all table metadata from data-explorer
  await client.invalidateQueries({ queryKey: ['table-metadata'] });

  // Clear all saved views
  await client.invalidateQueries({ queryKey: ['saved-views'] });

  // Clear all table permissions from data-explorer
  await client.invalidateQueries({ queryKey: ['permissions'] });

  // Clear all records
  await client.invalidateQueries({ queryKey: ['record'] });

  // Clear all field values for autocomplete
  await client.invalidateQueries({ queryKey: ['field-values'] });

  // Clear all users-explorer related queries
  await client.invalidateQueries({ queryKey: ['users-explorer'] });

  // Clear all storage-explorer related queries
  await client.invalidateQueries({ queryKey: ['storage-explorer'] });

  // Clear settings tables metadata
  await client.invalidateQueries({ queryKey: ['settings', 'tables-metadata'] });

  // Clear settings table metadata
  await client.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key.includes('settings') &&
        key.includes('table-metadata')
      );
    },
  });

  // Clear navigation cache that might depend on permissions
  await client.invalidateQueries({ queryKey: ['navigation'] });
}

/**
 * Clear cache for a specific table across all features
 */
export async function clearTableCache(
  params?: string | { schema: string; table: string },
) {
  const client = getQueryClient();

  if (params && typeof params === 'object' && 'schema' in params) {
    const { schema, table } = params;

    // Clear all data-explorer table data queries (with all filter variations)
    await client.invalidateQueries({
      queryKey: ['table-data', schema, table],
    });

    // Clear combined table route loader
    await client.invalidateQueries({
      queryKey: ['combined-table-route', schema, table],
    });

    // Clear table metadata from data-explorer
    await client.invalidateQueries({
      queryKey: ['table-metadata', schema, table],
    });

    // Clear saved views
    await client.invalidateQueries({
      queryKey: ['saved-views', schema, table],
    });

    // Clear table permissions from data-explorer
    await client.invalidateQueries({
      queryKey: ['permissions', schema, table],
    });

    // Clear all records for this table
    await client.invalidateQueries({
      queryKey: ['record', schema, table],
    });

    // Clear field values for autocomplete
    await client.invalidateQueries({
      queryKey: ['field-values', schema, table],
    });

    // Clear settings table metadata
    await client.invalidateQueries({
      queryKey: ['settings', 'table-metadata', schema, table],
    });

    // Clear any table-specific permissions from settings
    await client.invalidateQueries({
      queryKey: ['settings', 'permissions'],
    });
  } else {
    // If no specific table provided, clear all table caches
    await clearAllTablesCache();
  }
}

/**
 * Clear all permission-related caches
 */
export async function clearPermissionsCache() {
  const client = getQueryClient();

  // Clear all settings permissions
  await client.invalidateQueries({ queryKey: ['settings', 'permissions'] });

  // Clear role permissions
  await client.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key.includes('settings') &&
        key.includes('role-permissions')
      );
    },
  });

  // Clear permission group permissions
  await client.invalidateQueries({
    predicate: (query) => {
      const key = query.queryKey;
      return (
        Array.isArray(key) &&
        key.includes('settings') &&
        key.includes('permission-group-permissions')
      );
    },
  });

  // Clear navigation since it depends on permissions
  await client.invalidateQueries({ queryKey: ['navigation'] });

  // Clear all table caches since permissions affect data access
  await clearAllTablesCache();
}

/**
 * Clear cache for specific role changes
 */
export async function clearRoleCache(params?: string) {
  const client = getQueryClient();

  // Clear specific role permissions if roleId provided
  if (params && typeof params === 'string') {
    await client.invalidateQueries({
      queryKey: ['settings', 'role-permissions', params],
    });
  }

  // Clear all permissions cache since role changes affect permissions
  await clearPermissionsCache();
}

/**
 * Clear cache for member/account changes
 */
export async function clearMemberCache(params?: string) {
  const client = getQueryClient();

  // Clear specific member if accountId provided
  if (params && typeof params === 'string') {
    await client.invalidateQueries({
      queryKey: ['settings', 'member-details', params],
    });
  }

  // Clear all members
  await client.invalidateQueries({ queryKey: ['settings', 'members'] });

  // Clear navigation since member changes might affect what's visible
  await client.invalidateQueries({ queryKey: ['navigation'] });
}

/* -------------------------------------------------------------------------- */
/*                               Type Helpers                                 */
/* -------------------------------------------------------------------------- */
export type { LoaderFunction, ActionFunction };
