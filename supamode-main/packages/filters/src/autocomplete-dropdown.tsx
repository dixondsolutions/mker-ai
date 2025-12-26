import { useEffect, useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';
import {
  Subject,
  catchError,
  debounceTime,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';

import { ColumnMetadata } from '@kit/types';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@kit/ui/command';

import type { DisplayService, TableDataLoader } from './types';

export function AutocompleteDropdown({
  onChange,
  relation,
  tableDataLoader,
  displayService,
}: {
  onChange: (val: string, label: string | undefined) => void;
  onBlur?: () => void;
  relation: NonNullable<ColumnMetadata['relations']>[number];
  tableDataLoader: TableDataLoader;
  displayService: DisplayService;
}) {
  const { t } = useTranslation();

  const [state, setState] = useState<{
    query: string;
    loading: boolean;
    options: { label: string | undefined; value: string | undefined }[];
  }>({
    query: '',
    loading: false,
    options: [],
  });

  const subject$ = useMemo(() => new Subject<string>(), []);

  useEffect(() => {
    const subscription = subject$
      .pipe(
        tap((query) => {
          setState((prev) => ({
            ...prev,
            query,
            loading: true,
            options: [],
          }));
        }),
        debounceTime(500),
        switchMap((val) => {
          if (val.length < 2) {
            setState((prev) => ({
              ...prev,
              loading: false,
            }));

            return of({ data: [], table: { displayFormat: '' } });
          }

          return tableDataLoader({
            schema: relation.target_schema,
            table: relation.target_table,
            page: 1,
            search: val,
            properties: '{}',
          }).catch((error) => {
            console.error('Error loading autocomplete dropdown:', error);

            return { data: [], table: { displayFormat: '' } };
          });
        }),
        map((val) => {
          const targetColumn = relation.target_column;

          return val.data.map((item) => {
            const displayFormat = val.table.displayFormat;

            if (!displayFormat) {
              return {
                label: item[targetColumn] as string | undefined,
                value: item[targetColumn] as string | undefined,
              };
            }

            return {
              label: displayService.applyDisplayFormat(displayFormat, item),
              value: item[targetColumn] as string | undefined,
            };
          });
        }),
        catchError((error) => {
          console.error('Error loading autocomplete dropdown:', error);
          return of([]);
        }),
      )
      .subscribe((data) => {
        setState((prev) => ({
          ...prev,
          options: data,
          loading: false,
        }));
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [
    relation.target_column,
    relation.target_schema,
    relation.target_table,
    subject$,
    tableDataLoader,
    displayService,
  ]);

  return (
    <Command shouldFilter={false}>
      <CommandInput
        placeholder={t('dataExplorer:filters.search')}
        className="h-8 min-w-[200px] text-xs"
        onInput={(e) => {
          const input = e.target as HTMLInputElement;

          subject$.next(input.value.trim());
        }}
      />

      {state.loading ? (
        <div className="text-muted-foreground p-2 text-xs">
          {t('dataExplorer:filters.loading')}
        </div>
      ) : state.query && state.options.length === 0 ? (
        <CommandEmpty className="text-muted-foreground p-2 text-xs">
          {t('dataExplorer:filters.noResultsFound')}
        </CommandEmpty>
      ) : !state.query && state.options.length === 0 ? (
        <CommandEmpty className="text-muted-foreground p-2 text-xs">
          {t('dataExplorer:filters.enterSearchQuery')}
        </CommandEmpty>
      ) : (
        <CommandGroup className="mt-2 p-0">
          {state.options.map((option) => (
            <CommandItem
              asChild
              className="focus:bg-muted focus:border-input cursor-pointer border-transparent text-xs"
              key={option.value}
              value={option.value}
              onSelect={() => {
                onChange(option.value!, option.label);
              }}
            >
              <button
                tabIndex={0}
                className="w-full text-left"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onChange(option.value!, option.label);
                  }
                }}
              >
                {option.label}
              </button>
            </CommandItem>
          ))}
        </CommandGroup>
      )}
    </Command>
  );
}
