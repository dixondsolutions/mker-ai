import { useMemo } from 'react';

import { useReadableResources } from '@kit/resources/hooks';

/**
 * Hook to check if user has access to a specific table
 * @param schemaName - The schema name
 * @param tableName - The table name
 * @returns True if user has access to the table, false otherwise
 */
export function useTableAccessCheck(schemaName: string, tableName: string) {
  const {
    data: readableResources,
    isLoading,
    isError,
  } = useReadableResources();

  const hasAccess = useMemo(() => {
    if (isLoading || isError) {
      return false;
    }

    return (readableResources ?? []).some(
      (resource) =>
        resource.schemaName === schemaName && resource.tableName === tableName,
    );
  }, [isLoading, isError, readableResources, schemaName, tableName]);

  return {
    hasAccess,
    isLoading,
  };
}
