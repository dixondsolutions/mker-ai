import { useParams, useSearchParams } from 'react-router';

import { useQuery } from '@tanstack/react-query';

import { tableRouteLoader } from '../api/loaders/table-route-loader';
import { dataExplorerQueryKeys } from '../lib/query-keys';

/**
 * Hook to access cached table data with smart refetching
 */
export function useTableData() {
  const params = useParams();
  const [searchParams] = useSearchParams();

  const schema = params['schema'] as string;
  const table = params['table'] as string;

  // Extract filters for cache key
  const {
    page = 1,
    search = '',
    sort_column,
    sort_direction,
    ...properties
  } = Object.fromEntries(searchParams.entries());

  const filters = {
    page: Number(page),
    search,
    sort_column,
    sort_direction,
    properties: Object.keys(properties).length > 0 ? properties : undefined,
  };

  return useQuery({
    queryKey: dataExplorerQueryKeys.tableData(schema, table, filters),
    queryFn: () =>
      tableRouteLoader({
        schema,
        table,
        page: Number(page),
        search,
        sortColumn: sort_column,
        sortDirection: sort_direction as 'asc' | 'desc' | undefined,
        properties:
          Object.keys(properties).length > 0
            ? JSON.stringify(properties)
            : undefined,
      }),
    staleTime: 30 * 1000, // 30 seconds
    enabled: Boolean(schema && table),
  });
}

/**
 * Hook to access cached table metadata
 */
export function useTableMetadata() {
  const params = useParams();
  const schema = params['schema'] as string;
  const table = params['table'] as string;

  return useQuery({
    queryKey: dataExplorerQueryKeys.tableMetadata(schema, table),
    queryFn: async () => {
      const { tableMetadataLoader } = await import(
        '../api/loaders/table-structure-loader'
      );
      return tableMetadataLoader({ schema, table });
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: Boolean(schema && table),
  });
}

/**
 * Hook to access cached saved views
 */
export function useSavedViews() {
  const params = useParams();
  const schema = params['schema'] as string;
  const table = params['table'] as string;

  return useQuery({
    queryKey: dataExplorerQueryKeys.savedViews(schema, table),
    queryFn: async () => {
      const { savedViewsLoader } = await import(
        '../api/loaders/saved-views-loader'
      );
      return savedViewsLoader({ schema, table });
    },
    staleTime: 30 * 1000, // 30 seconds
    enabled: Boolean(schema && table),
  });
}

/**
 * Hook to access cached permissions
 */
export function useTablePermissions() {
  const params = useParams();
  const schema = params['schema'] as string;
  const table = params['table'] as string;

  return useQuery({
    queryKey: dataExplorerQueryKeys.permissions(schema, table),
    queryFn: async () => {
      const { dataRecordPermissionsLoader } = await import(
        '../api/loaders/permissions-loader'
      );
      return dataRecordPermissionsLoader({ schema, table });
    },
    staleTime: 60 * 1000, // 1 minute
    enabled: Boolean(schema && table),
  });
}

/**
 * Hook to access cached record data
 */
export function useRecordData(recordId?: string | Record<string, unknown>) {
  const params = useParams();
  const schema = params['schema'] as string;
  const table = params['table'] as string;

  const id = recordId || (params['id'] as string);

  return useQuery({
    queryKey: dataExplorerQueryKeys.record(schema, table, id),
    queryFn: async () => {
      const { recordLoader } = await import('../api/loaders/record-loader');
      const keyValues = typeof id === 'string' ? { id } : id;
      return recordLoader({ schema, table, keyValues });
    },
    staleTime: 15 * 1000, // 15 seconds
    enabled: Boolean(schema && table && id),
  });
}
