import { useEffect } from 'react';

import { useLocation } from 'react-router';

import { ensureTabForPath, getPathInfo } from '../utils/tab-manager';

/**
 * Hook for managing tab creation and updates
 * Automatically handles tab management based on current location and data
 */
export function useTabManagement(options: {
  /** Display name for the table/entity */
  displayName?: string | null;
  /** Entity display name for individual records */
  entityDisplayName?: string | null;
  /** Whether to enable tab management (default: true) */
  enabled?: boolean;
}) {
  const location = useLocation();
  const { displayName, entityDisplayName, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const fullPath = location.pathname + (location.search || '');
    const pathInfo = getPathInfo(
      fullPath,
      displayName ?? undefined,
      entityDisplayName ?? undefined,
    );

    if (pathInfo && pathInfo.type !== 'empty') {
      ensureTabForPath(
        fullPath,
        pathInfo.title,
        pathInfo.schema,
        pathInfo.table,
        pathInfo.displayName,
        pathInfo.entityDisplayName,
      );
    }
  }, [
    location.pathname,
    location.search,
    displayName,
    entityDisplayName,
    enabled,
  ]);
}

/**
 * Hook for managing table listing tabs
 * Simplified version for table data pages
 */
export function useTableTabManagement(displayName?: string | null) {
  return useTabManagement({ displayName });
}

/**
 * Hook for managing record tabs
 * Simplified version for record pages (view/edit)
 */
export function useRecordTabManagement(
  displayName?: string | null,
  entityDisplayName?: string | null,
) {
  return useTabManagement({ displayName, entityDisplayName });
}

/**
 * Hook for managing create/new record tabs
 * Simplified version for record creation pages
 */
export function useCreateTabManagement(displayName?: string | null) {
  return useTabManagement({ displayName });
}
