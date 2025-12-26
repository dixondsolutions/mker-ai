import { useMemo } from 'react';

import { Link, useNavigate } from 'react-router';

import { type ColumnDef } from '@tanstack/react-table';
import { useTranslation } from 'react-i18next';

import { useDateFormatter } from '@kit/formatters/hooks';
import { Badge } from '@kit/ui/badge';
import { DataTable, DataTableContainer } from '@kit/ui/enhanced-data-table';
import { ProfileAvatar } from '@kit/ui/profile-avatar';
import { TableActionMenu } from '@kit/ui/table-action-menu';
import { Trans } from '@kit/ui/trans';

import { Member } from './types';

interface MembersTableProps {
  members: Member[];
  pageSize?: number;
  pageIndex?: number;
  pageCount?: number;
}

export function MembersTable({
  members,
  pageSize,
  pageIndex,
  pageCount,
}: MembersTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const dateFormatter = useDateFormatter();

  // Columns for the data table
  const columns: ColumnDef<Member>[] = useMemo(
    () => [
      {
        accessorKey: 'displayName',
        header: t('settings:member.displayName'),
        size: 50,
        cell: ({ row }) => {
          const member = row.original;
          const displayName = member.displayName as string;

          return (
            <Link
              to={`/settings/members/${member.account.id}`}
              className="flex flex-col hover:underline"
            >
              <div className="flex items-center gap-4">
                <ProfileAvatar
                  displayName={displayName}
                  pictureUrl={member.pictureUrl}
                  className="!m-0 h-8 w-8"
                />

                <div className="flex flex-col">
                  <span
                    className="font-medium"
                    data-testid="member-table-display-name"
                  >
                    {displayName}
                  </span>

                  <span
                    className="text-muted-foreground text-sm"
                    data-testid="member-table-email"
                  >
                    {member.email}
                  </span>
                </div>
              </div>
            </Link>
          );
        },
      },
      {
        accessorKey: 'roles',
        header: t('settings:roles.role'),
        size: 50,
        cell: ({ row }) => {
          const member = row.original;
          const mainRole = getMemberMainRole(member);

          return (
            <div className="flex items-center gap-2">
              <Badge
                data-testid="member-role-badge"
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20"
              >
                {mainRole?.name || 'No role'}
              </Badge>
            </div>
          );
        },
      },
      {
        accessorKey: 'account.createdAt',
        header: t('settings:member.joined'),
        cell: ({ row }) => {
          return dateFormatter(
            new Date(row.original.account.createdAt),
            'MMM d, yyyy',
          );
        },
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const member = row.original;

          return (
            <div className="flex justify-end">
              <TableActionMenu
                data-testid="member-actions"
                items={[
                  {
                    label: <Trans i18nKey="settings:member.view" />,
                    href: `/settings/members/${member.account.id}`,
                  },
                ]}
              />
            </div>
          );
        },
      },
    ],
    [dateFormatter, t],
  );

  return (
    <DataTableContainer>
      <DataTable
        columns={columns}
        data={members}
        pageSize={pageSize}
        pageIndex={pageIndex}
        pageCount={pageCount}
        onClick={(row) => {
          navigate(`/settings/members/${row.original.account.id}`);
        }}
      />
    </DataTableContainer>
  );
}

function getMemberMainRole(member: Member) {
  const roles = member.roles || [];
  let mainRole = null;

  if (roles.length > 0) {
    const sortedRoles = [...roles].sort(
      (a, b) => (b.role?.rank ?? 0) - (a.role?.rank ?? 0),
    );

    if (sortedRoles.length > 0 && sortedRoles[0]?.role) {
      mainRole = sortedRoles[0].role;
    }
  }

  return mainRole;
}
