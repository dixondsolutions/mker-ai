import { useMemo, useState } from 'react';

import { Link, useNavigate } from 'react-router';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { permissionGroupsInSupamode } from '@kit/supabase/schema';
import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { DataTable, DataTableContainer } from '@kit/ui/enhanced-data-table';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

type PermissionGroup = typeof permissionGroupsInSupamode.$inferSelect;

interface PermissionGroupsTableProps {
  data: PermissionGroup[];
}

export function PermissionGroupsTable({ data }: PermissionGroupsTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(
      (group) =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (group.description &&
          group.description.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [data, searchTerm]);

  const columns: ColumnDef<PermissionGroup>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: t('common:name'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              to={`/settings/permissions/groups/${row.original.id}`}
              className="font-medium hover:underline"
            >
              {row.original.name}
            </Link>

            {row.original.description && (
              <span className="text-muted-foreground text-sm">
                {row.original.description}
              </span>
            )}
          </div>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size={'icon'}
                    variant="outline"
                    className="h-8 w-8 p-0 shadow-none"
                  >
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      to={`/settings/permissions/groups/${row.original.id}`}
                    >
                      <Trans i18nKey="settings:permissions.viewGroup" />
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ];
  }, [t]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
        <Input
          placeholder={t('common:search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8"
        />
      </div>

      <DataTableContainer>
        <DataTable
          columns={columns}
          data={filteredData}
          tableProps={{
            'data-testid': 'permission-groups-table',
          }}
          onClick={(row) => {
            navigate(`/settings/permissions/groups/${row.original.id}`);
          }}
        />
      </DataTableContainer>
    </div>
  );
}
