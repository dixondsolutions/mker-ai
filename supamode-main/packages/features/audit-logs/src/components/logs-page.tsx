import { useState } from 'react';

import { useLoaderData, useSearchParams } from 'react-router';

import {
  Calendar as CalendarIcon,
  CheckIcon,
  ChevronDown,
  Filter,
  XIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useDateFormatter } from '@kit/formatters/hooks';
import { useAccountPreferences } from '@kit/shared/hooks';
import { Button } from '@kit/ui/button';
import { Calendar } from '@kit/ui/calendar';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { DataTableContainer } from '@kit/ui/enhanced-data-table';
import { PageContent, PageHeader, PageLayout } from '@kit/ui/page';
import { Popover, PopoverContent, PopoverTrigger } from '@kit/ui/popover';
import { SearchInput } from '@kit/ui/search-input';
import { Trans } from '@kit/ui/trans';

import { auditLogsBridgeLoader } from '../api/loaders/bridge-loaders';
import { AuditLogsTable } from './audit-logs-table';

// Common audit log actions
const AUDIT_ACTIONS = ['INSERT', 'UPDATE', 'DELETE', 'SELECT'] as const;

export function LogsPage() {
  const { logs, pageSize, nextCursor, hasMore } =
    useLoaderData<Awaited<ReturnType<typeof auditLogsBridgeLoader>>>();

  const [searchParams, setSearchParams] = useSearchParams();
  const dateFormatter = useDateFormatter();
  const [{ timezone }] = useAccountPreferences();
  const { t } = useTranslation();

  // Get current filter values from URL
  const currentAuthor = searchParams.get('author') || '';
  const currentAction = searchParams.get('action') || '';
  const currentStartDate = searchParams.get('startDate') || '';
  const currentEndDate = searchParams.get('endDate') || '';

  const [showFilters, setShowFilters] = useState(
    Boolean(
      currentAuthor || currentAction || currentStartDate || currentEndDate,
    ),
  );

  // Local state for filters before applying
  const [authorFilter, setAuthorFilter] = useState(currentAuthor);

  const [selectedActions, setSelectedActions] = useState<string[]>(
    currentAction ? currentAction.split(',') : [],
  );

  const [startDate, setStartDate] = useState<Date | undefined>(
    currentStartDate ? new Date(currentStartDate) : undefined,
  );

  const [endDate, setEndDate] = useState<Date | undefined>(
    currentEndDate ? new Date(currentEndDate) : undefined,
  );

  const handleApplyFilters = () => {
    const newSearchParams = new URLSearchParams();

    if (authorFilter) {
      newSearchParams.set('author', authorFilter.trim());
    }

    if (selectedActions.length > 0) {
      newSearchParams.set('action', selectedActions.join(','));
    }

    if (startDate) {
      newSearchParams.set('startDate', startDate.toISOString().split('T')[0]!);
    }

    if (endDate) {
      newSearchParams.set('endDate', endDate.toISOString().split('T')[0]!);
    }

    // Clear cursor and prev history when applying new filters to start from beginning
    newSearchParams.delete('cursor');
    newSearchParams.delete('prev');

    setSearchParams(newSearchParams);
  };

  const handleClearFilters = () => {
    setAuthorFilter('');
    setSelectedActions([]);
    setStartDate(undefined);
    setEndDate(undefined);

    setSearchParams(new URLSearchParams());
  };

  const handleActionToggle = (action: string) => {
    setSelectedActions((prev) =>
      prev.includes(action)
        ? prev.filter((a) => a !== action)
        : [...prev, action],
    );
  };

  return (
    <PageLayout>
      <PageContent className="h-screen">
        <PageHeader
          title={<Trans i18nKey="settings:auditLogs.title" />}
          description={<Trans i18nKey="settings:auditLogs.description" />}
        />

        <div className="flex flex-col space-y-2">
          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApplyFilters();
              }}
              className="flex-1"
            >
              <SearchInput
                placeholder={t('settings:auditLogs.authorPlaceholder')}
                value={authorFilter}
                onValueChange={setAuthorFilter}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyFilters();
                  }
                }}
              />
            </form>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="mr-2 h-4 w-4" />
              <Trans i18nKey="common:filters" />
            </Button>

            <Button
              variant="default"
              onClick={handleApplyFilters}
              className="flex shrink-0 gap-x-2"
            >
              <CheckIcon className={'h-4 w-4'} />
              <span>{t('settings:auditLogs.apply')}</span>
            </Button>

            {(currentAuthor ||
              currentAction ||
              currentStartDate ||
              currentEndDate) && (
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="flex shrink-0 gap-x-2"
              >
                <XIcon className={'h-4 w-4'} />
                <span>{t('settings:auditLogs.clear')}</span>
              </Button>
            )}
          </div>

          {showFilters && (
            <div className="my-2 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t('settings:auditLogs.actions')}
                </label>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                    >
                      {selectedActions.length > 0
                        ? t('settings:auditLogs.selectedCount', {
                            count: selectedActions.length,
                          })
                        : t('settings:auditLogs.selectActions')}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>
                      {t('settings:auditLogs.auditActions')}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {AUDIT_ACTIONS.map((action) => (
                      <DropdownMenuCheckboxItem
                        key={action}
                        checked={selectedActions.includes(action)}
                        onCheckedChange={() => handleActionToggle(action)}
                      >
                        {action}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t('settings:auditLogs.startDate')}
                </label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate
                        ? dateFormatter(startDate, 'PPP')
                        : t('settings:auditLogs.pickDate')}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      timeZone={timezone}
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  {t('settings:auditLogs.endDate')}
                </label>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate
                        ? dateFormatter(endDate, 'PPP')
                        : t('settings:auditLogs.pickDate')}
                    </Button>
                  </PopoverTrigger>

                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      timeZone={timezone}
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}
        </div>

        <DataTableContainer className="overflow-y-auto">
          <AuditLogsTable
            logs={logs}
            pageSize={pageSize}
            nextCursor={nextCursor}
            hasMore={hasMore}
          />
        </DataTableContainer>
      </PageContent>
    </PageLayout>
  );
}
