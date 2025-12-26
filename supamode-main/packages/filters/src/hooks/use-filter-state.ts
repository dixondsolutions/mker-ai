import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import isEqual from 'react-fast-compare';
import { useTranslation } from 'react-i18next';

import type { ColumnMetadata, RelationConfig } from '@kit/types';

import { hasValidValue } from '../shared';
import type { FilterItem, FilterValue, SortState } from '../types';
import {
  addFilter,
  filtersChanged,
  removeFilter,
  updateFilter,
  updateFilterValue,
} from '../utils/filter-state';
import {
  filtersToSearchParams,
  parseFiltersFromSearchParams,
} from '../utils/search-params';
import type { StateAdapter } from '../utils/state-adapters';

export interface UseFilterStateProps {
  columns: ColumnMetadata[];
  relations: RelationConfig[];
  relatedData: Array<{
    column: string;
    original: string;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>;
  stateAdapter: StateAdapter;
  formatTimestamp: (date: Date) => string;
}

export interface UseFilterStateReturn {
  filters: FilterItem[];
  openFilterName: string | null;
  sortState: SortState;
  search: string;
  activeViewId: string;

  // Filter actions
  addFilter: (column: ColumnMetadata) => void;
  removeFilter: (columnName: string) => void;
  updateFilterValue: (
    column: ColumnMetadata,
    filterValue: FilterValue,
    shouldClose?: boolean,
  ) => void;
  updateFilter: (filter: FilterItem) => void;
  clearFilters: () => void;

  // UI state actions
  setOpenFilterName: (filterName: string | null) => void;
  onOpenChange: (filterName: string, isOpen: boolean) => void;

  // Sort actions
  updateSort: (column: string, direction: 'asc' | 'desc') => void;
  clearSort: () => void;

  // Search actions
  updateSearch: (search: string) => void;
  clearSearch: () => void;
}

/**
 * useFilterState hook
 * @param props - The props for the useFilterState hook
 * @returns The useFilterState hook
 */
export function useFilterState({
  columns,
  relations,
  relatedData,
  stateAdapter,
  formatTimestamp,
}: UseFilterStateProps): UseFilterStateReturn {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<FilterItem[]>([]);
  const [openFilterName, setOpenFilterName] = useState<string | null>(null);
  const isInternalUpdate = useRef(false);

  // Initialize filters on mount
  useEffect(() => {
    const params = stateAdapter.getParams();
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      searchParams.set(key, value);
    });

    const initialFilters = parseFiltersFromSearchParams(
      searchParams,
      columns,
      relations,
      relatedData,
      formatTimestamp,
      t,
    );

    setFilters(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount - dependencies intentionally omitted

  // Derived state from adapter parameters
  const search = stateAdapter.getParam('search') || '';
  const sortColumn = stateAdapter.getParam('sort_column');

  const sortDirection = stateAdapter.getParam('sort_direction') as
    | 'asc'
    | 'desc'
    | null;

  const activeViewId = stateAdapter.getParam('view') || '';

  const sortState: SortState = useMemo(
    () => ({
      column: sortColumn,
      direction: sortDirection,
    }),
    [sortColumn, sortDirection],
  );

  // Update state parameters when filters or sort change
  const updateStateParams = useCallback(
    (newFilters: FilterItem[], newSort: SortState) => {
      isInternalUpdate.current = true; // Mark as internal update

      const params = filtersToSearchParams(
        newFilters,
        newSort,
        activeViewId,
        search,
      );

      // Convert URLSearchParams to object
      const paramsObj: Record<string, string> = {};

      for (const [key, value] of params.entries()) {
        paramsObj[key] = value;
      }

      stateAdapter.setParams(paramsObj);
    },
    [stateAdapter, activeViewId, search],
  );

  // Filter actions
  const handleAddFilter = useCallback(
    (column: ColumnMetadata) => {
      const newFilters = addFilter(filters, column, relations);

      if (newFilters !== filters) {
        setFilters(newFilters);
        setOpenFilterName(column.name);
      }
    },
    [filters, relations],
  );

  const handleRemoveFilter = useCallback(
    (columnName: string) => {
      const newFilters = removeFilter(filters, columnName);

      setFilters(newFilters);
      updateStateParams(newFilters, sortState);

      if (columnName === 'search') {
        stateAdapter.deleteParam('search');
      }
    },
    [filters, sortState, updateStateParams, stateAdapter],
  );

  const handleUpdateFilterValue = useCallback(
    (column: ColumnMetadata, filterValue: FilterValue, shouldClose = true) => {
      const newFilters = updateFilterValue(filters, column, filterValue);

      if (filtersChanged(filters, newFilters)) {
        setFilters(newFilters);
        updateStateParams(newFilters, sortState);
      }

      if (shouldClose) {
        setOpenFilterName(null);
      }
    },
    [filters, sortState, updateStateParams],
  );

  const handleUpdateFilter = useCallback(
    (filter: FilterItem) => {
      const newFilters = updateFilter(filters, filter);
      setFilters(newFilters);
    },
    [filters],
  );

  const handleClearFilters = useCallback(() => {
    setFilters([]);
    stateAdapter.clearParams();
  }, [stateAdapter]);

  // UI state actions
  const handleOpenChange = useCallback(
    (filterName: string, isOpen: boolean) => {
      if (isOpen) {
        setOpenFilterName(filterName);
      } else {
        const filterToCheck = filters.find((f) => f.name === filterName);
        setOpenFilterName(null);

        if (filterToCheck && !hasValidValue(filterToCheck)) {
          // No valid value, remove the filter
          const newFilters = removeFilter(filters, filterName);
          setFilters(newFilters);
        }
      }
    },
    [filters],
  );

  // Sort actions
  const handleUpdateSort = useCallback(
    (column: string, direction: 'asc' | 'desc') => {
      const newSort = { column, direction };
      updateStateParams(filters, newSort);
    },
    [filters, updateStateParams],
  );

  const handleClearSort = useCallback(() => {
    const newSort = { column: null, direction: null };
    updateStateParams(filters, newSort);
  }, [filters, updateStateParams]);

  // Search actions
  const handleUpdateSearch = useCallback(
    (newSearch: string) => {
      isInternalUpdate.current = true;
      stateAdapter.setParam('search', newSearch);
    },
    [stateAdapter],
  );

  const handleClearSearch = useCallback(() => {
    isInternalUpdate.current = true;
    stateAdapter.deleteParam('search');
  }, [stateAdapter]);

  // Create a stable string representation of parameters for comparison
  const paramString = useMemo(() => {
    const params = stateAdapter.getParams();
    // Filter out search parameter to avoid conflicts with search state
    const { search: _, ...filterParams } = params;

    return JSON.stringify(filterParams);
  }, [stateAdapter]);

  // Sync filters when parameters change (external changes only)
  // This is re-enabled with better infinite loop prevention
  useEffect(() => {
    // Skip if this was triggered by our own internal update
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const params = stateAdapter.getParams();
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (key !== 'search') {
        // Skip search parameter
        searchParams.set(key, value);
      }
    });

    const filtersFromParams = parseFiltersFromSearchParams(
      searchParams,
      columns,
      relations,
      relatedData,
      formatTimestamp,
      t,
    );

    // Only update if filters actually changed (deep comparison)
    if (!isEqual(filters, filtersFromParams)) {
      setFilters(filtersFromParams);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramString, columns, relations, relatedData, formatTimestamp, t]);

  return {
    filters,
    openFilterName,
    sortState,
    search,
    activeViewId,

    // Filter actions
    addFilter: handleAddFilter,
    removeFilter: handleRemoveFilter,
    updateFilterValue: handleUpdateFilterValue,
    updateFilter: handleUpdateFilter,
    clearFilters: handleClearFilters,

    // UI state actions
    setOpenFilterName,
    onOpenChange: handleOpenChange,

    // Sort actions
    updateSort: handleUpdateSort,
    clearSort: handleClearSort,

    // Search actions
    updateSearch: handleUpdateSearch,
    clearSearch: handleClearSearch,
  };
}
