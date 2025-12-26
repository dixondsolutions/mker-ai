import { useCallback, useMemo } from 'react';

import { SearchIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { formatValue } from '@kit/formatters';
import { DataExplorerCellRenderer } from '@kit/table';
import { AdvancedDataTable } from '@kit/table';
import type { ColumnMetadata } from '@kit/types';
import { Form, FormControl, FormField, FormItem } from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';
import { useAdvancedTableState } from '@kit/ui/use-advanced-table-state';
import { cn } from '@kit/ui/utils';

import type { TableWidgetConfig, WidgetData } from '../../types';

type Relation = {
  column: string;
  original: unknown;
  formatted: string | null | undefined;
  link: string | null | undefined;
};

interface TableWidgetProps {
  data?: WidgetData;
  config: TableWidgetConfig;
  isEditing?: boolean;
  className?: string;
  columnMetadata?: ColumnMetadata[];
  relations?: Relation[];
  schemaName?: string;
  tableName?: string;
  currentPage: number;
  currentSearch: string;
  currentSort?: { column: string; direction: 'asc' | 'desc' };
  onPaginationChange: (page: number, pageSize: number) => void;
  onSearchChange: (query: string) => void;
  onSortChange?: (
    column: string | null,
    direction: 'asc' | 'desc' | null,
  ) => void;
  onRowClick?: (row: Row, schemaName: string, tableName: string) => void;
}

type Row = Record<string, unknown>;

interface ProcessedTableData {
  rows: Row[];
  columns: ColumnMetadata[];
  totalCount: number;
  pageCount: number;
}

function useTableData(
  data?: WidgetData,
  config?: TableWidgetConfig,
  columnMetadata?: ColumnMetadata[],
): ProcessedTableData {
  return useMemo(() => {
    if (!data) {
      return { rows: [], columns: [], totalCount: 0, pageCount: 0 };
    }

    const dataRecord = data as unknown as Record<string, unknown>;

    if (!dataRecord['data'] || !Array.isArray(dataRecord['data'])) {
      return { rows: [], columns: [], totalCount: 0, pageCount: 0 };
    }

    const rawRows = dataRecord['data'];
    const totalRowCount = data['metadata']?.totalCount || rawRows.length;

    // Create column metadata from config or data
    let columns: ColumnMetadata[] = [];

    if (columnMetadata && columnMetadata.length > 0) {
      // Filter by configured columns if specified and not empty
      if (config?.columns && config.columns.length > 0) {
        columns = columnMetadata.filter((col) =>
          config.columns!.includes(col.name),
        );
      } else {
        // Show all visible columns when no specific columns configured
        columns = columnMetadata.filter((col) => col.is_visible_in_table);
      }
    } else if (rawRows.length > 0) {
      // Fallback: create basic column metadata from data
      const columnNames =
        config?.columns && config.columns.length > 0
          ? config.columns
          : Object.keys(rawRows[0]);

      columns = columnNames.map((name, index) => ({
        name,
        display_name: name,
        description: null,
        data_type: 'text',
        is_nullable: true,
        is_searchable: true,
        is_visible_in_table: true,
        is_visible_in_detail: true,
        default_value: null,
        is_sortable: true,
        is_filterable: true,
        is_editable: false,
        is_primary_key: false,
        is_required: false,
        ordering: index + 1,
        ui_config: {
          data_type: 'text',
          ui_data_type: undefined,
        },
        relations: [],
      }));
    }

    // Server-side pagination: use data as-is (already paginated on server)
    // The server should return metadata with pagination info
    const pageSize = config?.pageSize || 25;

    const serverPageCount =
      (data['metadata']?.['pageCount'] as number) ||
      Math.ceil(totalRowCount / pageSize);

    // Server handles all filtering and pagination
    const processedRows = rawRows;

    return {
      rows: processedRows, // Use server-provided data directly
      columns,
      totalCount: totalRowCount,
      pageCount: serverPageCount,
    };
  }, [data, config, columnMetadata]);
}

interface TableEmptyStateProps {
  className?: string;
}

function TableEmptyState({ className }: TableEmptyStateProps) {
  return (
    <div
      className={cn(
        'table-widget flex h-full items-center justify-center p-4',
        className,
      )}
    >
      <div className="text-muted-foreground text-center">
        <p className="text-sm">
          <Trans i18nKey="dashboard:widgets.table.config.noData" />
        </p>
      </div>
    </div>
  );
}

interface TableSearchBarProps {
  searchQuery: string;
  onSearchSubmit: (query: string) => void;
}

function TableSearchBar({ searchQuery, onSearchSubmit }: TableSearchBarProps) {
  const { t } = useTranslation();

  const form = useForm({
    defaultValues: {
      search: searchQuery || '',
    },
  });

  return (
    <div className="w-full p-2 pt-0.5">
      <Form {...form}>
        <form
          className="w-full"
          onSubmit={form.handleSubmit((data) => onSearchSubmit(data.search))}
        >
          <FormField
            name="search"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative w-full">
                    <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 h-4 w-4 -translate-y-1/2" />

                    <Input
                      placeholder={t(
                        'dashboard:widgets.table.config.enterSearchTerm',
                      )}
                      className="h-8 w-full pl-8"
                      {...field}
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}

interface FormattedCellRendererProps {
  value: unknown;
  column: ColumnMetadata;
  config: TableWidgetConfig;
  relation?: Relation;
}

function FormattedCellRenderer({
  value,
  column,
  config,
  relation,
}: FormattedCellRendererProps) {
  const formattedValue = useMemo(() => {
    const columnFormatter = config.columnFormatters?.[column.name];

    if (columnFormatter) {
      try {
        const formatterConfig = {
          type: columnFormatter.formatterType,
          ...columnFormatter.formatterConfig,
        };

        return formatValue(value, formatterConfig);
      } catch (error) {
        console.warn(
          `Failed to format value for column ${column.name}:`,
          error,
        );
        // Fall back to default cell renderer
      }
    }

    // Fall back to default cell renderer
    return null;
  }, [value, column.name, config.columnFormatters]);

  // If we have a formatted value, return it as a simple span
  if (formattedValue !== null) {
    return <span>{formattedValue}</span>;
  }

  // Otherwise use the default cell renderer with relation support
  return (
    <DataExplorerCellRenderer
      value={value}
      column={column}
      relation={relation}
    />
  );
}

export function TableWidget({
  data,
  config,
  isEditing,
  className,
  columnMetadata,
  relations,
  schemaName,
  tableName,
  currentPage,
  currentSearch,
  currentSort,
  onPaginationChange,
  onSearchChange,
  onSortChange,
  onRowClick,
}: TableWidgetProps) {
  const { rows, columns, pageCount } = useTableData(
    data,
    config,
    columnMetadata,
  );

  // Set up advanced table state with widget-specific configuration
  const tableState = useAdvancedTableState({
    storageKey: `table-widget-${config.title || 'untitled'}`,
    availableColumns: columns.map((col) => col.name),
    data: rows,
    getRecordId: (row) => {
      // Use first column value as ID or row index
      const firstCol = columns[0]?.name;

      return firstCol
        ? String(row[firstCol] || Math.random())
        : String(Math.random());
    },
    enableBatchSelection: config.selectable || false,
    enableColumnManagement: false, // Disable column management for widgets - use config instead
    // Handle sorting changes
    onSortChange: (column) => {
      if (onSortChange) {
        // If sortable is disabled in config, don't allow sorting
        if (config.sortable === false) {
          return;
        }

        // If clicking the same column that's already sorted, toggle direction or clear
        if (currentSort?.column === column) {
          if (currentSort.direction === 'asc') {
            onSortChange(column, 'desc');
          } else {
            // Clear sorting when clicking a descending sorted column
            onSortChange(null, null);
          }
        } else {
          // New column, sort ascending
          onSortChange(column, 'asc');
        }
      }
    },
  });

  const handleSearchSubmit = useCallback(
    (query: string) => {
      onSearchChange(query);
      // Reset to page 1 when search changes
      onPaginationChange(1, config.pageSize || 10);
    },
    [onSearchChange, onPaginationChange, config.pageSize],
  );

  const handlePaginationChange = useCallback(
    (pagination: { pageIndex: number; pageSize: number }) => {
      const newPage = pagination.pageIndex + 1;

      onPaginationChange(newPage, pagination.pageSize);
    },
    [onPaginationChange],
  );

  if (!rows.length && !isEditing) {
    return <TableEmptyState className={className} />;
  }

  const pageSize = config.pageSize || 10;

  // For server-side pagination widgets, ensure pageCount is at least 1 to show controls
  const displayPageCount = Math.max(pageCount, 1);

  return (
    <div
      className={cn('table-widget flex h-full max-w-full flex-col', className)}
    >
      <TableSearchBar
        searchQuery={currentSearch || ''}
        onSearchSubmit={handleSearchSubmit}
      />

      <div className="flex-1 overflow-y-auto px-2">
        <AdvancedDataTable
          columns={columns}
          data={rows}
          pagination={{
            pageIndex: currentPage - 1,
            pageSize,
            pageCount: displayPageCount,
          }}
          onPaginationChange={handlePaginationChange}
          forcePagination={true} // Force pagination for server-side widgets
          onRowClick={
            onRowClick && schemaName && tableName
              ? (row) => {
                  onRowClick(row.original as Row, schemaName, tableName);
                }
              : undefined
          }
          batchSelection={tableState.batchSelection}
          sortColumn={currentSort?.column ?? undefined}
          sortDirection={currentSort?.direction ?? undefined}
          onSortChange={tableState.onSortChange}
          CellRenderer={(props) => {
            // Find relation for this cell if available
            const relation = relations?.find(
              (rel) =>
                rel.column === props.column.name &&
                rel.original === props.value,
            );

            return (
              <FormattedCellRenderer
                value={props.value}
                column={props.column}
                config={config}
                relation={relation}
              />
            );
          }}
          enableBatchSelection={config.selectable || false}
          enableInlineEditing={false} // Widgets are read-only
          enableSorting={config.sortable !== false}
          getRecordId={(row) => {
            const firstCol = columns[0]?.name;

            return firstCol
              ? String(row[firstCol] || Math.random())
              : String(Math.random());
          }}
          sticky={config.fixedHeader ?? true}
          className="table-widget-content"
        />
      </div>
    </div>
  );
}
