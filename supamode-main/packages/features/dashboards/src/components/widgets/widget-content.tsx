import { useNavigate } from 'react-router';

import { AlertCircleIcon } from 'lucide-react';

import { buildResourceUrl } from '@kit/shared/utils';
import { Alert, AlertDescription } from '@kit/ui/alert';
import { If } from '@kit/ui/if';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { useTableColumns } from '../../hooks/use-table-metadata';
import { parseWidgetConfig } from '../../lib/widget-utils';
import type {
  DashboardWidget,
  WidgetData,
  WidgetOptionsByType,
  WidgetType,
} from '../../types';
import { ChartWidget } from './chart-widget';
import { MetricWidget } from './metric-widget';
import { TableWidget } from './table-widget';

interface WidgetContentProps {
  widget: DashboardWidget;
  data: WidgetData;
  relations?: Array<{
    column: string;
    original: unknown;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  onOptionsChange?: (
    options: Partial<WidgetOptionsByType[keyof WidgetOptionsByType]>,
  ) => void;
  options?: WidgetOptionsByType[keyof WidgetOptionsByType];
}

export function WidgetContent({
  widget,
  data,
  relations,
  isLoading,
  isError,
  error,
  onOptionsChange,
  options,
}: WidgetContentProps) {
  if (isLoading) {
    return <WidgetLoading />;
  }

  return (
    <div className="relative h-full">
      <If
        condition={isError}
        fallback={
          <div
            className={cn(
              'animate-in fade-in relative flex h-full flex-1 flex-col duration-300',
              isLoading && 'opacity-60',
            )}
          >
            <WidgetRenderer
              widget={widget}
              data={data}
              relations={relations}
              onOptionsChange={onOptionsChange}
              options={options}
            />
          </div>
        }
      >
        <WidgetError error={error} />
      </If>
    </div>
  );
}

function WidgetLoading() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 m-auto flex h-full flex-1 items-center justify-center duration-300">
      <Spinner className="h-6 w-6" />
    </div>
  );
}

interface WidgetErrorProps {
  error: Error | null;
}

function WidgetError({ error }: WidgetErrorProps) {
  return (
    <Alert variant="destructive" className="m-4">
      <AlertCircleIcon className="h-4 w-4" />

      <AlertDescription>
        {error instanceof Error ? (
          error.message
        ) : (
          <Trans i18nKey="dashboard:widgetContainer.failedToLoad" />
        )}
      </AlertDescription>
    </Alert>
  );
}

interface WidgetRendererProps {
  widget: DashboardWidget;
  data: WidgetData;
  relations?: Array<{
    column: string;
    original: unknown;
    formatted: string | null | undefined;
    link: string | null | undefined;
  }>;
  onOptionsChange?: (
    options: Partial<WidgetOptionsByType[keyof WidgetOptionsByType]>,
  ) => void;
  options?: WidgetOptionsByType[keyof WidgetOptionsByType];
}

function WidgetRenderer({
  widget,
  data,
  relations,
  onOptionsChange,
  options,
}: WidgetRendererProps) {
  const config = parseWidgetConfig(widget);
  const type = widget.widget_type as WidgetType;
  const navigate = useNavigate();

  // For table and chart widgets, fetch column metadata for display names
  const { data: columnMetadata, isLoading: _isColumnMetadataLoading } =
    useTableColumns(
      type === 'table' || type === 'chart' ? widget.schema_name : '',
      type === 'table' || type === 'chart' ? widget.table_name : '',
    );

  switch (type) {
    case 'chart':
      return (
        <ChartWidget
          data={data}
          config={config}
          columnMetadata={columnMetadata}
        />
      );

    case 'metric':
      return <MetricWidget data={data} config={config} />;

    case 'table': {
      // Convert generic options change to specific pagination and search changes
      const handlePaginationChange = (page: number, pageSize: number) => {
        onOptionsChange?.({ pagination: { page, pageSize } });
      };

      const handleSearchChange = (query: string) => {
        onOptionsChange?.({ search: { query } });
      };

      const handleSortChange = (
        column: string | null,
        direction: 'asc' | 'desc' | null,
      ) => {
        if (column && direction) {
          onOptionsChange?.({ sorting: { column, direction } });
        } else {
          onOptionsChange?.({ sorting: undefined });
        }
      };

      // Handle row clicks - navigate to data explorer record view
      const handleRowClick = (
        row: Record<string, unknown>,
        schemaName: string,
        tableName: string,
      ) => {
        if (!columnMetadata?.length) return;

        // Transform ColumnMetadata format to what buildResourceUrl expects
        const tableMetadata = {
          primary_keys: columnMetadata
            .filter((col) => col.is_primary_key)
            .map((col) => ({ column_name: col.name })),
          unique_constraints: [], // We don't have unique constraint info in ColumnMetadata
        };

        // Use the shared utility to build the resource URL
        const path = buildResourceUrl({
          schema: schemaName,
          table: tableName,
          record: row,
          tableMetadata,
        });

        if (path) {
          navigate(path);
        } else {
          console.warn(
            'Could not build resource URL for record - no primary keys or unique constraints found',
          );
        }
      };

      // Extract current page, search, and sorting from options if it's a table widget
      const tableOptions = options as WidgetOptionsByType['table'] | undefined;
      const currentPage = tableOptions?.pagination?.page || 1;
      const currentSearch = tableOptions?.search?.query || '';
      const currentSort = tableOptions?.sorting;

      return (
        <TableWidget
          data={data}
          config={config}
          columnMetadata={columnMetadata}
          relations={widget.widget_type === 'table' ? relations : undefined}
          schemaName={widget.schema_name}
          tableName={widget.table_name}
          onPaginationChange={handlePaginationChange}
          currentPage={currentPage}
          onSearchChange={handleSearchChange}
          currentSearch={currentSearch}
          onSortChange={handleSortChange}
          currentSort={currentSort}
          onRowClick={handleRowClick}
        />
      );
    }

    default:
      return <UnknownWidgetType widgetType={widget.widget_type} />;
  }
}

interface UnknownWidgetTypeProps {
  widgetType: string;
}

function UnknownWidgetType({ widgetType }: UnknownWidgetTypeProps) {
  return (
    <div className="text-muted-foreground flex h-32 items-center justify-center">
      <Trans
        i18nKey="dashboard:widgetContainer.unknownWidgetType"
        values={{ widgetType }}
      />
    </div>
  );
}
