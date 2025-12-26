import { useCallback, useEffect, useMemo } from 'react';

import {
  Link,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from 'react-router';

import { Row } from '@tanstack/react-table';
import { Grid2X2, PlusCircleIcon, SettingsIcon } from 'lucide-react';
import { getI18n } from 'react-i18next';

import { getLookupRelations } from '@kit/data-explorer-core/utils';
import { formatRecord } from '@kit/formatters';
import { BatchSelection, useBatchSelection } from '@kit/shared/hooks';
import { ColumnMetadata, RelationConfig, TableUiConfig } from '@kit/types';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { MagicCounter } from '@kit/ui/magic-counter';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';
import { useAdvancedTableState } from '@kit/ui/use-advanced-table-state';
import { cn } from '@kit/ui/utils';

import { savedViewsLoader } from '../api/loaders/saved-views-loader';
import { tableRouteLoader } from '../api/loaders/table-route-loader';
import { useTableTabManagement } from '../hooks/use-tab-management';
import {
  buildResourceUrl,
  getRecordIdentifier,
} from '../utils/build-resource-url';
import { useFilterContext } from '../utils/filter-context';
import {
  type ColumnManagementState,
  DataExplorerTable,
} from './data-explorer-table';
import { DataExplorerTabs } from './data-explorer-tabs';
import { FiltersContainer } from './filters/filters-container';

type TableRouteLoaderData = Awaited<ReturnType<typeof tableRouteLoader>>;
type SavedViews = Awaited<ReturnType<typeof savedViewsLoader>>;

type Permissions = {
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
};

// Define the loader data types
type TableData = TableRouteLoaderData;
type TableMetadata = Awaited<
  ReturnType<
    typeof import('../api/loaders/table-structure-loader').tableMetadataLoader
  >
> & {
  savedViews: SavedViews;
  permissions: Permissions;
};

type LoaderData = {
  tableData: TableData;
  metadata: TableMetadata;
};

// Batch selection (only if enabled and getRecordId is provided)
const MAX_BATCH_SIZE = 25;

export function DataExplorerTableRoute() {
  const { tableData, metadata } = useLoaderData<LoaderData>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Create service instances for dependency injection
  const tableDataLoaderAdapter = useMemo(() => {
    return async (params: {
      schema: string;
      table: string;
      page: number;
      search: string;
      properties: string | undefined;
      sortColumn?: string;
      sortDirection?: 'asc' | 'desc';
    }) => {
      const result = await tableRouteLoader(params);

      return {
        data: result.data,
        table: {
          displayFormat: result.table.displayFormat || undefined,
        },
      };
    };
  }, []);

  const data = tableData.data;
  const relations = useMemo<RelationConfig[]>(() => {
    return getLookupRelations(tableData.table.relationsConfig);
  }, [tableData.table.relationsConfig]);
  const savedViews = metadata.savedViews;

  // Add filter context management (saving only - restoration handled at router level)
  const { saveContext, clearContext } = useFilterContext(
    tableData.table.schemaName,
    tableData.table.tableName,
  );

  // Save context whenever search params change (filters change)
  // The utility function handles optimization to prevent unnecessary saves
  useEffect(() => {
    saveContext();
  }, [searchParams, saveContext]);

  // Tab management - handle tab creation and title updates
  useTableTabManagement(tableData.table?.displayName);

  const count = useMemo(() => {
    return Intl.NumberFormat(getI18n().resolvedLanguage).format(
      tableData.totalCount,
    );
  }, [tableData.totalCount]);

  const isNavigationLoading = navigation.state === 'loading';

  const sortColumn = searchParams.get('sort_column') ?? undefined;

  const sortDirection = (searchParams.get('sort_direction') ?? 'asc') as
    | 'asc'
    | 'desc'
    | undefined;

  const columns = useMemo(
    () => Object.values(tableData.table.columnsConfig!) as ColumnMetadata[],
    [tableData.table.columnsConfig],
  );

  const onRowClick = useCallback(
    (data: Record<string, unknown>) => {
      const schema = tableData.table.schemaName;
      const table = tableData.table.tableName;

      const url = buildResourceUrl({
        schema,
        table,
        record: data,
        tableMetadata: tableData.table.uiConfig as {
          primary_keys: Array<{ column_name: string }>;
          unique_constraints: Array<{ constraint_name: string }>;
        },
      });

      if (url) {
        return navigate(url);
      }
    },
    [
      navigate,
      tableData.table.schemaName,
      tableData.table.tableName,
      tableData.table.uiConfig,
    ],
  );

  const rowData = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

  // Create shared column management state for both table and filters
  const sharedColumnManagement = useAdvancedTableState({
    schemaName: tableData.table.schemaName,
    tableName: tableData.table.tableName,
    availableColumns: tableData.columns.map((col) => col.name),
    data: rowData,
    getRecordId: useCallback(
      (record: Record<string, unknown>) =>
        JSON.stringify(getRecordId(tableData.columns, record)),
      [tableData.columns],
    ),
    enableColumnManagement: true,
    enableBatchSelection: false,
    defaultColumnPinning: { left: ['select'], right: [] },
  });

  const batchSelection = useBatchSelection<Record<string, unknown>>(
    rowData,
    (record) => JSON.stringify(getRecordId(columns, record)),
    MAX_BATCH_SIZE,
  );

  return (
    <div className="flex h-screen flex-1 flex-col overflow-y-hidden !px-0 !py-0">
      <DataExplorerTabs />

      <Header
        permissions={metadata.permissions}
        tableDisplayName={tableData.table.displayName}
        tableName={tableData.table.tableName}
        schemaName={tableData.table.schemaName}
        count={count}
      />

      <div className="bg-background relative mx-2 mb-2 flex flex-1 flex-col overflow-hidden rounded-lg border">
        <Filters
          columns={tableData.columns}
          relations={relations}
          views={savedViews}
          schemaName={tableData.table.schemaName}
          tableName={tableData.table.tableName}
          relatedData={
            tableData.relations as unknown as Array<{
              column: string;
              original: string;
              formatted: string | null | undefined;
              link: string | null | undefined;
            }>
          }
          batchSelection={batchSelection}
          onClearFilterContext={clearContext}
          permissions={metadata.permissions}
          columnManagementState={sharedColumnManagement.columnManagement}
          tableDataLoader={tableDataLoaderAdapter}
          displayService={{
            applyDisplayFormat: (
              format: string,
              item: Record<string, unknown>,
            ) => formatRecord(format, item) || '',
          }}
        />

        <DataExplorerTable
          className={cn('transition-opacity', {
            'opacity-50': isNavigationLoading,
          })}
          config={tableData.table.uiConfig as TableUiConfig}
          columns={tableData.columns}
          relations={tableData.relations}
          pagination={tableData.pagination}
          data={rowData}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onRowClick={useCallback(
            (row: Row<Record<string, unknown>>) => onRowClick(row.original),
            [onRowClick],
          )}
          enableBatchSelection={true}
          batchSelection={batchSelection}
          canDeleteRecord={metadata.permissions.canDelete}
          getRecordId={useCallback(
            (record: Record<string, unknown>) =>
              JSON.stringify(getRecordId(columns, record)),
            [columns],
          )}
          schemaName={tableData.table.schemaName}
          tableName={tableData.table.tableName}
          relationsConfig={relations}
          externalColumnManagement={sharedColumnManagement.columnManagement}
        />
      </div>
    </div>
  );
}

function Header({
  tableName,
  schemaName,
  count,
  tableDisplayName,
  permissions,
}: {
  tableName: string;
  schemaName: string;
  count: number | string;
  tableDisplayName: string | null;
  permissions: Permissions;
}) {
  return (
    <div className="flex h-12 items-center justify-between px-2.5 py-0.5">
      <div>
        <span
          className="text-secondary-foreground animate-in fade-in slide-in-from-left-2 flex items-center gap-x-1.5 rounded-md py-0.5 text-sm"
          key={tableDisplayName || tableName + count}
        >
          <Grid2X2 className="text-muted-foreground h-4 w-4" />
          <span data-testid="table-title">
            {tableDisplayName || tableName}
          </span>{' '}
          <span className="text-muted-foreground text-xs" key={count}>
            <MagicCounter count={count} i18nKey="dataExplorer:table.count" />
          </span>
        </span>
      </div>

      <div className="flex items-center gap-x-2">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" asChild>
                <Link to={`/settings/resources/${schemaName}/${tableName}`}>
                  <SettingsIcon className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>

            <TooltipContent>
              <Trans i18nKey="dataExplorer:table.settings" />
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <If condition={permissions.canInsert}>
          <Button asChild size={'sm'} data-testid="create-record-link">
            <Link to="new">
              <PlusCircleIcon className="mr-2 h-3.5 w-3.5" />
              <Trans i18nKey="dataExplorer:table.createRecord" />
            </Link>
          </Button>
        </If>
      </div>
    </div>
  );
}

function Filters(props: {
  columns: ColumnMetadata[];
  relations: RelationConfig[];
  views: SavedViews;
  schemaName: string;
  tableName: string;
  batchSelection: BatchSelection<Record<string, unknown>>;
  relatedData: Array<{
    column: string;
    original: string;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>;
  onClearFilterContext?: () => void;
  permissions: Permissions;
  columnManagementState?: ColumnManagementState | null;
  tableDataLoader: (params: {
    schema: string;
    table: string;
    page: number;
    search: string;
    properties: string | undefined;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
  }) => Promise<{
    data: Record<string, unknown>[];
    table: { displayFormat?: string };
  }>;
  displayService: {
    applyDisplayFormat: (
      format: string,
      item: Record<string, unknown>,
    ) => string;
  };
}) {
  const filteredColumns = useMemo(() => {
    return props.columns.filter((col) => col.is_filterable);
  }, [props.columns]);

  return (
    <FiltersContainer
      className="p-1"
      columns={filteredColumns}
      views={props.views}
      schemaName={props.schemaName}
      tableName={props.tableName}
      relations={props.relations}
      relatedData={props.relatedData}
      batchSelection={props.batchSelection}
      permissions={props.permissions}
      onClearFilterContext={props.onClearFilterContext}
      columnManagementState={props.columnManagementState}
      tableDataLoader={props.tableDataLoader}
      displayService={props.displayService}
    />
  );
}

/**
 * Get the record id
 * @param columns - The columns of the table
 * @param record - The record to get the id for
 * @returns The record id
 */
function getRecordId(
  columns: ColumnMetadata[],
  record: Record<string, unknown>,
): Record<string, unknown> | null {
  const tableMetadata = {
    primaryKeys: columns
      .filter((col) => col.is_primary_key)
      .map((col) => col.name),
    uniqueConstraints: [],
  };

  // Get the record identifier
  const identifier = getRecordIdentifier({
    record,
    tableMetadata,
  });

  // Create a stable string identifier for batch selection
  switch (identifier.type) {
    case 'single':
      return {
        [identifier.column]: identifier.value,
      };

    case 'composite': {
      return Object.entries(identifier.values)
        .sort(([a], [b]) => a.localeCompare(b)) // Sort for consistency
        .reduce(
          (acc, [key, value]) => {
            acc[key] = value;
            return acc;
          },
          {} as Record<string, unknown>,
        );
    }

    case 'rowIndex':
      return {
        rowIndex: identifier.value,
      };

    case 'none':
    default:
      // we fail to identify the record, so we return null
      return null;
  }
}
