import { useCallback, useMemo, useState } from 'react';

import type {
  ColumnPinningState,
  VisibilityState,
} from '@tanstack/react-table';

import type {
  BatchSelectionState,
  ColumnManagementState,
} from '../../../table/src/components/advanced-data-table';

// Re-export the column preferences hook interface for consistency
interface UseColumnPreferencesOptions {
  /** Schema and table name for scoped storage (e.g., 'public.users') */
  schemaName?: string;
  tableName?: string;
  /** Fallback storage key if schema/table not provided */
  storageKey?: string;
  /** Default visibility state for columns */
  defaultVisibility?: VisibilityState;
  /** Default pinning state for columns */
  defaultPinning?: ColumnPinningState;
  /** List of available column names for validation */
  availableColumns?: string[];
}

interface UseAdvancedTableStateOptions<T> {
  // Storage and preferences
  schemaName?: string;
  tableName?: string;
  storageKey?: string;
  availableColumns: string[];

  // Data for batch selection
  data: T[];
  getRecordId: (item: T) => string;

  // External handlers (dependency injection)
  onSortChange?: (column: string, direction: 'asc' | 'desc') => void;

  // Configuration
  enableBatchSelection?: boolean;
  enableColumnManagement?: boolean;
  maxSelectable?: number;

  // Default states
  defaultColumnVisibility?: VisibilityState;
  defaultColumnPinning?: ColumnPinningState;
}

interface UseAdvancedTableStateReturn<T> {
  // Column management
  columnManagement: ColumnManagementState | undefined;

  // Batch selection
  batchSelection: BatchSelectionState<T> | undefined;

  // Sorting
  sortState: { column: string | null; direction: 'asc' | 'desc' };
  onSortChange: (column: string) => void;
}

/**
 * Comprehensive state management hook for advanced tables
 *
 * This hook provides all the state management needed for advanced table features
 * while allowing dependency injection for context-specific behavior.
 */
export function useAdvancedTableState<T>({
  schemaName,
  tableName,
  storageKey,
  availableColumns,
  data,
  getRecordId,
  onSortChange: externalSortHandler,
  enableBatchSelection = false,
  enableColumnManagement = true,
  maxSelectable,
  defaultColumnVisibility = {},
  defaultColumnPinning = { left: ['select'], right: [] },
}: UseAdvancedTableStateOptions<T>): UseAdvancedTableStateReturn<T> {
  // Column management state
  const columnManagement = useColumnManagement({
    schemaName,
    tableName,
    storageKey,
    defaultVisibility: defaultColumnVisibility,
    defaultPinning: defaultColumnPinning,
    availableColumns,
    enabled: enableColumnManagement,
  });

  // Batch selection state
  const batchSelection = useBatchSelection({
    items: data,
    getItemId: getRecordId,
    maxSelectable,
    enabled: enableBatchSelection,
  });

  // Sorting state
  const [sortState, setSortState] = useState<{
    column: string | null;
    direction: 'asc' | 'desc';
  }>({ column: null, direction: 'asc' });

  const handleSortChange = useCallback(
    (column: string) => {
      setSortState((prev) => {
        const newDirection: 'asc' | 'desc' =
          prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc';

        const newState = { column, direction: newDirection };

        // Call external handler if provided
        if (externalSortHandler) {
          externalSortHandler(column, newDirection);
        }

        return newState;
      });
    },
    [externalSortHandler],
  );

  return {
    columnManagement: enableColumnManagement ? columnManagement : undefined,
    batchSelection: enableBatchSelection ? batchSelection : undefined,
    sortState,
    onSortChange: handleSortChange,
  };
}

/**
 * Column management hook with localStorage persistence
 */
function useColumnManagement({
  schemaName,
  tableName,
  storageKey,
  defaultVisibility = {},
  defaultPinning = { left: [], right: [] },
  availableColumns: _availableColumns = [],
  enabled: _enabled = true,
}: UseColumnPreferencesOptions & { enabled?: boolean }):
  | ColumnManagementState
  | undefined {
  // Generate the storage key - prefer schema.table format
  const finalStorageKey = useMemo(() => {
    if (schemaName && tableName) {
      return `advanced-table-prefs-${schemaName}.${tableName}`;
    }
    return storageKey || 'advanced-table-prefs-default';
  }, [schemaName, tableName, storageKey]);

  // Initialize state from localStorage or defaults
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = localStorage.getItem(finalStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          visibility: parsed.visibility || defaultVisibility,
          pinning: parsed.pinning || defaultPinning,
        };
      }
    } catch (error) {
      console.warn('Failed to load column preferences:', error);
    }
    return {
      visibility: defaultVisibility,
      pinning: defaultPinning,
    };
  });

  // Save to localStorage when preferences change
  const savePreferences = useCallback(
    (newPrefs: typeof preferences) => {
      try {
        localStorage.setItem(finalStorageKey, JSON.stringify(newPrefs));
        setPreferences(newPrefs);
      } catch (error) {
        console.warn('Failed to save column preferences:', error);
      }
    },
    [finalStorageKey],
  );

  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      savePreferences({
        ...preferences,
        visibility: {
          ...preferences.visibility,
          [columnId]: !(preferences.visibility[columnId] ?? true),
        },
      });
    },
    [preferences, savePreferences],
  );

  const isColumnPinned = useCallback(
    (columnId: string): 'left' | 'right' | false => {
      if (preferences.pinning.left?.includes(columnId)) return 'left';
      if (preferences.pinning.right?.includes(columnId)) return 'right';
      return false;
    },
    [preferences.pinning],
  );

  const toggleColumnPin = useCallback(
    (columnId: string, side: 'left' | 'right' = 'left') => {
      const currentSide = isColumnPinned(columnId);

      if (currentSide) {
        // Unpin the column
        savePreferences({
          ...preferences,
          pinning: {
            ...preferences.pinning,
            [currentSide]:
              preferences.pinning[currentSide]?.filter(
                (id: string) => id !== columnId,
              ) || [],
          },
        });
      } else {
        // Pin the column to the specified side
        if (side === 'left') {
          const currentLeftColumns = preferences.pinning[side] || [];
          const hasSelectColumn = currentLeftColumns.includes('select');

          // If pinning to left and there's a select column, ensure it stays first
          if (hasSelectColumn) {
            const otherColumns = currentLeftColumns.filter(
              (id: string) => id !== 'select',
            );
            savePreferences({
              ...preferences,
              pinning: {
                ...preferences.pinning,
                [side]: ['select', ...otherColumns, columnId],
              },
            });
          } else {
            // No select column, just add normally
            savePreferences({
              ...preferences,
              pinning: {
                ...preferences.pinning,
                [side]: [...currentLeftColumns, columnId],
              },
            });
          }
        } else {
          // For right side pinning, just add normally
          savePreferences({
            ...preferences,
            pinning: {
              ...preferences.pinning,
              [side]: [...(preferences.pinning[side] || []), columnId],
            },
          });
        }
      }
    },
    [preferences, savePreferences, isColumnPinned],
  );

  const resetPreferences = useCallback(() => {
    savePreferences({
      visibility: defaultVisibility,
      pinning: defaultPinning,
    });
  }, [defaultVisibility, defaultPinning, savePreferences]);

  return {
    columnVisibility: preferences.visibility,
    columnPinning: preferences.pinning,
    toggleColumnVisibility,
    toggleColumnPin,
    isColumnPinned,
    resetPreferences,
  };
}

/**
 * Batch selection hook
 */
function useBatchSelection<T>({
  items,
  getItemId,
  maxSelectable,
  enabled: _enabled = true,
}: {
  items: T[];
  getItemId: (item: T) => string;
  maxSelectable?: number;
  enabled?: boolean;
}): BatchSelectionState<T> | undefined {
  const [selectedRecords, setSelectedRecords] = useState<Map<string, T>>(
    new Map(),
  );

  const selectedIds = useMemo(
    () => new Set(selectedRecords.keys()),
    [selectedRecords],
  );

  const toggleSelection = useCallback(
    (id: string) => {
      setSelectedRecords((prev) => {
        const newMap = new Map(prev);

        if (newMap.has(id)) {
          newMap.delete(id);
        } else {
          if (maxSelectable && newMap.size >= maxSelectable) {
            return prev;
          }

          // Find the item in the current items array
          const item = items.find((item) => getItemId(item) === id);

          if (item) {
            newMap.set(id, item);
          }
        }

        return newMap;
      });
    },
    [items, getItemId, maxSelectable],
  );

  const toggleSelectAll = useCallback(
    (selectAll: boolean) => {
      setSelectedRecords((prev) => {
        const newMap = new Map(prev);

        if (selectAll) {
          if (maxSelectable && items.length > maxSelectable) {
            return prev;
          }

          // Add all current items to selection
          items.forEach((item) => {
            const id = getItemId(item);

            newMap.set(id, item);
          });
        } else {
          // Remove only current page items from selection
          items.forEach((item) => {
            const id = getItemId(item);

            newMap.delete(id);
          });
        }

        return newMap;
      });
    },
    [items, getItemId, maxSelectable],
  );

  const clearSelection = useCallback(() => {
    setSelectedRecords(new Map());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedRecords.has(id),
    [selectedRecords],
  );

  const isAllSelected = useMemo(() => {
    if (items.length === 0) {
      return false;
    }

    return items.every((item) => selectedRecords.has(getItemId(item)));
  }, [items, selectedRecords, getItemId]);

  const isAnySelected = useMemo(() => {
    if (items.length === 0) {
      return false;
    }

    return items.some((item) => selectedRecords.has(getItemId(item)));
  }, [items, selectedRecords, getItemId]);

  const isSomeSelected = useMemo(() => {
    if (items.length === 0) {
      return false;
    }

    const currentPageSelectedCount = items.filter((item) =>
      selectedRecords.has(getItemId(item)),
    ).length;

    return (
      currentPageSelectedCount > 0 && currentPageSelectedCount < items.length
    );
  }, [items, selectedRecords, getItemId]);

  const getSelectedRecords = useCallback(() => {
    return Array.from(selectedRecords.values());
  }, [selectedRecords]);

  return {
    selectedIds,
    selectedRecords,
    selectedCount: selectedRecords.size,
    isSelected,
    isAnySelected,
    isAllSelected,
    isSomeSelected,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    getSelectedRecords,
  };
}
