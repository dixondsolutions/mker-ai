import { useCallback, useMemo } from 'react';

import { useNavigation } from 'react-router';

import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { If } from '@kit/ui/if';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';

import {
  extractRelativeDateOption,
  formatRelativeDateForDisplay,
  isRelativeDate,
  useFormatDateForDisplay,
} from './dates-utils';
import { FilterContent } from './filter-content';
import { mapSqlToDateOperator } from './operators';
import { useGetFilterOptions } from './shared';
import {
  DisplayService,
  FilterItem,
  FilterValue,
  TableDataLoader,
} from './types';

/**
 * FilterBadge component
 * @param props - The props for the FilterBadge component
 * @returns The FilterBadge component
 */
export function FilterBadge({
  filter,
  onRemove,
  onValueChange,
  onOpenChange,
  onFilterChange,
  canRemove,
  openFilterName,
  tableDataLoader,
  displayService,
}: {
  filter: FilterItem;
  onRemove: (filter: FilterItem) => void;

  onValueChange: (
    filter: FilterItem,
    value: FilterValue,
    shouldClose?: boolean,
  ) => void;

  onOpenChange: (filterName: string, isOpen: boolean) => void;
  onFilterChange: (filter: FilterItem) => void;
  canRemove?: (filter: FilterItem) => boolean;
  openFilterName: string | null;
  tableDataLoader: TableDataLoader;
  displayService: DisplayService;
}) {
  const { t } = useTranslation();

  const formatDateForDisplay = useFormatDateForDisplay();
  const getFilterOptions = useGetFilterOptions(filter);
  const isNavigating = useNavigation().state !== 'idle';

  const filterName = filter.display_name || filter.name;

  const options = useMemo(() => getFilterOptions(), [getFilterOptions]);

  const onOpenChangeCallback = useCallback(
    (isOpen: boolean) => onOpenChange(filter.name, isOpen),
    [filter.name, onOpenChange],
  );

  // Create a label for the badge that shows the current filter value
  const getFilterDisplayValue = useCallback(() => {
    const currentValue = filter.values[0]?.value;
    const currentLabel = filter.values[0]?.label;

    let currentOperator = filter.values[0]?.operator;

    // Check if this is a relative date by examining the value directly
    const isRelativeDateValue =
      typeof currentValue === 'string' && isRelativeDate(currentValue);
    const relativeDateOption = isRelativeDateValue
      ? extractRelativeDateOption(currentValue)
      : null;

    const dataType = filter.ui_config.data_type;

    // If the field is a date type and we have a SQL operator, map it to our date-specific terminology
    if (['date', 'timestamp', 'timestamp with time zone'].includes(dataType)) {
      currentOperator = mapSqlToDateOperator(currentOperator || 'eq', dataType);
    }

    // If no value is selected yet
    if (currentValue === null || currentValue === undefined) {
      return filterName;
    }

    if (currentOperator === 'isNull') {
      return t('dataExplorer:filters.isEmpty', {
        name: filterName,
      });
    } else if (currentOperator === 'notNull') {
      return t('dataExplorer:filters.isNotEmpty', {
        name: filterName,
      });
    }

    // For between operators, show a more readable format
    if (currentOperator === 'between' || currentOperator === 'notBetween') {
      const opText =
        currentOperator === 'between'
          ? t('dataExplorer:operators.between')
          : t('dataExplorer:operators.notBetween');

      if (typeof currentValue !== 'string' || !currentValue.includes(',')) {
        return `${filterName} ${opText}`;
      }

      const parts = currentValue.split(',');
      const start = parts[0] || '';
      const end = parts[1] || '';

      if (
        ['date', 'timestamp', 'timestamp with time zone'].includes(
          filter.ui_config.data_type,
        )
      ) {
        // Format start date (handle relative dates and empty values)
        const formattedStart =
          start && start.trim()
            ? isRelativeDate(start)
              ? formatRelativeDateForDisplay(
                  extractRelativeDateOption(start)!,
                  t,
                )
              : formatDateForDisplay(start as string | Date)
            : t('dataExplorer:filters.pickADate');

        // Format end date (handle relative dates and empty values)
        const formattedEnd =
          end && end.trim()
            ? isRelativeDate(end)
              ? formatRelativeDateForDisplay(extractRelativeDateOption(end)!, t)
              : formatDateForDisplay(end as string | Date)
            : t('dataExplorer:filters.pickADate');

        return t('dataExplorer:filters.betweenDates', {
          name: filterName,
          start: formattedStart,
          end: formattedEnd,
          operator: opText,
        });
      }

      return t('dataExplorer:filters.betweenValues', {
        name: filterName,
        start: start,
        end: end,
        operator: opText,
      });
    }

    // For relative dates, use the translated name
    if (isRelativeDateValue && relativeDateOption) {
      const relativeLabel = t(
        `dataExplorer:relativeDates.${relativeDateOption}`,
      );

      // Get a user-friendly operator text
      let operatorText = '';

      if (currentOperator) {
        try {
          const op = currentOperator.split('.').pop() || currentOperator;
          operatorText = t(`dataExplorer:operators.${op}`).toLowerCase();
        } catch {
          const op = currentOperator.split('.').pop() || currentOperator;
          operatorText = op.replace(/([A-Z])/g, ' $1').toLowerCase();
        }
      }

      return `${filterName} ${operatorText} ${relativeLabel}`;
    }

    // Get a user-friendly operator text
    let operatorText = '';

    if (currentOperator) {
      try {
        const op = currentOperator.split('.').pop() || currentOperator;
        operatorText = t(`dataExplorer:operators.${op}`).toLowerCase();
      } catch {
        const op = currentOperator.split('.').pop() || currentOperator;
        operatorText = op.replace(/([A-Z])/g, ' $1').toLowerCase();
      }
    }

    // For date values (single value)
    if (
      ['date', 'timestamp', 'timestamp with time zone'].includes(
        filter.ui_config.data_type,
      )
    ) {
      return `${filterName} ${operatorText} ${formatDateForDisplay(currentValue as string | Date)}`;
    }

    // For boolean values
    if (typeof currentValue === 'boolean') {
      const boolText = currentValue
        ? t('dataExplorer:filters.true')
        : t('dataExplorer:filters.false');

      return `${filterName} ${operatorText} ${boolText}`;
    }

    // For enum values with a label
    if (options.length > 0) {
      const matchingOption = options.find(
        (opt: { value: string | boolean; label: string }) =>
          String(opt.value) === String(currentValue),
      );

      if (matchingOption) {
        return `${filterName} ${operatorText} ${matchingOption.label}`;
      }
    }

    // If we have a custom label, use it
    if (currentLabel && currentLabel !== String(currentValue)) {
      return `${filterName} ${operatorText} ${currentLabel}`;
    }

    // Default case
    return `${filterName} ${operatorText} ${String(currentValue)}`;
  }, [
    filterName,
    filter.ui_config.data_type,
    filter.values,
    formatDateForDisplay,
    options,
    t,
  ]);

  const isPopoverOpen = openFilterName === filter.name;
  const canRemoveFilter = canRemove ? canRemove?.(filter) : true;

  return (
    <Popover
      open={isPopoverOpen}
      onOpenChange={onOpenChangeCallback}
      modal={true}
    >
      <PopoverTrigger asChild disabled={isNavigating}>
        <Badge
          role="button"
          tabIndex={0}
          variant="outline"
          data-testid={`filter-badge`}
          data-filter-badge-name={filter.display_name}
          className="hover:border-primary/40 active:bg-muted focus:border-primary h-6 cursor-default px-2 py-1 outline-none focus:ring-0 focus:ring-offset-0"
          onKeyDown={(e) => {
            // If the Enter key is pressed, click the badge to open the popover
            const isEnterKey = e.key === 'Enter';

            if (isEnterKey) {
              (e.target as HTMLElement).click();
            }
          }}
        >
          <div className="flex items-center gap-1">
            <span className="font-normal">{getFilterDisplayValue()}</span>

            <If condition={canRemoveFilter}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                data-testid="remove-filter-button"
                className="hover:bg-muted hover:border-border h-4 w-4 rounded-full border border-transparent p-0"
                disabled={isNavigating}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(filter);
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </If>
          </div>
        </Badge>
      </PopoverTrigger>

      <PopoverContent className="w-auto min-w-80 p-0" align="start">
        <FilterContent
          filter={filter}
          onValueChange={onValueChange}
          onRemove={onRemove}
          onFilterChange={onFilterChange}
          tableDataLoader={tableDataLoader}
          displayService={displayService}
        />
      </PopoverContent>
    </Popover>
  );
}
