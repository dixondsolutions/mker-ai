import { useCallback, useRef } from 'react';

import { useSearchParams } from 'react-router';

export interface FilterContext {
  searchParams: string;
  timestamp: number;
  version: string;
}

const CONTEXT_VERSION = '1.0';
const CONTEXT_EXPIRY_MS = 60 * 60 * 1000; // 1 hour
const STORAGE_KEY_PREFIX = 'filter-context';

/**
 * Generate a consistent storage key for filter context
 */
function getStorageKey(schemaName: string, tableName: string): string {
  return `${STORAGE_KEY_PREFIX}-${schemaName}-${tableName}`;
}

/**
 * Safely access session storage with error handling
 */
function safeStorageOperation<T>(
  operation: () => T,
  fallback: T,
  context: string,
): T {
  try {
    return operation();
  } catch (error) {
    console.warn(`Filter context ${context} failed:`, error);
    return fallback;
  }
}

/**
 * Custom hook to manage filter context in session storage
 *
 * This hook solves the problem of losing filter state when users:
 * 1. Apply filters to a data table
 * 2. Navigate to a detail page (by clicking a row)
 * 3. Return to the table (via browser back or navigation)
 *
 * The hook automatically:
 * - Saves filter state to session storage when filters change
 * - Clears stored context when all filters are removed
 * - Cleans up old/invalid filter contexts
 *
 * Note: Filter restoration is handled at the router level to prevent race conditions
 * with component mounting and URL state management.
 *
 * @param schemaName - Database schema name (used to create unique storage keys)
 * @param tableName - Database table name (used to create unique storage keys)
 * @returns Object with save function and context management utilities
 *
 * @example
 * ```tsx
 * function TableComponent() {
 *   const [searchParams] = useSearchParams();
 *   const { saveContext } = useFilterContext('public', 'users');
 *
 *   useEffect(() => {
 *     saveContext(); // Called whenever filters change
 *   }, [searchParams, saveContext]);
 * }
 * ```
 */
export function useFilterContext(schemaName: string, tableName: string) {
  const [searchParams] = useSearchParams();
  const storageKey = getStorageKey(schemaName, tableName);
  const lastSavedRef = useRef<string>('');

  // Save current filter context to session storage
  const saveContext = useCallback(() => {
    const currentParams = searchParams.toString();

    // Skip if the same params were already saved (prevents unnecessary writes)
    if (currentParams === lastSavedRef.current) {
      return;
    }

    lastSavedRef.current = currentParams;

    // If no filters, clear any stored context
    if (!currentParams) {
      safeStorageOperation(
        () => sessionStorage.removeItem(storageKey),
        undefined,
        'clear',
      );
      return;
    }

    // Save the new context
    const context: FilterContext = {
      searchParams: currentParams,
      timestamp: Date.now(),
      version: CONTEXT_VERSION,
    };

    safeStorageOperation(
      () => sessionStorage.setItem(storageKey, JSON.stringify(context)),
      undefined,
      'save',
    );
  }, [searchParams, storageKey]);

  // Clear stored context
  const clearContext = useCallback(() => {
    lastSavedRef.current = '';
    safeStorageOperation(
      () => sessionStorage.removeItem(storageKey),
      undefined,
      'clear',
    );
  }, [storageKey]);

  // Check if there's a valid stored context
  const hasStoredContext = useCallback(() => {
    return safeStorageOperation(
      () => {
        const stored = sessionStorage.getItem(storageKey);
        if (!stored) return false;

        const context: FilterContext = JSON.parse(stored);
        const isRecent = Date.now() - context.timestamp < CONTEXT_EXPIRY_MS;
        const isValidVersion = context.version === CONTEXT_VERSION;

        return isRecent && isValidVersion && !!context.searchParams;
      },
      false,
      'check',
    );
  }, [storageKey]);

  return {
    saveContext,
    clearContext,
    hasStoredContext,
  };
}

/**
 * Restore filter context from session storage (for use in router loaders)
 * @param schemaName - Database schema name
 * @param tableName - Database table name
 * @returns URLSearchParams if context should be restored, null otherwise
 */
export function restoreFilterContext(
  schemaName: string,
  tableName: string,
  currentSearchParams: URLSearchParams,
) {
  // Only restore if there are no current filters
  if (currentSearchParams.toString()) {
    return null;
  }

  const storageKey = getStorageKey(schemaName, tableName);

  return safeStorageOperation(
    () => {
      const stored = sessionStorage.getItem(storageKey);

      if (!stored) {
        return null;
      }

      const context: FilterContext = JSON.parse(stored);

      // Validate context
      const isRecent = Date.now() - context.timestamp < CONTEXT_EXPIRY_MS;
      const isValidVersion = context.version === CONTEXT_VERSION;

      if (isRecent && isValidVersion && context.searchParams) {
        // Clear the stored context after restoration to prevent repeated restoration
        sessionStorage.removeItem(storageKey);
        return new URLSearchParams(context.searchParams);
      }

      // Clean up invalid context
      sessionStorage.removeItem(storageKey);
      return null;
    },
    null,
    'restore',
  );
}
