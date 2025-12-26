import { useCallback, useEffect, useMemo, useState } from 'react';

import { Link } from 'react-router';

import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Subject, debounceTime, filter, tap } from 'rxjs';

import { useReadableResources } from '@kit/resources/hooks';
import { buildResourceUrl } from '@kit/shared/utils';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@kit/ui/command';
import { If } from '@kit/ui/if';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@kit/ui/input-group';
import { Kbd } from '@kit/ui/kbd';
import { Skeleton } from '@kit/ui/skeleton';
import { Spinner } from '@kit/ui/spinner';
import { Trans } from '@kit/ui/trans';

import { useGlobalSearch } from '../api/loaders/bridge-loaders';
import { GlobalSearchResult } from '../api/types';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  // Handle keyboard shortcut
  useEffect(() => {
    // Define the event handler to open the global search dialog using the keyboard shortcut CMD+K
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey && event.key === 'k') {
        event.preventDefault();
        setOpen(true);
      }
    };

    // attach the event listener
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Cleanup the event listener when the component unmounts
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <InputGroup className="hover:border-input border-border transition-colors dark:bg-transparent">
          <InputGroupAddon>
            <Kbd>⌘+K</Kbd>
          </InputGroupAddon>

          <InputGroupInput
            data-testid="global-search-input"
            className="hover:border-primary/40 focus:border-primary h-8"
            placeholder={t('globalSearch:commandInputPlaceholder')}
          />
        </InputGroup>
      </AlertDialogTrigger>

      <AlertDialogContent
        data-testid="global-search-dialog"
        className="min-w-96 p-0"
      >
        <AlertDialogHeader className="gap-1 px-3 py-4 pb-2">
          <AlertDialogTitle className="flex items-center gap-x-2">
            <Search className="h-4 w-4" />
            {t('globalSearch:title')}
          </AlertDialogTitle>

          <AlertDialogDescription>
            {t('globalSearch:description')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <GlobalSearchAutocompleteForm onItemClick={() => setOpen(false)} />

        <AlertDialogFooter className="px-3 py-4">
          <AlertDialogCancel asChild autoFocus={false}>
            <Button data-testid="global-search-cancel" variant="outline">
              {t('common:cancel')}
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function GlobalSearchAutocompleteForm(props: { onItemClick: () => void }) {
  const resources = useReadableResources();
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pendingQuery, setPendingQuery] = useState('');

  const { t } = useTranslation();

  // Create a subject for search input
  const searchSubject$ = useMemo(() => new Subject<string>(), []);

  // Set up debounced search query using RxJS
  useEffect(() => {
    const subscription = searchSubject$
      .pipe(
        // Clear the debounced query when input changes
        tap(() => setDebouncedQuery('')),
        // Only search if the query is at least 2 characters long
        filter((q) => q.length > 2),
        tap((q) => setPendingQuery(q)),
        // Debounce the search query to prevent excessive API calls
        debounceTime(1000),
      )
      .subscribe((searchQuery) => {
        setDebouncedQuery(searchQuery);
        setPendingQuery('');
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [searchSubject$]);

  // Use the bridge hook with smart caching
  const {
    data: searchResults,
    isLoading,
    isError,
    error,
  } = useGlobalSearch({
    query: debouncedQuery,
    limit: 10,
    offset: 0,
    enabled: debouncedQuery.length > 2,
  });

  const buildUrlCallback = useCallback(
    (
      schemaName: string,
      tableName: string,
      record: Record<string, string | number | boolean | null>,
    ) => {
      if (!resources.data) {
        return '';
      }

      if ('error' in resources.data) {
        return '';
      }

      const table = resources.data.find(
        (table) =>
          table.metadata.schemaName === schemaName &&
          table.metadata.tableName === tableName,
      );

      if (!table?.metadata) {
        return '';
      }

      return buildResourceUrl({
        schema: schemaName,
        table: tableName,
        record: record,
        tableMetadata: table.metadata.uiConfig as {
          primary_keys: Array<{ column_name: string }>;
          unique_constraints: Array<{ constraint_name: string }>;
        },
      });
    },
    [resources.data],
  );

  return (
    <Command shouldFilter={false}>
      <div className="relative">
        <CommandInput
          data-testid="global-search-command-input"
          autoFocus
          placeholder={t('globalSearch:commandInputPlaceholder')}
          onValueChange={(value) => searchSubject$.next(value)}
        />

        <If condition={isLoading || pendingQuery.length > 2}>
          <Spinner
            data-testid="global-search-loading"
            className="absolute top-4 right-2 h-4 w-4"
          />
        </If>
      </div>

      <CommandList>
        {isLoading || pendingQuery.length > 2 ? (
          <SkeletonLoader />
        ) : isError ? (
          <CommandEmpty
            data-testid="global-search-error"
            className="p-4 text-sm"
          >
            <span className="text-destructive">{error.message}</span>
          </CommandEmpty>
        ) : searchResults?.results.length === 0 ? (
          <NoResults />
        ) : (
          <ResultsList
            results={searchResults?.results ?? []}
            onItemClick={props.onItemClick}
            buildUrlCallback={buildUrlCallback}
          />
        )}
      </CommandList>
    </Command>
  );
}

function ResultsList({
  results,
  onItemClick,
  buildUrlCallback,
}: {
  results: GlobalSearchResult[];
  onItemClick: () => void;
  buildUrlCallback: (
    schemaName: string,
    tableName: string,
    record: Record<string, string | number | boolean | null>,
  ) => string;
}) {
  return (
    <CommandGroup className="animate-in fade-in p-4">
      {results.map((result) => {
        const link = buildUrlCallback(
          result.schema_name,
          result.table_name,
          result.record,
        );

        return (
          <CommandItem
            data-testid="global-search-result"
            asChild
            key={link}
            className="flex cursor-pointer flex-col items-start gap-1 p-2"
          >
            <Link
              data-testid="global-search-link"
              tabIndex={0}
              to={link}
              className="flex items-center gap-2 focus:ring"
              onClick={() => {
                // wait before closing to avoid flickering
                setTimeout(onItemClick, 100);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  // simulate a press click
                  (e.target as HTMLAnchorElement).click();
                }
              }}
            >
              <span
                className="font-medium"
                data-testid="global-search-result-title"
              >
                {result.title}
              </span>

              <span className="text-muted-foreground text-xs">
                <Trans
                  i18nKey="globalSearch:inTable"
                  values={{ table: result.table_display }}
                />
              </span>
            </Link>
          </CommandItem>
        );
      })}
    </CommandGroup>
  );
}

function NoResults() {
  const { t } = useTranslation('globalSearch');

  return (
    <CommandEmpty
      data-testid="global-search-no-results"
      className="p-4 text-center"
    >
      <span className="text-muted-foreground text-sm">
        {t('noResultsFound')}
      </span>
    </CommandEmpty>
  );
}

function SkeletonLoader() {
  return (
    <div className="animate-in fade-in flex flex-col gap-2 p-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} className="bg-muted h-6 w-full" />
      ))}
    </div>
  );
}
