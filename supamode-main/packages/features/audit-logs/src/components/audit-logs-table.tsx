import { useMemo } from 'react';

import {
  Link,
  useNavigate,
  useNavigation,
  useSearchParams,
} from 'react-router';

import { type ColumnDef } from '@tanstack/react-table';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  InfoIcon,
  UserIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useDateFormatter } from '@kit/formatters/hooks';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { CopyToClipboard } from '@kit/ui/copy-to-clipboard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { DataTable } from '@kit/ui/enhanced-data-table';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { auditLogsLoader } from '../loaders';
import { SeverityBadge } from './severity-badge';

type AuditLogsTableProps = Awaited<ReturnType<typeof auditLogsLoader>>;

type AuditLog = AuditLogsTableProps['logs'][number];

export function AuditLogsTable({
  logs,
  pageSize: _pageSize,
  nextCursor,
  hasMore,
}: AuditLogsTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navigation = useNavigation();
  const dateFormatter = useDateFormatter();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentCursor = searchParams.get('cursor');
  const hasPrevious = Boolean(currentCursor);
  const isNavigationLoading = navigation.state === 'loading';

  const handleNext = () => {
    if (nextCursor) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('cursor', nextCursor);
      // Store current cursor in history for back navigation
      const prevCursors = searchParams.get('prev') || '';
      if (currentCursor) {
        newParams.set(
          'prev',
          prevCursors ? `${prevCursors},${currentCursor}` : currentCursor,
        );
      }
      setSearchParams(newParams);
    }
  };

  const handlePrevious = () => {
    const newParams = new URLSearchParams(searchParams);
    const prevCursors = searchParams.get('prev') || '';

    if (prevCursors) {
      const cursors = prevCursors.split(',');
      const prevCursor = cursors.pop();

      if (cursors.length > 0) {
        newParams.set('prev', cursors.join(','));
      } else {
        newParams.delete('prev');
      }

      if (prevCursor) {
        newParams.set('cursor', prevCursor);
      } else {
        newParams.delete('cursor');
      }
    } else {
      // Go back to first page
      newParams.delete('cursor');
      newParams.delete('prev');
    }

    setSearchParams(newParams);
  };

  // Columns for the data table
  const columns: ColumnDef<AuditLog>[] = useMemo(
    () => [
      {
        accessorKey: 'createdAt',
        header: t('logs:timestamp'),
        cell: ({ row }) => {
          return dateFormatter(
            new Date(row.original.createdAt),
            'MMM d, yyyy HH:mm:ss',
          );
        },
      },
      {
        accessorKey: 'performedBy',
        header: t('logs:performedBy'),
        cell: ({ row }) => {
          const log = row.original;
          const accountId = log.accountId;

          // If we don't have metadata but have an accountId, show a generic user with ID
          if (accountId) {
            return (
              <span className="flex items-center gap-2">
                <UserIcon className="text-muted-foreground h-4 w-4" />

                <span className="text-muted-foreground text-xs">
                  <CopyToClipboard
                    className="font-mono text-xs"
                    value={accountId}
                  >
                    {accountId.substring(0, 8)}...
                  </CopyToClipboard>
                </span>
              </span>
            );
          }

          // If we don't have any user info, show "System"
          return (
            <span className="text-muted-foreground italic">
              <Trans i18nKey="logs:system" />
            </span>
          );
        },
      },
      {
        accessorKey: 'operation',
        header: t('logs:operation'),
        cell: ({ row }) => {
          const operation = row.original.operation;
          return (
            <Badge variant="outline" className="uppercase">
              {operation}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'resource',
        header: t('logs:resource'),
        cell: ({ row }) => {
          const schema = row.original.schemaName;
          const table = row.original.tableName;
          const id = row.original.recordId;

          return (
            <div className="flex flex-col">
              <span className="font-medium">
                {schema}.{table}
              </span>

              <If condition={id}>
                {(id) => (
                  <span className="text-muted-foreground text-xs">
                    ID: {id.length > 15 ? `${id.substring(0, 15)}...` : id}
                  </span>
                )}
              </If>
            </div>
          );
        },
      },
      {
        accessorKey: 'severity',
        header: t('logs:severity'),
        cell: ({ row }) => {
          const severity = row.original.severity;

          return <SeverityBadge severity={severity} />;
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const log = row.original;

          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    data-testid="log-actions"
                  >
                    <span className="sr-only">Open menu</span>
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to={`/logs/${log.id}`}>
                      <InfoIcon className="mr-2 h-4 w-4" />
                      <Trans i18nKey="logs:viewDetails" />
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [dateFormatter, t],
  );

  return (
    <>
      <div className="[&>div>div.border-t]:hidden">
        <DataTable
          sticky
          columns={columns}
          data={logs}
          pageSize={logs.length}
          pageIndex={0}
          pageCount={1}
          onClick={(row) => {
            return navigate(`/logs/${row.original.id}`);
          }}
          tableProps={{
            'data-testid': 'audit-logs-table',
          }}
          className={cn('transition-opacity', {
            'opacity-50': isNavigationLoading,
          })}
        />
      </div>

      {/* Custom cursor-based pagination */}
      <div className="border-border bg-background sticky bottom-0 z-10 flex items-center justify-end border-t px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={!hasPrevious}
          >
            <ChevronLeftIcon className="mr-1 h-4 w-4" />
            <Trans i18nKey="common:previous" />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={!hasMore}
          >
            <Trans i18nKey="common:next" />
            <ChevronRightIcon className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
