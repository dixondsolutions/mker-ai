import { useLoaderData, useNavigation } from 'react-router';

import { useBatchSelection } from '@kit/shared/hooks';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { UserManagementControls } from './user-management-controls';
import { UsersTable } from './users-table';

// Define the User type to match the expected type in UsersTable
type AppUser = {
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
};

export function UsersPage() {
  const { users, permissions, pagination, search } = useLoaderData() as {
    users: Array<AppUser>;

    permissions: {
      can_read: boolean;
      can_update: boolean;
      can_delete: boolean;
      can_insert: boolean;
    };

    pagination: {
      pageSize: number;
      pageIndex: number;
      pageCount: number;
      total: number;
    };
    search?: string;
  };

  // Batch selection state
  const maxSelectable = 50;

  const batchSelection = useBatchSelection(
    users,
    (user) => user.id,
    maxSelectable,
  );

  const isLoading = useNavigation().state === 'loading';

  return (
    <div className="flex h-screen flex-1 flex-col gap-y-4 overflow-y-hidden px-4 py-2.5">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={4}>
            <Trans i18nKey="usersExplorer:title" />
          </Heading>

          <Heading level={6} className={'text-muted-foreground font-normal'}>
            <Trans i18nKey="usersExplorer:description" />
          </Heading>
        </div>

        <div className="flex items-center gap-3">
          <UserManagementControls permissions={permissions} />
        </div>
      </div>

      <UsersTable
        className={cn(
          {
            'opacity-50': isLoading,
          },
          'transition-opacity duration-300',
        )}
        permissions={permissions}
        users={users}
        search={search || ''}
        pageSize={pagination.pageSize}
        pageIndex={pagination.pageIndex}
        pageCount={pagination.pageCount}
        total={pagination.total}
        batchSelection={batchSelection}
      />
    </div>
  );
}
