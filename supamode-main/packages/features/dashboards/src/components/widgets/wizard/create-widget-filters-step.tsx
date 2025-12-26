import { useCallback, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, FilterIcon } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import {
  type FilterItem,
  FilterOperator,
  type FilterValue,
} from '@kit/filters';
import { AddFilterDropdown, FiltersList } from '@kit/filters/components';
import { ColumnMetadata } from '@kit/types';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Form } from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { useTableColumns } from '../../../hooks/use-table-metadata';
import { adaptFiltersForQuery } from '../../../lib/filters/dashboard-filter-adapter';
import {
  createDashboardDisplayService,
  createDashboardTableDataLoader,
} from '../../../lib/filters/dashboard-services';
import type { AdvancedFilterCondition } from '../../../types';

type FiltersFormData = {
  filters?: AdvancedFilterCondition[];
};

function useFiltersForm(initialFilters: AdvancedFilterCondition[]) {
  const validationSchema = useMemo(
    () =>
      z.object({
        filters: z.array(z.any()).optional(),
      }),
    [],
  );

  return useForm<FiltersFormData>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      filters: initialFilters,
    },
  });
}

interface FilterContainerProps {
  schemaName: string;
  tableName: string;
  columns: ColumnMetadata[];
  currentFilters: AdvancedFilterCondition[];
  onFiltersChange: (filters: AdvancedFilterCondition[]) => void;
  canRemoveFilter?: (filter: AdvancedFilterCondition) => boolean;
}

function FilterContainer({
  schemaName,
  tableName,
  columns,
  currentFilters,
  onFiltersChange,
  canRemoveFilter,
}: FilterContainerProps) {
  const [openFilterName, setOpenFilterName] = useState<string | null>(null);
  const [addFilterOpen, setAddFilterOpen] = useState(false);

  // Create services for autocomplete functionality
  const tableDataLoader = useMemo(() => {
    return createDashboardTableDataLoader(schemaName, tableName);
  }, [schemaName, tableName]);

  const displayService = useMemo(() => createDashboardDisplayService(), []);

  // Convert current filters to FilterItem format for display
  const filters = useMemo(() => {
    return adaptFiltersForQuery(currentFilters, columns, []);
  }, [currentFilters, columns]);

  // Handle adding a new filter
  const handleAddFilter = useCallback(
    (column: ColumnMetadata) => {
      // Create new advanced filter directly
      const newAdvancedFilter: AdvancedFilterCondition = {
        column: column.name,
        operator: 'eq', // Default operator
        value: '',
      };

      const newAdvancedFilters = [...currentFilters, newAdvancedFilter];

      onFiltersChange(newAdvancedFilters);
      setOpenFilterName(column.name);
      setAddFilterOpen(false);
    },
    [currentFilters, onFiltersChange],
  );

  // Handle removing a filter
  const handleRemoveFilter = useCallback(
    (column: ColumnMetadata) => {
      const newAdvancedFilters = currentFilters.filter(
        (f) => f.column !== column.name,
      );

      onFiltersChange(newAdvancedFilters);
    },
    [currentFilters, onFiltersChange],
  );

  // Handle updating filter values
  const handleUpdateFilterValue = useCallback(
    (
      column: ColumnMetadata,
      filterValue: FilterValue,
      shouldClose?: boolean,
    ) => {
      const newAdvancedFilters = currentFilters.map((filter) => {
        if (filter.column === column.name) {
          return {
            ...filter,
            operator: filterValue.operator as FilterOperator,
            value: filterValue.value,
          };
        }
        return filter;
      });

      onFiltersChange(newAdvancedFilters);

      if (shouldClose) {
        setOpenFilterName(null);
      }
    },
    [currentFilters, onFiltersChange],
  );

  // Handle clearing all filters
  const handleClearFilters = useCallback(() => {
    // preserve filters that cannot be removed
    const filtersToPreserve = currentFilters.filter((filter) => {
      return canRemoveFilter ? !canRemoveFilter(filter) : false;
    });

    onFiltersChange(filtersToPreserve);
  }, [onFiltersChange, currentFilters, canRemoveFilter]);

  // Handle open/close state for filter popovers
  const handleOpenChange = useCallback(
    (filterName: string, isOpen: boolean) => {
      if (isOpen) {
        setOpenFilterName(filterName);
      } else {
        setOpenFilterName(null);
      }
    },
    [],
  );

  // Handle filter changes (operator changes, etc.)
  const handleFilterChange = useCallback(
    (updatedFilter: FilterItem) => {
      const newAdvancedFilters = currentFilters.map((filter) => {
        if (filter.column === updatedFilter.name) {
          return {
            ...filter,
            operator: updatedFilter.values[0]?.operator as FilterOperator,
            value: updatedFilter.values[0]?.value,
          };
        }
        return filter;
      });

      onFiltersChange(newAdvancedFilters);
    },
    [currentFilters, onFiltersChange],
  );

  return (
    <div className="flex justify-start gap-x-2.5">
      <AddFilterDropdown
        columns={columns}
        onSelect={handleAddFilter}
        open={addFilterOpen}
        onOpenChange={setAddFilterOpen}
      />

      <FiltersList
        filters={filters}
        onRemove={handleRemoveFilter}
        onValueChange={handleUpdateFilterValue}
        onOpenChange={handleOpenChange}
        onClearFilters={handleClearFilters}
        onFilterChange={handleFilterChange}
        openFilterName={openFilterName}
        canRemoveFilter={
          canRemoveFilter
            ? (filterItem) => {
                // Find the corresponding advanced filter
                const correspondingFilter = currentFilters.find(
                  (f) => f.column === filterItem.name,
                );

                return correspondingFilter
                  ? canRemoveFilter(correspondingFilter)
                  : true;
              }
            : undefined
        }
        tableDataLoader={tableDataLoader}
        displayService={displayService}
      />
    </div>
  );
}

function TimeConstraintTip({ columns }: { columns: ColumnMetadata[] }) {
  const hasDateTimeColumns = useMemo(() => {
    return columns.some((col) =>
      col.ui_config?.data_type
        ? ['date', 'timestamp', 'timestamp with time zone', 'time'].includes(
            col.ui_config.data_type,
          )
        : false,
    );
  }, [columns]);

  if (!hasDateTimeColumns) {
    return null;
  }

  return (
    <Alert variant="info">
      <Clock className="h-4 w-4" />

      <AlertTitle>
        <Trans i18nKey="dashboard:filters.tip.title" />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey="dashboard:filters.tip.timeConstraint" />
      </AlertDescription>
    </Alert>
  );
}

function EmptyFilterState() {
  return (
    <div className="bg-muted/50 rounded-lg border p-4 text-center">
      <div className="text-muted-foreground">
        <FilterIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />

        <p className="text-sm">
          <Trans i18nKey="dashboard:filters.noFiltersApplied" />
        </p>

        <p className="mt-1 text-xs">
          <Trans i18nKey="dashboard:filters.noFiltersOptional" />
        </p>
      </div>
    </div>
  );
}

function NoDataSourceState() {
  return (
    <div className="bg-muted/50 rounded-lg border p-8 text-center">
      <div className="text-muted-foreground">
        <FilterIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />

        <p className="mb-2 text-lg font-medium">
          <Trans i18nKey="dashboard:filters.configureDataSourceFirst" />
        </p>

        <p className="text-sm">
          <Trans i18nKey="dashboard:filters.configureDataSourceHelp" />
        </p>
      </div>
    </div>
  );
}

interface CreateWidgetFiltersProps {
  id?: string;
  data: {
    schemaName?: string;
    tableName?: string;
    config?: Record<string, unknown>;
  };

  onSubmit: (updates: { config?: Record<string, unknown> }) => void;
}

export function CreateWidgetFilters({
  id,
  data,
  onSubmit,
}: CreateWidgetFiltersProps) {
  const currentFilters =
    (data.config as { filters?: AdvancedFilterCondition[] })?.filters || [];

  const form = useFiltersForm(currentFilters);

  const { data: columns } = useTableColumns(
    data.schemaName || '',
    data.tableName || '',
  );

  const handleFiltersChange = useCallback(
    (filters: AdvancedFilterCondition[]) => {
      form.setValue('filters', filters, {
        shouldValidate: true,
        shouldDirty: true,
        shouldTouch: true,
      });
    },
    [form],
  );

  const handleFormSubmit = useCallback(
    (formData: FiltersFormData) => {
      onSubmit({
        config: {
          ...data.config,
          filters: formData.filters || [],
        },
      });
    },
    [onSubmit, data.config],
  );

  const hasDataSource = Boolean(
    data.schemaName && data.tableName && columns.length > 0,
  );

  const filters = useWatch({
    control: form.control,
    name: 'filters',
  });

  return (
    <div className="mx-auto w-full">
      <Form {...form}>
        <form id={id} onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="space-y-4">
            <If condition={hasDataSource}>
              <TimeConstraintTip columns={columns} />

              <FilterContainer
                schemaName={data.schemaName!}
                tableName={data.tableName!}
                columns={columns}
                currentFilters={filters || []}
                onFiltersChange={handleFiltersChange}
                canRemoveFilter={(filter) => {
                  return filter.config?.['isTrendFilter'] !== true;
                }}
              />

              <If condition={filters?.length === 0}>
                <EmptyFilterState />
              </If>
            </If>

            <If condition={!hasDataSource}>
              <NoDataSourceState />
            </If>
          </div>
        </form>
      </Form>
    </div>
  );
}
