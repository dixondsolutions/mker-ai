import { useNavigation, useSearchParams } from 'react-router';

import { X } from 'lucide-react';

import { ColumnMetadata } from '@kit/types';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { FilterBadge } from './filter-badge';
import {
  DisplayService,
  FilterItem,
  FilterValue,
  TableDataLoader,
} from './types';

export function FiltersList(props: {
  filters: FilterItem[];
  onRemove: (column: ColumnMetadata) => void;
  onValueChange: (
    column: ColumnMetadata,
    value: FilterValue,
    shouldClose?: boolean,
  ) => void;
  onOpenChange: (filterName: string, isOpen: boolean) => void;
  onClearFilters: () => void;
  onFilterChange: (filter: FilterItem) => void;
  canRemoveFilter?: (filter: FilterItem) => boolean;
  openFilterName: string | null;
  tableDataLoader: TableDataLoader;
  displayService: DisplayService;
}) {
  const [searchParams] = useSearchParams();
  const hasSearchFilter = (searchParams.get('search') || '').length > 0;
  const isNavigating = useNavigation().state !== 'idle';

  const removableFilters = props.filters.filter((filter) => {
    return props.canRemoveFilter ? props.canRemoveFilter(filter) : true;
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {props.filters.map((filter) => (
        <FilterBadge
          key={filter.name}
          filter={filter}
          onRemove={props.onRemove}
          onValueChange={props.onValueChange}
          onOpenChange={props.onOpenChange}
          onFilterChange={props.onFilterChange}
          openFilterName={props.openFilterName}
          tableDataLoader={props.tableDataLoader}
          displayService={props.displayService}
          canRemove={props.canRemoveFilter}
        />
      ))}

      <If condition={removableFilters.length > 0 || hasSearchFilter}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="clear-all-filters-button"
          className="animate-in fade-in zoom-in-95 flex h-6 items-center gap-x-1"
          disabled={isNavigating}
          onClick={props.onClearFilters}
        >
          <X className="h-3 w-3" />

          <span className="text-xs font-normal">
            <Trans i18nKey="dataExplorer:filters.clearFilters" />
          </span>
        </Button>
      </If>
    </div>
  );
}
