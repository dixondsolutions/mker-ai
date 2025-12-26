import { useMemo, useState } from 'react';

import { Link, useNavigate } from 'react-router';

import { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { rolesInSupamode } from '@kit/supabase/schema';
import { DataTable, DataTableContainer } from '@kit/ui/enhanced-data-table';
import { Input } from '@kit/ui/input';

type Role = typeof rolesInSupamode.$inferSelect;

interface RolesTableProps {
  data: Role[];
}

export function RolesTable({ data }: RolesTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter(
      (role) =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (role.description &&
          role.description.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [data, searchTerm]);

  const columns: ColumnDef<Role>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: t('common:name'),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <Link
              to={`/settings/permissions/roles/${row.original.id}`}
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
        accessorKey: 'rank',
        header: t('settings:roles.rank'),
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
            'data-testid': 'roles-table',
          }}
          onClick={(row) => {
            navigate(`/settings/permissions/roles/${row.original.id}`);
          }}
        />
      </DataTableContainer>
    </div>
  );
}
