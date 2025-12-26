import { useMemo, useState } from 'react';

import { Link, useNavigate } from 'react-router';

import { ColumnDef } from '@tanstack/react-table';
import { Filter, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { permissionsInSupamode } from '@kit/supabase/schema';
import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { DataTable, DataTableContainer } from '@kit/ui/enhanced-data-table';
import { Input } from '@kit/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

type Permission = typeof permissionsInSupamode.$inferSelect;

interface PermissionsTableProps {
  data: Permission[];
}

export function PermissionsTable({ data }: PermissionsTableProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');

  const [systemResourceFilter, setSystemResourceFilter] =
    useState<string>('all');

  const [tableFilter, setTableFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredData = useMemo(() => {
    let filtered = data;

    if (searchTerm) {
      filtered = filtered.filter(
        (permission) =>
          permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (permission.description &&
            permission.description
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          permission.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (permission.systemResource &&
            permission.systemResource
              .toLowerCase()
              .includes(searchTerm.toLowerCase())) ||
          (permission.tableName &&
            permission.tableName
              .toLowerCase()
              .includes(searchTerm.toLowerCase())),
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(
        (permission) => permission.permissionType === typeFilter,
      );
    }

    if (scopeFilter !== 'all') {
      filtered = filtered.filter(
        (permission) => permission.scope === scopeFilter,
      );
    }

    if (systemResourceFilter !== 'all') {
      filtered = filtered.filter(
        (permission) => permission.systemResource === systemResourceFilter,
      );
    }

    if (tableFilter !== 'all') {
      filtered = filtered.filter(
        (permission) =>
          permission.tableName === tableFilter ||
          `${permission.schemaName}.${permission.tableName}` === tableFilter,
      );
    }

    return filtered;
  }, [
    data,
    searchTerm,
    typeFilter,
    scopeFilter,
    systemResourceFilter,
    tableFilter,
  ]);

  const uniqueSystemResources = useMemo(() => {
    const resources = data
      .filter((p) => p.permissionType === 'system' && p.systemResource)
      .map((p) => p.systemResource!)
      .filter((value, index, array) => array.indexOf(value) === index);
    return resources.sort();
  }, [data]);

  const uniqueTables = useMemo(() => {
    const tables = data
      .filter((p) => p.permissionType === 'data' && p.tableName)
      .map((p) => `${p.schemaName}.${p.tableName}`)
      .filter((value, index, array) => array.indexOf(value) === index);

    return tables.sort();
  }, [data]);

  const columns: ColumnDef<Permission>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: t('common:name'),
        cell: ({ row }) => (
          <Link
            to={`/settings/permissions/${row.original.id}`}
            className="flex flex-col hover:underline"
          >
            <span className="font-medium">{row.original.name}</span>

            {row.original.description && (
              <span className="text-muted-foreground text-sm">
                {row.original.description}
              </span>
            )}
          </Link>
        ),
      },
      {
        accessorKey: 'permissionType',
        header: t('settings:permissions.type'),
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.permissionType === 'system' ? 'default' : 'secondary'
            }
          >
            {row.original.permissionType}
          </Badge>
        ),
      },
      {
        accessorKey: 'action',
        header: t('settings:permissions.action'),
      },
      {
        id: 'resource',
        header: t('settings:permissions.resource'),
        cell: ({ row }) => {
          const permission = row.original;

          if (permission.permissionType === 'system') {
            return permission.systemResource || '-';
          } else {
            if (permission.scope === 'table') {
              return `${t('settings:permissions.scopeTable')}: ${permission.schemaName}.${permission.tableName}`;
            } else if (permission.scope === 'column') {
              return `${t('settings:permissions.scopeColumn')}: ${permission.schemaName}.${permission.tableName}.${permission.columnName}`;
            } else if (permission.scope === 'storage') {
              return `${t('settings:permissions.scopeStorage')}: All buckets`;
            }

            return '-';
          }
        },
      },
    ];
  }, [t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />

          <Input
            placeholder={t('common:search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="shrink-0 bg-transparent"
        >
          <Filter className="mr-2 h-4 w-4" />
          {t('common:filters')}
        </Button>
      </div>

      {showFilters && (
        <div className="bg-muted/20 grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t('settings:permissions.type')}
            </label>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">{t('common:all')}</SelectItem>
                <SelectItem value="system">
                  {t('settings:permissions.system')}
                </SelectItem>
                <SelectItem value="data">
                  {t('settings:permissions.data')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {typeFilter === 'data' && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('settings:permissions.scope')}
              </label>
              <Select value={scopeFilter} onValueChange={setScopeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">{t('common:all')}</SelectItem>
                  <SelectItem value="table">
                    {t('settings:permissions.scopeTable')}
                  </SelectItem>

                  <SelectItem value="column">
                    {t('settings:permissions.scopeColumn')}
                  </SelectItem>

                  <SelectItem value="storage">
                    {t('settings:permissions.scopeStorage')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {typeFilter === 'system' && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t('settings:permissions.systemResource')}
              </label>
              <Select
                value={systemResourceFilter}
                onValueChange={setSystemResourceFilter}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="all">{t('common:all')}</SelectItem>
                  {uniqueSystemResources.map((resource) => (
                    <SelectItem key={resource} value={resource}>
                      {resource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {typeFilter === 'data' &&
            (scopeFilter === 'table' || scopeFilter === 'column') && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  {t('settings:permissions.table')}
                </label>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>

                  <SelectContent>
                    <SelectItem value="all">{t('common:all')}</SelectItem>
                    {uniqueTables.map((table) => (
                      <SelectItem key={table} value={table}>
                        {table}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
        </div>
      )}

      <DataTableContainer>
        <DataTable
          pageCount={1}
          columns={columns}
          data={filteredData}
          tableProps={{
            'data-testid': 'permissions-table',
          }}
          onClick={(row) => {
            navigate(`/settings/permissions/${row.original.id}`);
          }}
        />
      </DataTableContainer>
    </div>
  );
}
