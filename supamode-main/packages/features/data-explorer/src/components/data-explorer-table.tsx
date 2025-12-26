import { useCallback, useMemo } from 'react';

import {
  FetcherWithComponents,
  useFetcher,
  useSearchParams,
} from 'react-router';

import type {
  ColumnPinningState,
  Row,
  VisibilityState,
} from '@tanstack/react-table';

import { BatchSelection } from '@kit/shared/hooks';
import { buildResourceUrl } from '@kit/shared/utils';
import { DataExplorerCellRenderer } from '@kit/table';
import { AdvancedDataTable } from '@kit/table';
import { ColumnMetadata, RelationConfig, TableUiConfig } from '@kit/types';
import { useAdvancedTableState } from '@kit/ui/use-advanced-table-state';

import { FormFieldInlineEditor } from './record/form-field-inline-editor';

export interface ColumnManagementState {
  columnVisibility: VisibilityState;
  columnPinning: ColumnPinningState;
  toggleColumnVisibility: (columnId: string) => void;
  toggleColumnPin: (columnId: string, side?: 'left' | 'right') => void;
  isColumnPinned: (columnId: string) => 'left' | 'right' | false;
  resetPreferences: () => void;
}

const tableProps = {
  'data-testid': 'data-table',
};

export function DataExplorerTable<
  RecordData extends Record<string, unknown>,
>(props: {
  columns: ColumnMetadata[];
  config: TableUiConfig;
  relationsConfig: RelationConfig[];

  pagination: {
    pageIndex: number;
    pageSize: number;
    pageCount: number;
  };

  relations: Array<{
    column: string;
    original: unknown;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>;

  batchSelection: BatchSelection<RecordData>;
  data: RecordData[];
  canDeleteRecord: boolean;
  getRecordId: (record: RecordData) => string;

  className?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';

  // Batch selection props
  enableBatchSelection?: boolean;
  onRowClick?: (row: Row<RecordData>) => void;

  // Schema and table for scoped preferences
  schemaName: string;
  tableName: string;

  // Optional storage key for preferences (defaults to generated key)
  storageKey?: string;

  // External column management state (overrides internal state)
  externalColumnManagement?: ColumnManagementState;
}) {
  const {
    sortColumn,
    sortDirection: _sortDirection,
    enableBatchSelection = false,
    getRecordId,
    canDeleteRecord,
    schemaName: _schemaName,
    tableName: _tableName,
    storageKey: _storageKey,
    externalColumnManagement,
  } = props;

  const handleSortClick = useHandleSortClick();

  // Memoize available columns to prevent infinite loops
  const availableColumns = useMemo(
    () => props.columns.map((col) => col.name),
    [props.columns],
  );

  // Memoize sort handler for external injection
  const externalSortHandler = useCallback(
    (column: string) => {
      handleSortClick({
        columnName: column,
      });
    },
    [handleSortClick],
  );

  // Use advanced table state with proper memoization (column management disabled, handled at parent level)
  const tableState = useAdvancedTableState({
    schemaName: props.schemaName,
    tableName: props.tableName,
    storageKey: props.storageKey,
    availableColumns,
    data: props.data,
    getRecordId: props.getRecordId,
    onSortChange: externalSortHandler,
    enableBatchSelection: false, // We use external batch selection from props
    enableColumnManagement: false,
    defaultColumnPinning: {
      left: enableBatchSelection ? ['select'] : [],
      right: [],
    },
  });

  // No callback - column management handled internally

  // Build cell action URL for data explorer context
  const buildCellAction = useCallback(
    (record: RecordData) =>
      buildResourceUrl({
        schema: props.schemaName,
        table: props.tableName,
        record: record,
        tableMetadata: props.config,
      }),
    [props.schemaName, props.tableName, props.config],
  );

  // Build relation link for data explorer context
  const buildRelationLink = useCallback(
    (record: RecordData, column: string) => {
      return props.relations.find(
        (relation) =>
          relation.column === column && relation.original === record[column],
      );
    },
    [props.relations],
  );

  const getRecordIdCallback = useCallback(
    (record: RecordData) => getRecordId(record as RecordData),
    [getRecordId],
  );

  const { onRowClick } = props;

  const onRowClickCallback = useCallback(
    (row: Row<Record<string, unknown> | object>) => {
      if (onRowClick) {
        onRowClick(row as Row<RecordData>);
      }
    },
    [onRowClick],
  );

  const fetcher = useFetcher<{
    success: boolean;
    error: string;
    data: Record<string, unknown>;
  }>({
    key: 'inline-submit-fetcher',
  });

  return (
    <AdvancedDataTable<RecordData>
      sticky
      tableProps={tableProps}
      className={props.className}
      columns={props.columns}
      data={props.data}
      pagination={props.pagination}
      columnManagement={externalColumnManagement || tableState.columnManagement}
      batchSelection={props.batchSelection}
      sortColumn={sortColumn}
      sortDirection={_sortDirection}
      onSortChange={externalSortHandler}
      buildCellAction={buildCellAction}
      buildRelationLink={buildRelationLink}
      CellRenderer={getCellRenderer(fetcher)}
      enableBatchSelection={enableBatchSelection}
      enableInlineEditing={true}
      enableSorting={true}
      relationsConfig={props.relationsConfig}
      canDeleteRecord={canDeleteRecord}
      getRecordId={getRecordIdCallback}
      onRowClick={onRowClickCallback}
    />
  );
}

// Handle column sort click - Data Explorer specific logic
function useHandleSortClick() {
  const [searchParams, setSearchParams] = useSearchParams();

  return useCallback(
    (params: { columnName: string }) => {
      const { columnName } = params;

      // Get current sort state from URL parameters
      const currentSortColumn = searchParams.get('sort_column');
      const currentSortDirection = searchParams.get('sort_direction');

      setSearchParams((currentParams) => {
        const newParams = new URLSearchParams(currentParams);

        // If already sorting by this column, toggle direction
        if (currentSortColumn === columnName) {
          if (currentSortDirection === 'asc') {
            // Toggle to DESC - keep the column, flip direction
            newParams.set('sort_column', columnName);
            newParams.set('sort_direction', 'desc');
          } else {
            // If already desc, flip back to ASC - keep the column
            newParams.set('sort_column', columnName);
            newParams.set('sort_direction', 'asc');
          }
        } else {
          // Set new sort column and direction - always send both parameters
          newParams.set('sort_column', columnName);
          newParams.set('sort_direction', 'asc');
        }

        return newParams;
      });
    },
    [searchParams, setSearchParams],
  );
}

function getCellRenderer(
  fetcher: FetcherWithComponents<{
    success: boolean;
    error: string;
    data: Record<string, unknown>;
  }>,
) {
  return function CellRendererComponent(
    props: Omit<
      React.ComponentProps<typeof DataExplorerCellRenderer>,
      'fetcher'
    >,
  ) {
    return (
      <DataExplorerCellRenderer
        {...props}
        fetcher={fetcher}
        InlineEditor={FormFieldInlineEditor}
      />
    );
  };
}
