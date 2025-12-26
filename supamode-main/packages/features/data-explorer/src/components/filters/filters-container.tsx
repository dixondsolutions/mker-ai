import { useState } from 'react';

import { useSearchParams } from 'react-router';

import {
  DisplayService,
  TableDataLoader,
  Views,
  createReactRouterAdapter,
  getSortableColumns,
  useFilterState,
  useFormatTimestamp,
} from '@kit/filters';
import {
  AddFilterDropdown,
  BatchSelectionActions,
  FiltersList,
  SearchInput,
  SortMenu,
  clearSearchInput,
} from '@kit/filters/components';
import { BatchSelection } from '@kit/shared/hooks';
import { ColumnMetadata, RelationConfig } from '@kit/types';
import { If } from '@kit/ui/if';

import { ColumnManagementPopover } from '../column-management-popover';
import { ColumnManagementState } from '../data-explorer-table';
import { SavedViewsDropdown } from './views-container';

export interface FiltersContainerProps {
  columns: ColumnMetadata[];
  className?: string;
  views?: Views;
  schemaName?: string;
  tableName?: string;
  relations: RelationConfig[];
  batchSelection: BatchSelection<Record<string, unknown>>;
  relatedData: Array<{
    column: string;
    original: string;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>;
  permissions: {
    canDelete: boolean;
  };
  onClearFilterContext?: () => void;
  columnManagementState?: ColumnManagementState | null;
  tableDataLoader: TableDataLoader;
  displayService: DisplayService;
}

/**
 * Data Explorer FiltersContainer compound component
 * Wraps the core filters functionality with data-explorer-specific features
 */
export function FiltersContainer(props: FiltersContainerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const formatTimestamp = useFormatTimestamp();
  const [addFilterOpen, setAddFilterOpen] = useState(false);

  // Create React Router state adapter for URL-based state management
  const stateAdapter = createReactRouterAdapter(searchParams, setSearchParams);

  // Use the filter state hook directly
  const {
    filters,
    openFilterName,
    sortState,
    search,
    addFilter,
    removeFilter,
    updateFilterValue,
    updateFilter,
    clearFilters,
    onOpenChange,
    updateSort,
    clearSort,
    updateSearch,
    clearSearch,
  } = useFilterState({
    columns: props.columns,
    relations: props.relations,
    relatedData: props.relatedData,
    stateAdapter,
    formatTimestamp,
  });

  const sortableColumns = getSortableColumns(props.columns);

  const handleClearSearch = () => {
    clearSearch();
    clearSearchInput();
    props.onClearFilterContext?.();
  };

  return (
    <div className="flex flex-col gap-1.5 rounded p-2">
      <SearchInput
        search={search}
        onSearchChange={updateSearch}
        onClear={handleClearSearch}
      />

      <div className="flex justify-between">
        <div className="flex w-full items-center justify-between gap-x-2">
          <div className="flex items-center gap-x-2">
            <If
              condition={
                props.batchSelection.isAnySelected &&
                props.permissions.canDelete
              }
            >
              <BatchSelectionActions
                batchSelection={props.batchSelection}
                onClearSelection={() => {
                  props.batchSelection.clearSelection();
                }}
              />
            </If>

            <AddFilterDropdown
              columns={props.columns}
              onSelect={(value) => {
                addFilter(value);
                setAddFilterOpen(false);
              }}
              open={addFilterOpen}
              onOpenChange={setAddFilterOpen}
            />

            <FiltersList
              filters={filters}
              onRemove={(column) => removeFilter(column.name)}
              onValueChange={updateFilterValue}
              onOpenChange={onOpenChange}
              onClearFilters={clearFilters}
              onFilterChange={updateFilter}
              openFilterName={openFilterName}
              tableDataLoader={props.tableDataLoader}
              displayService={props.displayService}
            />
          </div>

          <div className="flex items-center gap-2">
            <SavedViewsDropdown views={props.views} filters={filters} />

            <SortMenu
              columns={sortableColumns}
              currentSort={{
                direction: sortState.direction,
                column: sortState.column,
                columnName:
                  sortableColumns.find((item) => item.name === sortState.column)
                    ?.display_name ?? sortState.column,
              }}
              onSortChange={updateSort}
              onClearSort={clearSort}
            />

            {props.columnManagementState && (
              <ColumnManagementPopover
                columns={props.columns}
                columnVisibility={props.columnManagementState.columnVisibility}
                columnPinning={props.columnManagementState.columnPinning}
                onToggleVisibility={
                  props.columnManagementState.toggleColumnVisibility
                }
                onTogglePin={(columnId: string, side?: 'left' | 'right') => {
                  props.columnManagementState?.toggleColumnPin(columnId, side);
                }}
                isColumnPinned={(columnId: string) => {
                  const pinned =
                    props.columnManagementState?.isColumnPinned(columnId);

                  return pinned || false;
                }}
                onResetPreferences={
                  props.columnManagementState.resetPreferences
                }
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
