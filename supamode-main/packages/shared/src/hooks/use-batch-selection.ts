import { useCallback, useMemo, useState } from 'react';

/**
 * Custom hook for batch selection of items
 * @param items - The items to select from
 * @param getItemId - A function to get the id of an item
 * @param maxSelectable - The maximum number of items that can be selected
 * @returns An object with the selected records, ids, count, and functions to toggle selection, select all, and clear selection
 */
export function useBatchSelection<T>(
  items: T[],
  getItemId: (item: T) => string,
  maxSelectable?: number,
) {
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

  const selectedCount = selectedRecords.size;

  // Get array of selected records
  const getSelectedRecords = useCallback(() => {
    return Array.from(selectedRecords.values());
  }, [selectedRecords]);

  return useMemo(
    () => ({
      selectedIds,
      selectedRecords,
      selectedCount,
      isSelected,
      isAnySelected,
      isAllSelected,
      isSomeSelected,
      toggleSelection,
      toggleSelectAll,
      clearSelection,
      getSelectedRecords,
      setSelectedRecords,
    }),
    [
      selectedIds,
      selectedRecords,
      selectedCount,
      isSelected,
      isAnySelected,
      isAllSelected,
      isSomeSelected,
      toggleSelection,
      toggleSelectAll,
      clearSelection,
      getSelectedRecords,
    ],
  );
}

export type BatchSelection<T = unknown> = ReturnType<
  typeof useBatchSelection<T>
>;
