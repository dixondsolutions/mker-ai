import { useMemo, useState } from 'react';

import { Form, useNavigate } from 'react-router';

import { type ColumnDef } from '@tanstack/react-table';
import {
  BanIcon,
  InfoIcon,
  MailIcon,
  SearchIcon,
  ShieldIcon,
  TrashIcon,
  UnlockIcon,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useDateFormatter } from '@kit/formatters/hooks';
import { useBatchSelection } from '@kit/shared/hooks';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import { DataTable } from '@kit/ui/enhanced-data-table';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { TableActionMenu } from '@kit/ui/table-action-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { BatchActionsToolbar } from '../../../settings/src/components/shared/batch-actions-toolbar';
import {
  BatchBanUsersDialog,
  BatchDeleteUsersDialog,
  BatchResetPasswordDialog,
  BatchUnbanUsersDialog,
} from './batch-user-actions-dialog';

type UsersTableProps = {
  users: Array<{
    id: string;
    email: string;
    phone?: string;
    created_at: string;
    updated_at: string;
    last_sign_in_at?: string;
    confirmed_at?: string;
    email_confirmed_at?: string;
    banned_until?: string;
    aud?: string;
    is_anonymous?: boolean;
    app_metadata: {
      supamode_access?: string;
      [key: string]: string | undefined;
    };
  }>;

  pageSize: number;
  pageIndex: number;
  pageCount: number;
  total: number;
  search: string;

  permissions: {
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_insert: boolean;
  };

  batchSelection: ReturnType<
    typeof useBatchSelection<UsersTableProps['users'][number]>
  >;

  className?: string;
};

export function UsersTable({
  users,
  pageSize,
  pageIndex,
  pageCount,
  batchSelection,
  search = '',
  className = '',
  permissions,
}: UsersTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dateFormatter = useDateFormatter();

  // Dialog state management
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [unbanDialogOpen, setUnbanDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);

  // Get selected users for dialogs - use the full records from the hook
  const selectedUsers = batchSelection.getSelectedRecords();

  // Filter users for specific actions
  const usersForBanning = useMemo(() => {
    return selectedUsers.filter(
      (user) => !user.banned_until || new Date(user.banned_until) <= new Date(),
    );
  }, [selectedUsers]);

  const usersForUnbanning = useMemo(() => {
    return selectedUsers.filter(
      (user) => user.banned_until && new Date(user.banned_until) > new Date(),
    );
  }, [selectedUsers]);

  // Define batch actions
  const batchActions = useMemo(() => {
    // Filter users appropriately for each action
    const unbannedUsers = selectedUsers.filter(
      (user) => !user.banned_until || new Date(user.banned_until) <= new Date(),
    );

    const bannedUsers = selectedUsers.filter(
      (user) => user.banned_until && new Date(user.banned_until) > new Date(),
    );

    return [
      ...(unbannedUsers.length > 0 && permissions.can_update
        ? [
            {
              label: 'usersExplorer:common.ban',
              icon: <BanIcon className="mr-2 h-4 w-4" />,
              variant: 'outline' as const,
              onClick: () => {
                setBanDialogOpen(true);
              },
            },
          ]
        : []),
      ...(bannedUsers.length > 0 && permissions.can_update
        ? [
            {
              label: 'usersExplorer:common.unban',
              icon: <BanIcon className="mr-2 h-4 w-4" />,
              variant: 'outline' as const,
              onClick: () => {
                setUnbanDialogOpen(true);
              },
            },
          ]
        : []),
      ...(permissions.can_update
        ? [
            {
              label: 'usersExplorer:common.resetPassword',
              icon: <UnlockIcon className="mr-2 h-4 w-4" />,
              variant: 'outline' as const,
              onClick: () => {
                setResetPasswordDialogOpen(true);
              },
            },
          ]
        : []),
      ...(permissions.can_delete
        ? [
            {
              label: 'usersExplorer:common.delete',
              icon: <TrashIcon className="mr-2 h-4 w-4" />,
              variant: 'destructive' as const,
              onClick: () => {
                setDeleteDialogOpen(true);
              },
            },
          ]
        : []),
    ];
  }, [
    selectedUsers,
    setBanDialogOpen,
    setUnbanDialogOpen,
    setResetPasswordDialogOpen,
    setDeleteDialogOpen,
    permissions,
  ]);

  // only display batch actions if the user has at least one permission
  const shouldDisplayBatchActions =
    permissions.can_delete || permissions.can_update;

  // Columns for the data table
  const columns: ColumnDef<UsersTableProps['users'][number]>[] = useMemo(
    () => [
      ...(shouldDisplayBatchActions
        ? ([
            {
              id: 'select',
              header: () => (
                <div className="flex w-full justify-center">
                  <Checkbox
                    checked={
                      batchSelection.isAllSelected
                        ? true
                        : batchSelection.isSomeSelected
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) => {
                      batchSelection.toggleSelectAll(!!checked);
                    }}
                  />
                </div>
              ),
              cell: ({ row }) => (
                <label
                  className="flex w-full justify-center"
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent row click when clicking checkbox
                  }}
                >
                  <Checkbox
                    checked={batchSelection.isSelected(row.original.id)}
                    onCheckedChange={() => {
                      batchSelection.toggleSelection(row.original.id);
                    }}
                  />
                </label>
              ),
              meta: {
                className: '!p-0',
              },
              enableSorting: false,
              enableHiding: false,
              size: 28,
            },
          ] as ColumnDef<UsersTableProps['users'][number]>[])
        : []),
      {
        accessorKey: 'email',
        header: t('usersExplorer:users.email'),
        cell: ({ row }) => {
          const user = row.original;
          const displayName = user.email;
          const isAdmin = user.app_metadata['supamode_access'] === 'true';

          return (
            <div className="flex items-center gap-2">
              <div className="flex flex-col">
                <span className="text-muted-foreground fles flex items-center space-x-3 text-xs">
                  <MailIcon className="mr-1 h-3 w-3" />

                  <span data-testid="user-email">{displayName}</span>

                  <If condition={isAdmin}>
                    <Badge variant={'outline'} className={'text-primary'}>
                      <ShieldIcon className={'mr-1 h-3 w-3'} />
                      <Trans i18nKey={'common:adminUser'} />
                    </Badge>
                  </If>
                </span>
              </div>
            </div>
          );
        },
      },
      {
        header: t('usersExplorer:userDetails.accountStatus'),
        cell: ({ row }) => {
          const user = row.original;

          const isBanned =
            user.banned_until && new Date(user.banned_until) > new Date();

          return (
            <Badge variant={isBanned ? 'destructive' : 'success'}>
              {isBanned ? (
                <Trans i18nKey="usersExplorer:users.inactive" />
              ) : (
                <Trans i18nKey="usersExplorer:users.active" />
              )}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: t('usersExplorer:users.createdAt', 'Created'),
        cell: ({ row }) => {
          const createdAt = new Date(row.original.created_at);

          return dateFormatter(createdAt, 'MMM d yyy, HH:mm');
        },
      },
      {
        accessorKey: 'last_sign_in_at',
        header: t('usersExplorer:users.lastSignIn'),
        cell: ({ row }) => {
          const lastSignIn = row.original.last_sign_in_at;

          if (!lastSignIn) {
            return '-';
          }

          const lastSignInDate = new Date(lastSignIn);

          return dateFormatter(lastSignInDate, 'MMM d yyy, HH:mm');
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const user = row.original;

          return (
            <div className="flex justify-end">
              <TableActionMenu
                items={[
                  {
                    label: <Trans i18nKey="usersExplorer:users.viewDetails" />,
                    icon: <InfoIcon className="h-4 w-4" />,
                    href: `/users/${user.id}`,
                  },
                ]}
                triggerClassName="data-[testid=user-actions]"
              />
            </div>
          );
        },
      },
    ],
    [shouldDisplayBatchActions, t, batchSelection, dateFormatter],
  );

  return (
    <div className="flex flex-1 flex-col space-y-4 overflow-y-auto">
      <div
        className={cn(
          'bg-background flex h-full flex-1 flex-col gap-y-1 rounded-lg border',
          className,
        )}
      >
        {batchSelection.selectedCount > 0 && (
          <BatchActionsToolbar
            className="animate-in fade-in zoom-in slide-in-from-bottom-16 dark:shadow-primary/30 border-b px-2"
            selectedCount={batchSelection.selectedCount}
            onClearSelection={batchSelection.clearSelection}
            actions={batchActions}
            selectedItemsLabel="usersExplorer:users.selectedUsers"
          />
        )}

        <SearchInput search={search} />

        <DataTable
          columns={columns}
          data={users}
          pageSize={pageSize}
          pageIndex={pageIndex}
          pageCount={pageCount}
          sticky
          onClick={(row) => {
            return navigate(`/users/${row.original.id}`);
          }}
        />
      </div>

      {/* Batch Action Dialogs */}
      <If condition={deleteDialogOpen}>
        <BatchDeleteUsersDialog
          selectedUsers={selectedUsers}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onSuccess={() => {
            batchSelection.clearSelection();
            setDeleteDialogOpen(false);
          }}
        />
      </If>

      <If condition={banDialogOpen}>
        <BatchBanUsersDialog
          selectedUsers={usersForBanning}
          open={banDialogOpen}
          onOpenChange={setBanDialogOpen}
          onSuccess={() => {
            batchSelection.clearSelection();
            setBanDialogOpen(false);
          }}
        />
      </If>

      <If condition={unbanDialogOpen}>
        <BatchUnbanUsersDialog
          selectedUsers={usersForUnbanning}
          open={unbanDialogOpen}
          onOpenChange={setUnbanDialogOpen}
          onSuccess={() => {
            batchSelection.clearSelection();
            setUnbanDialogOpen(false);
          }}
        />
      </If>

      <If condition={resetPasswordDialogOpen}>
        <BatchResetPasswordDialog
          selectedUsers={selectedUsers}
          open={resetPasswordDialogOpen}
          onOpenChange={setResetPasswordDialogOpen}
          onSuccess={() => {
            batchSelection.clearSelection();
            setResetPasswordDialogOpen(false);
          }}
        />
      </If>
    </div>
  );
}

function SearchInput(props: { search: string }) {
  const { t } = useTranslation();

  return (
    <Form method="GET" className="w-auto p-2">
      <div className="relative flex w-full items-center gap-x-2">
        <SearchIcon className="text-muted-foreground absolute left-1 h-3.5 w-3.5" />

        <Input
          name="search"
          id={'users-table-search-input'}
          data-testid={'users-table-search-input'}
          placeholder={t('dataExplorer:filters.searchAll')}
          className={'hover:border-border h-7 border-transparent pl-6 text-sm'}
          defaultValue={props.search}
        />

        <If condition={props.search}>
          <Form method="GET" className="absolute right-2">
            <ClearSearchButton onClear={() => {}} />
          </Form>
        </If>
      </div>
    </Form>
  );
}

function ClearSearchButton(props: { onClear: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="hover:bg-muted/50 h-6 w-6 rounded-full p-0 focus:ring-0"
          onClick={props.onClear}
          name="search"
          value=""
        >
          <X className="h-4 w-4" />
        </Button>
      </TooltipTrigger>

      <TooltipContent>
        <Trans i18nKey="dataExplorer:filters.clearSearch" />
      </TooltipContent>
    </Tooltip>
  );
}
