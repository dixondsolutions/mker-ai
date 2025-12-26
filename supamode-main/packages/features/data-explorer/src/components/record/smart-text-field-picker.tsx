import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, Loader2Icon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Subject, debounceTime, map } from 'rxjs';

import { ColumnMetadata } from '@kit/types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@kit/ui/command';
import { Input } from '@kit/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { Skeleton } from '@kit/ui/skeleton';
import { cn } from '@kit/ui/utils';

import { fieldValuesLoader } from '../../api/loaders/table-route-loader';

interface PickerState {
  open: boolean;
  inputValue: string;
  searchQuery: string;
  debouncedSearchQuery: string;
  selectedIndex: number;
}

type PickerAction =
  | { type: 'SET_OPEN'; payload: boolean }
  | { type: 'SET_INPUT_VALUE'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_DEBOUNCED_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SELECTED_INDEX'; payload: number }
  | { type: 'RESET_SELECTION' }
  | { type: 'RESET' };

function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case 'SET_OPEN':
      return { ...state, open: action.payload };
    case 'SET_INPUT_VALUE':
      return { ...state, inputValue: action.payload };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_DEBOUNCED_SEARCH_QUERY':
      return { ...state, debouncedSearchQuery: action.payload };
    case 'SET_SELECTED_INDEX':
      return { ...state, selectedIndex: action.payload };
    case 'RESET_SELECTION':
      return { ...state, selectedIndex: -1 };
    case 'RESET':
      return {
        open: false,
        inputValue: '',
        searchQuery: '',
        debouncedSearchQuery: '',
        selectedIndex: -1,
      };
    default:
      return state;
  }
}

interface SmartTextFieldPickerProps {
  field: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    ref?: React.Ref<HTMLInputElement>;
  };
  column: ColumnMetadata;
  schema: string;
  table: string;
  placeholder?: string;
  className?: string;
}

export function SmartTextFieldPicker({
  field,
  column,
  schema,
  table,
  placeholder,
  className,
}: SmartTextFieldPickerProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  const [state, dispatch] = useReducer(pickerReducer, {
    open: false,
    inputValue: field.value || '',
    searchQuery: '',
    debouncedSearchQuery: '',
    selectedIndex: -1,
  });

  const searchSubject$ = useMemo(() => new Subject<string>(), []);

  // Sync external value changes
  useEffect(() => {
    if (field.value !== state.inputValue) {
      dispatch({ type: 'SET_INPUT_VALUE', payload: field.value || '' });
    }
  }, [field.value, state.inputValue]);

  // Set up RxJS debouncing for search
  useEffect(() => {
    const subscription = searchSubject$
      .pipe(
        debounceTime(300),
        map((query) => query.trim()),
      )
      .subscribe((debouncedQuery) => {
        dispatch({
          type: 'SET_DEBOUNCED_SEARCH_QUERY',
          payload: debouncedQuery,
        });
      });

    return () => subscription.unsubscribe();
  }, [searchSubject$]);

  // Load top hits when popover opens or no search query
  const { data: topHitsData, isLoading: isTopHitsLoading } = useQuery({
    queryKey: ['field-top-hits', schema, table, column.name],
    queryFn: () => loadFieldTopHits(schema, table, column.name),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(state.open && schema && table && column.name),
  });

  // Load search results when there's a search query
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: [
      'field-search',
      schema,
      table,
      column.name,
      state.debouncedSearchQuery,
    ],
    queryFn: () =>
      loadFieldSearchResults(
        schema,
        table,
        column.name,
        state.debouncedSearchQuery,
      ),
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: Boolean(
      state.open &&
        schema &&
        table &&
        column.name &&
        state.debouncedSearchQuery &&
        state.debouncedSearchQuery.length >= 2,
    ),
  });

  const topHits = useMemo(() => topHitsData || [], [topHitsData]);
  const searchOptions = useMemo(() => searchResults || [], [searchResults]);

  const hasSearchQuery = state.debouncedSearchQuery.length >= 2;
  const hasSearchResults = searchOptions.length > 0;
  const hasTopHits = topHits.length > 0;
  const isLoading = isTopHitsLoading || isSearchLoading;

  // Get all available options for keyboard navigation
  const allOptions = useMemo(() => {
    if (hasSearchQuery && hasSearchResults) {
      return searchOptions;
    }

    return topHits;
  }, [hasSearchQuery, hasSearchResults, searchOptions, topHits]);

  const handleInputChange = useCallback(
    (value: string) => {
      dispatch({ type: 'SET_INPUT_VALUE', payload: value });
      dispatch({ type: 'SET_SEARCH_QUERY', payload: value });
      dispatch({ type: 'RESET_SELECTION' });
      field.onChange(value);
      searchSubject$.next(value);
    },
    [field, searchSubject$],
  );

  const handleSelectValue = useCallback(
    (value: string) => {
      dispatch({ type: 'SET_INPUT_VALUE', payload: value });
      field.onChange(value);
      dispatch({ type: 'SET_OPEN', payload: false });
      dispatch({ type: 'RESET_SELECTION' });

      // Return focus to input
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    },
    [field],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!state.open) {
        if (e.key === 'ArrowDown' || e.key === 'Enter') {
          e.preventDefault();
          dispatch({ type: 'SET_OPEN', payload: true });
        }
        return;
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          dispatch({
            type: 'SET_SELECTED_INDEX',
            payload: Math.min(state.selectedIndex + 1, allOptions.length - 1),
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          dispatch({
            type: 'SET_SELECTED_INDEX',
            payload: Math.max(state.selectedIndex - 1, 0),
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (state.selectedIndex >= 0) {
            const selectedOption = allOptions[state.selectedIndex];
            if (selectedOption) {
              handleSelectValue(selectedOption.value);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          dispatch({ type: 'SET_OPEN', payload: false });
          dispatch({ type: 'RESET_SELECTION' });
          inputRef.current?.blur();
          break;
      }
    },
    [state.open, state.selectedIndex, allOptions, handleSelectValue],
  );

  return (
    <Popover
      open={state.open}
      onOpenChange={(open) => {
        dispatch({ type: 'SET_OPEN', payload: open });
        if (!open) {
          dispatch({ type: 'RESET_SELECTION' });
          dispatch({ type: 'SET_SEARCH_QUERY', payload: '' });
          dispatch({ type: 'SET_DEBOUNCED_SEARCH_QUERY', payload: '' });
        }
      }}
    >
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Input
            ref={(el) => {
              inputRef.current = el;

              if (field.ref) {
                if (typeof field.ref === 'function') {
                  field.ref(el);
                } else {
                  const ref =
                    field.ref as React.MutableRefObject<HTMLInputElement | null>;

                  ref.current = el;
                }
              }
            }}
            value={state.inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={field.disabled}
            className={cn('pr-9', className)}
            data-testid="smart-text-field-input"
            data-field-name={column.name}
            name={column.name}
            autoComplete="off"
            role="combobox"
            aria-expanded={state.open}
            aria-haspopup="listbox"
            aria-label={`${column.name} field with smart suggestions`}
          />

          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            {isLoading && state.open ? (
              <Loader2Icon className="text-muted-foreground h-4 w-4 animate-spin" />
            ) : (
              <ChevronDownIcon
                className={cn(
                  'text-muted-foreground h-4 w-4 transition-transform',
                  state.open && 'rotate-180',
                )}
              />
            )}
          </div>
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-full min-w-96 p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <Command shouldFilter={false}>
          <CommandList className="max-h-[200px] w-full">
            {isLoading ? (
              <LoadingSkeleton />
            ) : (
              <>
                {!hasSearchQuery && hasTopHits && (
                  <CommandGroup
                    heading={t(
                      'dataExplorer:record.popularValues',
                      'Popular Values',
                    )}
                  >
                    {topHits.map((hit, index) => (
                      <CommandItem
                        key={hit.value}
                        value={hit.value}
                        onSelect={() => handleSelectValue(hit.value)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between',
                          state.selectedIndex === index && 'bg-accent',
                        )}
                      >
                        <span className="truncate">{hit.value}</span>

                        <span className="text-muted-foreground ml-2 flex-shrink-0 text-xs">
                          {hit.count}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {hasSearchQuery && hasSearchResults && (
                  <CommandGroup
                    heading={t(
                      'dataExplorer:record.searchResults',
                      'Search Results',
                    )}
                  >
                    {searchOptions.map((option, index) => (
                      <CommandItem
                        key={option.value}
                        value={option.value}
                        onSelect={() => handleSelectValue(option.value)}
                        className={cn(
                          'flex cursor-pointer items-center justify-between',
                          state.selectedIndex === index && 'bg-accent',
                        )}
                      >
                        <span className="truncate">{option.value}</span>
                        {option.count && (
                          <span className="text-muted-foreground ml-2 flex-shrink-0 text-xs">
                            {option.count}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {hasSearchQuery && !hasSearchResults && !isLoading && (
                  <CommandEmpty>
                    <div className="flex flex-col items-center py-6 text-center">
                      <div className="text-muted-foreground text-sm">
                        {t('dataExplorer:record.noResults')}
                        &quot;{state.debouncedSearchQuery}&quot;
                      </div>

                      <div className="text-muted-foreground mt-1 text-xs">
                        {t('dataExplorer:record.tryDifferentSearch')}
                      </div>
                    </div>
                  </CommandEmpty>
                )}

                {!hasSearchQuery && !hasTopHits && !isLoading && (
                  <CommandEmpty>
                    <div className="flex flex-col items-center py-6 text-center">
                      <div className="text-muted-foreground text-sm">
                        {t(
                          'dataExplorer:record.noSuggestions',
                          'No suggestions available',
                        )}
                      </div>

                      <div className="text-muted-foreground mt-1 text-xs">
                        {t(
                          'dataExplorer:record.startTyping',
                          'Start typing to search for values',
                        )}
                      </div>
                    </div>
                  </CommandEmpty>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex items-center justify-between">
          <Skeleton className="bg-muted h-4 w-32" />
          <Skeleton className="bg-muted h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

// React Query functions for smart text field picker
async function loadFieldTopHits(schema: string, table: string, field: string) {
  const response = await fieldValuesLoader({
    schema,
    table,
    field,
    limit: 10,
    includeTopHits: true,
  });

  if (response.success && response.data?.topHits) {
    return response.data.topHits;
  }
  return [];
}

async function loadFieldSearchResults(
  schema: string,
  table: string,
  field: string,
  searchQuery: string,
) {
  const response = await fieldValuesLoader({
    schema,
    table,
    field,
    search: searchQuery,
    limit: 15,
  });

  if (response.success && response.data?.values) {
    return response.data.values;
  }
  return [];
}
