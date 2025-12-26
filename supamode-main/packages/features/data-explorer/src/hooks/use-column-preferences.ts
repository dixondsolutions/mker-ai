import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  ColumnPinningState,
  VisibilityState,
} from '@tanstack/react-table';

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

interface TablePreferences {
  visibility: VisibilityState;
  pinning: ColumnPinningState;
  version: number; // For future migration compatibility
}

interface UseColumnPreferencesReturn {
  /** Current column visibility state */
  columnVisibility: VisibilityState;
  /** Current column pinning state */
  columnPinning: ColumnPinningState;
  /** Update column visibility */
  setColumnVisibility: (
    updater: VisibilityState | ((old: VisibilityState) => VisibilityState),
  ) => void;
  /** Update column pinning */
  setColumnPinning: (
    updater:
      | ColumnPinningState
      | ((old: ColumnPinningState) => ColumnPinningState),
  ) => void;
  /** Toggle visibility for a specific column */
  toggleColumnVisibility: (columnId: string) => void;
  /** Toggle pin state for a specific column */
  toggleColumnPin: (columnId: string, side?: 'left' | 'right') => void;
  /** Check if a column is pinned */
  isColumnPinned: (columnId: string) => 'left' | 'right' | false;
  /** Reset all preferences to defaults */
  resetPreferences: () => void;
}

/**
 * Hook to manage column preferences (visibility and pinning) with localStorage persistence
 */
export function useColumnPreferences({
  schemaName,
  tableName,
  storageKey,
  defaultVisibility = {},
  defaultPinning = { left: [], right: [] },
  availableColumns = [],
}: UseColumnPreferencesOptions): UseColumnPreferencesReturn {
  // Generate the storage key - prefer schema.table format
  const finalStorageKey = useMemo(() => {
    if (schemaName && tableName) {
      return `data-explorer-prefs-${schemaName}.${tableName}`;
    }

    return storageKey || 'data-explorer-prefs-default';
  }, [schemaName, tableName, storageKey]);

  // Helper function to validate and clean preferences
  const validatePreferences = useCallback(
    (prefs: Partial<TablePreferences>): TablePreferences => {
      const defaults: TablePreferences = {
        visibility: defaultVisibility,
        pinning: defaultPinning,
        version: 1,
      };

      if (!prefs || typeof prefs !== 'object') return defaults;

      let { visibility = defaultVisibility, pinning = defaultPinning } = prefs;

      // Validate visibility state
      if (availableColumns.length > 0) {
        const cleanedVisibility: VisibilityState = {};

        Object.entries(visibility).forEach(([columnId, visible]) => {
          if (availableColumns.includes(columnId)) {
            cleanedVisibility[columnId] = visible;
          }
        });

        visibility = cleanedVisibility;
      }

      // Validate pinning state
      if (availableColumns.length > 0) {
        pinning = {
          left:
            pinning.left?.filter((columnId) =>
              availableColumns.includes(columnId),
            ) || [],
          right:
            pinning.right?.filter((columnId) =>
              availableColumns.includes(columnId),
            ) || [],
        };
      }

      return {
        visibility,
        pinning,
        version: 1,
      };
    },
    [defaultVisibility, defaultPinning, availableColumns],
  );

  // Initialize state from localStorage or defaults
  const [preferences, setPreferences] = useState<TablePreferences>(() => {
    try {
      const stored = localStorage.getItem(finalStorageKey);
      const parsedPrefs = stored ? JSON.parse(stored) : {};
      return validatePreferences(parsedPrefs);
    } catch {
      return validatePreferences({});
    }
  });

  const { visibility: columnVisibility, pinning: columnPinning } = preferences;

  // Persist all preferences to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(finalStorageKey, JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save column preferences:', error);
    }
  }, [finalStorageKey, preferences]);

  // Updater functions that support both direct values and updater functions
  const setColumnVisibility = useCallback(
    (
      updater: VisibilityState | ((old: VisibilityState) => VisibilityState),
    ) => {
      setPreferences((prev) => ({
        ...prev,
        visibility:
          typeof updater === 'function' ? updater(prev.visibility) : updater,
      }));
    },
    [],
  );

  const setColumnPinning = useCallback(
    (
      updater:
        | ColumnPinningState
        | ((old: ColumnPinningState) => ColumnPinningState),
    ) => {
      setPreferences((prev) => ({
        ...prev,
        pinning:
          typeof updater === 'function' ? updater(prev.pinning) : updater,
      }));
    },
    [],
  );

  // Toggle column visibility
  const toggleColumnVisibility = useCallback(
    (columnId: string) => {
      setColumnVisibility((prev) => ({
        ...prev,
        [columnId]: !(prev[columnId] ?? true), // Default to visible if not set
      }));
    },
    [setColumnVisibility],
  );

  // Check if column is pinned and return side
  const isColumnPinned = useCallback(
    (columnId: string): 'left' | 'right' | false => {
      if (columnPinning.left?.includes(columnId)) return 'left';
      if (columnPinning.right?.includes(columnId)) return 'right';
      return false;
    },
    [columnPinning],
  );

  // Toggle column pin state
  const toggleColumnPin = useCallback(
    (columnId: string, side: 'left' | 'right' = 'left') => {
      setColumnPinning((prev) => {
        const currentSide = isColumnPinned(columnId);

        // If already pinned, unpin it
        if (currentSide) {
          return {
            ...prev,
            [currentSide]:
              prev[currentSide]?.filter((id) => id !== columnId) || [],
          };
        }

        // If not pinned, pin it to the specified side
        if (side === 'left') {
          const currentLeftColumns = prev[side] || [];
          const hasSelectColumn = currentLeftColumns.includes('select');

          // If pinning to left and there's a select column, ensure it stays first
          if (hasSelectColumn) {
            const otherColumns = currentLeftColumns.filter(
              (id: string) => id !== 'select',
            );
            return {
              ...prev,
              [side]: ['select', ...otherColumns, columnId],
            };
          } else {
            // No select column, just add normally
            return {
              ...prev,
              [side]: [...currentLeftColumns, columnId],
            };
          }
        } else {
          // For right side pinning, just add normally
          return {
            ...prev,
            [side]: [...(prev[side] || []), columnId],
          };
        }
      });
    },
    [setColumnPinning, isColumnPinned],
  );

  // Reset all preferences
  const resetPreferences = useCallback(() => {
    setPreferences({
      visibility: defaultVisibility,
      pinning: defaultPinning,
      version: 1,
    });
  }, [defaultVisibility, defaultPinning]);

  return {
    columnVisibility,
    columnPinning,
    setColumnVisibility,
    setColumnPinning,
    toggleColumnVisibility,
    toggleColumnPin,
    isColumnPinned,
    resetPreferences,
  };
}
