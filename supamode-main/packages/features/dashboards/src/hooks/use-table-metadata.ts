import { useMemo } from 'react';

import { useReadableResources } from '@kit/resources/hooks';
import { ColumnMetadata, ColumnsConfig } from '@kit/types';

/**
 * Hook to get available schemas from navigation data
 */
export function useAccessibleSchemas() {
  const {
    data: navigationItems = [],
    isLoading,
    error,
  } = useReadableResources();

  const schemas = useMemo(() => {
    if (!Array.isArray(navigationItems)) {
      return [];
    }

    const schemaSet = new Set<string>();

    navigationItems.forEach((item) => {
      if (item.metadata?.schemaName) {
        schemaSet.add(item.metadata.schemaName);
      }
    });

    return Array.from(schemaSet).sort();
  }, [navigationItems]);

  return {
    data: schemas,
    isLoading,
    error,
  };
}

/**
 * Hook to get tables for a specific schema from navigation data
 */
export function useSchemaTables(schemaName: string) {
  const {
    data: navigationItems = [],
    isLoading,
    error,
  } = useReadableResources();

  const tables = useMemo(() => {
    if (!schemaName || !Array.isArray(navigationItems)) {
      return [];
    }

    return navigationItems
      .filter((item) => item.metadata?.schemaName === schemaName)
      .map((item) => ({
        name: item.metadata.tableName,
        displayName: item.metadata.displayName || item.metadata.tableName,
        metadata: item.metadata,
      }))
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [navigationItems, schemaName]);

  return {
    data: tables,
    isLoading,
    error,
  };
}

/**
 * Hook to get column metadata for a specific table
 */
export function useTableColumns(schemaName: string, tableName: string) {
  const {
    data: navigationItems = [],
    isLoading,
    error,
  } = useReadableResources();

  const columns: ColumnMetadata[] = useMemo(() => {
    if (!schemaName || !tableName || !Array.isArray(navigationItems)) {
      return [];
    }

    const tableItem = navigationItems.find(
      (item) =>
        item.metadata?.schemaName === schemaName &&
        item.metadata?.tableName === tableName,
    );

    if (!tableItem) {
      return [];
    }

    return Object.values(tableItem.metadata.columnsConfig as ColumnsConfig);
  }, [navigationItems, schemaName, tableName]);

  return {
    data: columns,
    isLoading,
    error,
  };
}

/**
 * Hook to check if user has access to a table
 */
export function useTableAccess(schemaName: string, tableName: string) {
  const {
    data: navigationItems = [],
    isLoading,
    error,
  } = useReadableResources();

  const hasAccess = useMemo(() => {
    if (!schemaName || !tableName || !Array.isArray(navigationItems))
      return false;

    return navigationItems.some(
      (item) =>
        item.metadata?.schemaName === schemaName &&
        item.metadata?.tableName === tableName,
    );
  }, [navigationItems, schemaName, tableName]);

  return {
    data: hasAccess,
    isLoading,
    error,
  };
}
