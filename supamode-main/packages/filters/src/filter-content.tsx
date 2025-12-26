import { useCallback, useMemo, useState } from 'react';

import { useForm } from 'react-hook-form';
import { getI18n, useTranslation } from 'react-i18next';

import { extractRelativeDateOption, isRelativeDate } from '@kit/filters-core';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import { Checkbox } from '@kit/ui/checkbox';
import { DataTypeIcon } from '@kit/ui/datatype-icon';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { cn } from '@kit/ui/utils';

import { AutocompleteDropdown } from './autocomplete-dropdown';
import { CalendarPopover } from './calendar-popover';
import { RELATIVE_DATE_PREFIX } from './constants';
import {
  formatRelativeDateForDisplay,
  getRelativeDateRange,
  parseDate,
  useFormatTimestamp,
  useTimezone,
} from './dates-utils';
import { useTableAccessCheck } from './hooks';
import { JsonFilterInput } from './json-filter-input';
import { OperatorDropdown } from './operators-dropdown';
import { RelativeDateSelector } from './relative-date-selector';
import { useGetFilterOptions } from './shared';
import {
  DisplayService,
  FilterItem,
  FilterOperator,
  FilterValue,
  TableDataLoader,
} from './types';

/**
 * FilterContent component
 * @param props - The props for the FilterContent component
 * @returns The FilterContent component
 */
export function FilterContent(props: {
  filter: FilterItem;
  onRemove: (filter: FilterItem) => void;
  onFilterChange: (filter: FilterItem) => void;
  onValueChange: (
    column: FilterItem,
    value: FilterValue,
    shouldClose?: boolean,
  ) => void;
  tableDataLoader: TableDataLoader;
  displayService: DisplayService;
}) {
  const { filter, onValueChange, onRemove, onFilterChange } = props;
  const { t } = useTranslation();

  const getFilterOptions = useGetFilterOptions(filter);

  const [displayInputError, setDisplayInputError] = useState(false);
  const timezone = useTimezone();

  const filterName = filter.display_name || filter.name;

  // Use react-hook-form to prevent re-renders on every keystroke
  const form = useForm({
    defaultValues: {
      textValue: filter.values[0]?.value?.toString() || '',
    },
    mode: 'onChange',
  });

  const formatTimestamp = useFormatTimestamp();

  const { register, getValues } = form;

  const options = useMemo(() => getFilterOptions(), [getFilterOptions]);

  // Get relation for foreign keys - extract at top level to use in hooks
  const relation = useMemo(() => {
    if (!filter.relations) return null;
    return (
      filter.relations.find((r) => r.source_column === filter.name) || null
    );
  }, [filter.relations, filter.name]);

  // Check table access for foreign key relations at top level
  const { hasAccess: hasRelationAccess } = useTableAccessCheck(
    relation?.target_schema || '',
    relation?.target_table || '',
  );

  // Local operator state to prevent immediate filter updates
  const [localOperator, setLocalOperator] = useState<FilterOperator | null>(
    () => (filter.values[0]?.operator as FilterOperator) || null,
  );

  // Local select value state for dropdown selections
  const [localSelectValue, setLocalSelectValue] = useState<string>(() => {
    return String(filter.values[0]?.value || '');
  });

  // Local boolean value state for checkbox selections
  const [localBooleanValue, setLocalBooleanValue] = useState<boolean | null>(
    () => {
      const currentValue = filter.values[0]?.value;

      return typeof currentValue === 'boolean' ? currentValue : null;
    },
  );

  // Add state for range values (for between operators)
  const [localStartValue, setLocalStartValue] = useState(() => {
    const currentValue = filter.values[0]?.value;

    if (typeof currentValue === 'string' && currentValue.includes(',')) {
      const parts = currentValue.split(',');

      return parts[0] || '';
    }

    return '';
  });

  const [localEndValue, setLocalEndValue] = useState(() => {
    const currentValue = filter.values[0]?.value;

    if (typeof currentValue === 'string' && currentValue.includes(',')) {
      const parts = currentValue.split(',');

      return parts[1] || '';
    }

    return '';
  });

  // State for custom calendar visibility
  const [showCustomCalendar, setShowCustomCalendar] = useState(() => {
    const currentValue = filter.values[0]?.value;

    const currentRelativeDateOption =
      typeof currentValue === 'string' && isRelativeDate(currentValue)
        ? extractRelativeDateOption(currentValue)
        : null;

    return (
      currentRelativeDateOption === 'custom' ||
      currentRelativeDateOption === null
    );
  });

  // Apply the current textValue (shared logic for Enter and blur)
  const applyTextValue = useCallback(() => {
    const currentOperator = localOperator || filter.values[0]?.operator;
    const value = getValues('textValue').trim();

    if (value) {
      const operatorToUse = currentOperator || 'eq';
      onValueChange(filter, { operator: operatorToUse, value }, true);
      setLocalOperator(operatorToUse as FilterOperator);
    } else {
      onRemove(filter);
    }
  }, [filter, onValueChange, getValues, onRemove, localOperator]);

  // Apply the filter when Enter is pressed
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();

        const currentOperator = localOperator || filter.values[0]?.operator;

        // Skip strict validation for operators that work with partial values
        const skipStrictValidation = [
          'contains',
          'startsWith',
          'endsWith',
        ].includes(currentOperator || '');

        const isValid =
          skipStrictValidation || (e.target as HTMLInputElement).validity.valid;

        if (!isValid) {
          setDisplayInputError(true);

          return;
        }

        applyTextValue();
      }
    },
    [applyTextValue, localOperator, setDisplayInputError, filter.values],
  );

  // Function to apply the operator change (only called when appropriate)
  const applyOperatorChange = useCallback(
    (operator: FilterOperator) => {
      const currentValue = filter.values[0]?.value;
      const isRelativeDateValue =
        typeof currentValue === 'string' && isRelativeDate(currentValue);
      const relativeDateOption = isRelativeDateValue
        ? extractRelativeDateOption(currentValue)
        : null;
      const previousOperator = filter.values[0]?.operator;

      const isBetweenOperator = (op: FilterOperator) =>
        op === 'between' || op === 'notBetween';

      const isNullOperator = (op: FilterOperator) =>
        op === 'isNull' || op === 'notNull';

      // For isNull and notNull operators, apply filter immediately
      if (isNullOperator(operator)) {
        const shouldClosePopover = true;
        onValueChange(filter, { operator, value: true }, shouldClosePopover);
        setLocalOperator(operator); // Sync local state
        return;
      }

      // Handle switching FROM relative date TO between operators
      if (
        isRelativeDateValue &&
        isBetweenOperator(operator) &&
        ['date', 'timestamp', 'timestamp with time zone'].includes(
          filter.ui_config.data_type,
        )
      ) {
        // Just update local UI state - don't call any change handlers that might close popover
        setShowCustomCalendar(true);
        setLocalOperator(operator);

        // Clear range values for clean state
        setLocalStartValue('');
        setLocalEndValue('');
        return;
      }

      // For between/notBetween operators, set up an empty range value
      // (but skip if we already handled the relative date → between case above)
      if (
        (isBetweenOperator(operator) ||
          isBetweenOperator(previousOperator as FilterOperator)) &&
        !(isRelativeDateValue && isBetweenOperator(operator))
      ) {
        // When switching TO between operators, force custom calendar mode
        if (isBetweenOperator(operator)) {
          setShowCustomCalendar(true);
        }

        // Use onValueChange to persist the state and keep filter open
        const shouldClosePopover = false;

        onValueChange(
          filter,
          {
            operator,
            value: '',
            label: undefined,
          },
          // Don't close the filter - user needs to enter range values
          shouldClosePopover,
        );
        setLocalOperator(operator); // Sync local state
        return;
      }

      // Handle switching FROM between operators to other operators
      if (
        isBetweenOperator(previousOperator as FilterOperator) &&
        !isBetweenOperator(operator)
      ) {
        // Clear range values when switching away from between operators
        setLocalStartValue('');
        setLocalEndValue('');

        // For date types, switch to relative date mode and set a sensible default
        if (
          ['date', 'timestamp', 'timestamp with time zone'].includes(
            filter.ui_config.data_type,
          )
        ) {
          setShowCustomCalendar(false); // Show relative date selector
          const shouldClosePopover = false; // Keep open for user to select relative date

          onValueChange(
            filter,
            {
              operator,
              value: '__rel_date:today', // Set a sensible default
              label: formatRelativeDateForDisplay('today', t),
            },
            shouldClosePopover,
          );
          setLocalOperator(operator); // Sync local state
          return;
        } else {
          // For non-date types, just clear the value
          onFilterChange({
            ...filter,
            values: [{ operator, value: null }],
          });

          setLocalOperator(operator); // Sync local state
          return;
        }
      }

      // If we have a relative date, preserve it when changing operators
      if (isRelativeDateValue && relativeDateOption) {
        const shouldClosePopover = true;

        onValueChange(
          filter,
          {
            operator,
            value: currentValue,
            label: formatRelativeDateForDisplay(relativeDateOption!, t),
          },
          shouldClosePopover,
        );
        setLocalOperator(operator); // Sync local state
        return;
      }

      if (currentValue) {
        const shouldClosePopover = true;

        onValueChange(
          filter,
          { operator, value: currentValue },
          shouldClosePopover,
        );
        setLocalOperator(operator); // Sync local state
      } else {
        // update filter with the new operator
        onFilterChange({
          ...filter,
          values: [{ operator, value: null }],
        });
        setLocalOperator(operator); // Sync local state
      }
    },
    [
      filter,
      onValueChange,
      onFilterChange,
      t,
      setLocalStartValue,
      setLocalEndValue,
      setShowCustomCalendar,
    ],
  );

  // For backward compatibility, keep onOperatorChange but make it apply immediately
  const onOperatorChange = useCallback(
    (operator: FilterOperator) => {
      // For null operators, apply immediately since they don't need user input
      const isNullOperator = (op: FilterOperator) =>
        op === 'isNull' || op === 'notNull';

      if (isNullOperator(operator)) {
        applyOperatorChange(operator);
        return;
      }

      // For ALL other operators (including between), just update local state
      // The between operator special handling is done in applyOperatorChange when values are provided
      setLocalOperator(operator);

      // For between operators switching from relative dates, also update UI state
      const isBetweenOperator = (op: FilterOperator) =>
        op === 'between' || op === 'notBetween';

      if (isBetweenOperator(operator)) {
        const currentValue = filter.values[0]?.value;

        const isRelativeDateValue =
          typeof currentValue === 'string' && isRelativeDate(currentValue);
        if (
          isRelativeDateValue &&
          ['date', 'timestamp', 'timestamp with time zone'].includes(
            filter.ui_config.data_type,
          )
        ) {
          setShowCustomCalendar(true);
          setLocalStartValue('');
          setLocalEndValue('');
        }
      }
    },
    [applyOperatorChange, filter.values, filter.ui_config.data_type],
  );

  // Determine which input to show based on data type and configuration
  const renderFilterInput = useCallback(() => {
    const currentOperator = localOperator || filter.values[0]?.operator;

    // If the operator is isNull or notNull, don't show any input field
    if (currentOperator === 'isNull' || currentOperator === 'notNull') {
      return (
        <div className="space-y-1">
          <div className="text-muted-foreground py-2 text-sm">
            {currentOperator === 'isNull'
              ? t('dataExplorer:filters.noValueNeededNull')
              : t('dataExplorer:filters.noValueNeededNotNull')}
          </div>
        </div>
      );
    }

    // If the operator is between or notBetween, show two input fields
    // Use local state to determine if we should show range inputs
    if (currentOperator === 'between' || currentOperator === 'notBetween') {
      // For date types, show calendars
      if (
        ['date', 'timestamp', 'timestamp with time zone'].includes(
          filter.ui_config.data_type,
        )
      ) {
        const startDate = parseDate(localStartValue);
        const endDate = parseDate(localEndValue);

        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">
                {t('dataExplorer:filters.rangeFrom')}
              </div>

              <CalendarPopover
                testId="date-range-start-calendar"
                date={startDate}
                onChange={(date) => setLocalStartValue(date)}
                disabled={(date) => (endDate ? date > endDate : false)}
              />
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">
                {t('dataExplorer:filters.rangeTo')}
              </div>

              <CalendarPopover
                testId="date-range-end-calendar"
                date={endDate}
                onChange={(date) => setLocalEndValue(date)}
                disabled={(date) => (startDate ? date < startDate : false)}
              />
            </div>

            <Button
              data-testid="apply-date-range-button"
              size="sm"
              className="w-full"
              onClick={() => {
                if (localStartValue && localEndValue) {
                  const rangeValue = `${localStartValue},${localEndValue}`;
                  const shouldClosePopover = true;

                  onValueChange(
                    filter,
                    {
                      operator: currentOperator,
                      value: rangeValue,
                    },
                    shouldClosePopover,
                  );
                }
              }}
              disabled={!localStartValue || !localEndValue}
            >
              {t('dataExplorer:filters.applyRange')}
            </Button>
          </div>
        );
      }

      // For numeric types, show number inputs
      if (
        ['integer', 'bigint', 'smallint', 'numeric'].includes(
          filter.ui_config.data_type,
        )
      ) {
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">
                {t('dataExplorer:filters.rangeFrom')}
              </div>

              <Input
                autoFocus={true}
                data-testid="filter-range-start-input"
                className="h-7 text-xs"
                type="number"
                value={localStartValue}
                onChange={(e) => setLocalStartValue(e.target.value.trim())}
              />
            </div>

            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">
                {t('dataExplorer:filters.rangeTo')}
              </div>

              <Input
                className="h-7 text-xs"
                data-testid="filter-range-end-input"
                type="number"
                value={localEndValue}
                onChange={(e) => setLocalEndValue(e.target.value.trim())}
              />
            </div>

            <Button
              className="w-full"
              data-testid="apply-range-button"
              onClick={() => {
                if (localStartValue && localEndValue) {
                  const rangeValue = `${localStartValue},${localEndValue}`;

                  onValueChange(
                    filter,
                    {
                      operator: currentOperator,
                      value: rangeValue,
                    },
                    true,
                  );
                }
              }}
              disabled={!localStartValue || !localEndValue}
            >
              {t('dataExplorer:filters.applyRange')}
            </Button>
          </div>
        );
      }

      // Default to text inputs for other types
      return (
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">
              {t('dataExplorer:filters.rangeFrom')}
            </div>

            <Input
              autoFocus={true}
              className="h-7 text-xs"
              type="text"
              value={localStartValue}
              onChange={(e) => setLocalStartValue(e.target.value.trim())}
            />
          </div>

          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">
              {t('dataExplorer:filters.rangeTo')}
            </div>

            <Input
              className="h-7 text-xs"
              type="text"
              value={localEndValue}
              onChange={(e) => setLocalEndValue(e.target.value.trim())}
            />
          </div>

          <Button
            className="w-full"
            onClick={() => {
              if (localStartValue && localEndValue) {
                const rangeValue = `${localStartValue},${localEndValue}`;

                onValueChange(
                  filter,
                  {
                    operator: currentOperator,
                    value: rangeValue,
                  },
                  true,
                );
              }
            }}
            disabled={!localStartValue || !localEndValue}
          >
            {t('dataExplorer:filters.applyRange')}
          </Button>
        </div>
      );
    }

    // Date type - show relative date selector and calendar
    if (
      ['date', 'timestamp', 'timestamp with time zone'].includes(
        filter.ui_config.data_type,
      )
    ) {
      const isTimestamp = filter.ui_config.data_type.includes('timestamp');

      // Get current relative date option if available
      const currentValue = filter.values[0]?.value;

      const currentRelativeDateOption =
        typeof currentValue === 'string' && isRelativeDate(currentValue)
          ? extractRelativeDateOption(currentValue)
          : null;

      return (
        <div className="space-y-3">
          {/* Relative date selector */}
          <div className="space-y-2">
            <RelativeDateSelector
              value={currentRelativeDateOption}
              onChange={(option) => {
                // Hide calendar when a non-custom option is selected
                setShowCustomCalendar(false);

                // Set the relative date
                const relativeValue = `${RELATIVE_DATE_PREFIX}${option}`;

                // Apply the relative date range
                const dateRange = getRelativeDateRange(option);

                // For operators that need a single date, use the start date
                // For 'between' use both start and end dates
                if (option !== 'custom') {
                  if (
                    dateRange.endDate &&
                    (currentOperator === 'between' ||
                      currentOperator === 'notBetween')
                  ) {
                    const shouldClosePopover = true;

                    onValueChange(
                      filter,
                      {
                        operator: currentOperator,
                        value: relativeValue,
                        label: formatRelativeDateForDisplay(option, t),
                      },
                      shouldClosePopover,
                    );
                  } else {
                    // For single date operators
                    const shouldClosePopover = true;

                    onValueChange(
                      filter,
                      {
                        operator: currentOperator || 'eq',
                        value: relativeValue,
                        label: formatRelativeDateForDisplay(option, t),
                      },
                      shouldClosePopover,
                    );
                  }
                }
              }}
              onCustomDateSelect={() => setShowCustomCalendar(true)}
            />
          </div>

          {showCustomCalendar && (
            <div className="space-y-2">
              <div className="text-muted-foreground text-xs">
                {t('dataExplorer:filters.customDate')}
              </div>

              <Calendar
                timeZone={timezone}
                classNames={{
                  root: 'w-full',
                }}
                mode="single"
                title={filterName}
                selected={(() => {
                  const value = filter.values[0]?.value;

                  if (value instanceof Date) {
                    return value;
                  }

                  if (typeof value === 'string' && !isRelativeDate(value)) {
                    const parsed = new Date(value);

                    return !Number.isNaN(parsed.getTime()) ? parsed : undefined;
                  }

                  return undefined;
                })()}
                onSelect={(date) => {
                  if (date) {
                    // For timestamps, preserve the current time if it exists
                    if (isTimestamp && filter.values[0]?.value) {
                      const currentValue = filter.values[0].value;
                      let currentDate: Date | undefined;

                      if (currentValue instanceof Date) {
                        currentDate = currentValue;
                      } else if (
                        typeof currentValue === 'string' &&
                        !isRelativeDate(currentValue)
                      ) {
                        const parsed = new Date(currentValue);

                        currentDate = !Number.isNaN(parsed.getTime())
                          ? parsed
                          : undefined;
                      }

                      if (currentDate) {
                        date.setHours(23);
                        date.setMinutes(59);
                        date.setSeconds(59);
                      }
                    }

                    const shouldClosePopover = true;

                    onValueChange(
                      filter,
                      {
                        operator: currentOperator || 'eq',
                        value: date.toISOString(),
                        label: formatTimestamp(date),
                      },
                      shouldClosePopover,
                    );
                  }
                }}
                className="rounded-md border"
              />
            </div>
          )}
        </div>
      );
    }

    // Boolean type - show checkboxes
    if (filter.ui_config.data_type === 'boolean') {
      return (
        <div className="space-y-2">
          {options.map((option) => (
            <div
              key={String(option.value)}
              className="flex items-center space-x-2"
            >
              <Checkbox
                data-testid="boolean-filter"
                id={`${filter.name}-${String(option.value)}`}
                checked={localBooleanValue === option.value}
                onCheckedChange={() => {
                  const newValue = option.value as boolean;
                  setLocalBooleanValue(newValue);

                  // Apply filter immediately for checkboxes as it's a deliberate selection
                  const operatorToUse =
                    localOperator || filter.values[0]?.operator || 'eq';

                  onValueChange(filter, {
                    operator: operatorToUse,
                    value: newValue,
                  });

                  setLocalOperator(operatorToUse as FilterOperator);
                }}
              />

              <label
                htmlFor={`${filter.name}-${String(option.value)}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {option.label}
              </label>
            </div>
          ))}
        </div>
      );
    }

    // For foreign keys - use autocomplete if user has access to related table
    if (relation && hasRelationAccess) {
      return (
        <div className="min-w-[200px] space-y-2">
          <AutocompleteDropdown
            onChange={(val, label) => {
              const shouldClosePopover = true;

              onValueChange(
                filter,
                { operator: localOperator!, value: val!, label },
                shouldClosePopover,
              );
            }}
            onBlur={applyTextValue}
            relation={relation}
            tableDataLoader={props.tableDataLoader}
            displayService={props.displayService}
          />
        </div>
      );
    }
    // If no access to related table, fall through to default text input

    // For enum values - show select dropdown
    if (options.length > 0) {
      return (
        <Select
          value={localSelectValue}
          onValueChange={(value) => {
            setLocalSelectValue(value);
            // Apply filter immediately for dropdowns as it's a deliberate selection
            const operatorToUse =
              localOperator || filter.values[0]?.operator || 'eq';

            onValueChange(filter, { operator: operatorToUse, value });
            setLocalOperator(operatorToUse as FilterOperator);
          }}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue placeholder={t('dataExplorer:filters.selectValue')} />
          </SelectTrigger>

          <SelectContent>
            {options.map((option) => (
              <SelectItem
                className="h-7 text-xs"
                key={String(option.value)}
                value={String(option.value)}
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    // JSON/JSONB types - show specialized JSON filter interface
    if (['json', 'jsonb'].includes(filter.ui_config.data_type)) {
      return (
        <JsonFilterInput
          filter={filter}
          currentOperator={localOperator}
          onValueChange={onValueChange}
          t={t}
        />
      );
    }

    // now we verify the UI Data Type
    const { type, placeholder, pattern, hint } = getInputConfig(filter);

    // Default - text input for text, unknown types, or anything else
    return (
      <div className="space-y-1">
        <Input
          {...register('textValue', {
            onChange: () => {
              setDisplayInputError(false);
            },
          })}
          data-testid="filter-value-input"
          className={cn('h-7 text-xs', {
            'text-destructive': displayInputError,
          })}
          onKeyDown={handleKeyDown}
          pattern={pattern}
          type={type}
          placeholder={placeholder}
        />

        <If
          condition={displayInputError}
          fallback={
            <div className="text-muted-foreground py-0.5 text-xs font-medium">
              {t('dataExplorer:filters.pressEnterToApply')}
            </div>
          }
        >
          <div className="text-destructive py-0.5 text-xs font-medium">
            {t('dataExplorer:filters.provideValidFormat', {
              type,
              hint,
            })}
          </div>
        </If>
      </div>
    );
  }, [
    localOperator,
    filter,
    relation,
    hasRelationAccess,
    options,
    register,
    displayInputError,
    handleKeyDown,
    t,
    localStartValue,
    localEndValue,
    onValueChange,
    showCustomCalendar,
    timezone,
    filterName,
    formatTimestamp,
    localBooleanValue,
    applyTextValue,
    props.tableDataLoader,
    props.displayService,
    localSelectValue,
  ]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-x-1 border-b p-2">
        <div className="flex items-center gap-x-1">
          <DataTypeIcon
            className={'text-muted-foreground h-3 w-3'}
            type={filter.ui_config.data_type}
          />

          <div className="text-sm font-medium">{filter.display_name}</div>
        </div>

        <If condition={!['json', 'jsonb'].includes(filter.ui_config.data_type)}>
          <OperatorDropdown
            operator={localOperator || filter.values[0]?.operator}
            onOperatorChange={onOperatorChange}
            dataType={filter.ui_config.data_type}
            isEnum={!!filter.ui_config.enum_values?.length}
          />
        </If>
      </div>

      <div className="px-2 py-1 pb-2">{renderFilterInput()}</div>
    </div>
  );
}

/**
 * Get the input config for a given filter
 */
function getInputConfig(filter: FilterItem) {
  const uiDataType = filter.ui_config.ui_data_type;
  const t = getI18n().t;

  // Number filters
  if (
    ['number', 'integer', 'bigint', 'smallint', 'numeric'].includes(
      filter.ui_config.data_type,
    )
  ) {
    return {
      type: 'number',
      placeholder: t('dataExplorer:filters.enterNumber'),
      hint: 'Ex. 123',
    };
  }

  // URL, image, audio and video filters
  if (
    uiDataType === 'url' ||
    uiDataType === 'image' ||
    uiDataType === 'audio' ||
    uiDataType === 'video'
  ) {
    return {
      type: 'url',
      placeholder: t('dataExplorer:filters.enterUrl'),
      hint: 'Ex. https://example.com',
    };
  }

  // Email filter
  if (uiDataType === 'email') {
    return {
      type: 'email',
      placeholder: t('dataExplorer:filters.enterEmail'),
      hint: 'Ex. example@example.com',
    };
  }

  // Color filter
  if (uiDataType === 'color') {
    return {
      type: 'color',
      placeholder: t('dataExplorer:filters.enterColor'),
      hint: '#FFFFFF',
    };
  }

  // UUID filter
  if (filter.ui_config.data_type === 'uuid') {
    return {
      type: 'text',
      placeholder: t('dataExplorer:filters.enterUuid'),
      hint: 'Ex. 123e4567-e89b-12d3-a456-426614174000',
      pattern: '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
    };
  }

  // Default text filter
  return {
    type: 'text',
    placeholder: t('dataExplorer:filters.enterValue'),
    hint: 'Ex. Hello World',
  };
}
