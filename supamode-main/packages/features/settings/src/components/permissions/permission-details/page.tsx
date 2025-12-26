import { useMemo, useState } from 'react';

import { Link, useLoaderData, useNavigate } from 'react-router';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpRight, Search, SquarePenIcon, TrashIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@kit/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@kit/ui/breadcrumb';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { DataTable } from '@kit/ui/enhanced-data-table';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { permissionDetailsLoader } from '../../../loaders';
import { DeletePermissionDialog } from './delete-permission-dialog';
import { EditPermissionDialog } from './edit-permission-dialog';

export function PermissionDetailsPage() {
  const [activeTab, setActiveTab] = useState<'roles' | 'groups'>('roles');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const data = useLoaderData<typeof permissionDetailsLoader>();
  const [rolesSearchTerm, setRolesSearchTerm] = useState('');
  const [groupsSearchTerm, setGroupsSearchTerm] = useState('');

  const { permission, roles, groups } = data;

  const filteredRoles = useMemo(() => {
    if (!rolesSearchTerm) return roles;

    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(rolesSearchTerm.toLowerCase()) ||
        (role.description &&
          role.description
            .toLowerCase()
            .includes(rolesSearchTerm.toLowerCase())),
    );
  }, [roles, rolesSearchTerm]);

  const filteredGroups = useMemo(() => {
    if (!groupsSearchTerm) return groups;

    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(groupsSearchTerm.toLowerCase()) ||
        (group.description &&
          group.description
            .toLowerCase()
            .includes(groupsSearchTerm.toLowerCase())),
    );
  }, [groups, groupsSearchTerm]);

  // Define columns for roles table
  const rolesColumns: ColumnDef<(typeof roles)[number]>[] = [
    {
      accessorKey: 'name',
      header: t('settings:permissions.roleName'),
      cell: ({ row }) => (
        <Link
          to={`/settings/permissions/roles/${row.original.id}`}
          className="flex flex-col hover:underline"
        >
          <span className="font-medium">{row.original.name}</span>

          <If condition={row.original.description}>
            <span className="text-muted-foreground text-sm">
              {row.original.description}
            </span>
          </If>
        </Link>
      ),
    },
    {
      accessorKey: 'rank',
      header: t('settings:permissions.rank'),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex justify-end">
          <Button
            size="icon"
            variant="ghost"
            onClick={() =>
              navigate(`/settings/permissions/roles/${row.original.id}`)
            }
          >
            <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // Define columns for groups table
  const groupsColumns: ColumnDef<(typeof groups)[number]>[] = useMemo(() => {
    return [
      {
        accessorKey: 'name',
        header: t('settings:permissions.groupName'),
        cell: ({ row }) => (
          <Link
            to={`/settings/permissions/groups/${row.original.id}`}
            className="flex flex-col hover:underline"
          >
            <span className="font-medium">{row.original.name}</span>

            <If condition={row.original.description}>
              <span className="text-muted-foreground text-sm">
                {row.original.description}
              </span>
            </If>
          </Link>
        ),
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="icon"
              variant="ghost"
              onClick={() =>
                navigate(`/settings/permissions/groups/${row.original.id}`)
              }
            >
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ];
  }, [navigate, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <Link className="hover:underline" to="/settings">
                  {t('settings:permissions.settings')}
                </Link>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <Link
                  className="hover:underline"
                  to="/settings/permissions?tab=permissions"
                >
                  {t('settings:permissions.permissions')}
                </Link>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>{permission.name}</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Heading level={5}>{permission.name}</Heading>

          <If condition={permission.description}>
            <p className="text-muted-foreground text-sm">
              {permission.description}
            </p>
          </If>
        </div>

        <div className="flex items-center space-x-2">
          <If condition={data.access.canUpdate}>
            <EditPermissionDialog permission={permission} onSuccess={() => {}}>
              <Button data-testid="edit-permission-button" variant="outline">
                <SquarePenIcon className="mr-2 h-4 w-4" />
                <span>{t('settings:permissions.editPermission')}</span>
              </Button>
            </EditPermissionDialog>
          </If>

          <If condition={data.access.canDelete}>
            <DeletePermissionDialog
              permissionId={permission.id}
              roles={roles}
              groups={groups}
            >
              <Button
                data-testid="delete-permission-button"
                variant="destructive"
              >
                <TrashIcon className="mr-2 h-4 w-4" />
                <span>{t('settings:permissions.deletePermission')}</span>
              </Button>
            </DeletePermissionDialog>
          </If>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings:permissions.type')}</CardTitle>
          </CardHeader>

          <CardContent>
            <Badge
              data-testid="permission-type-badge"
              variant={
                permission.permissionType === 'system' ? 'default' : 'secondary'
              }
            >
              {permission.permissionType || t('settings:permissions.custom')}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings:permissions.action')}</CardTitle>
          </CardHeader>

          <CardContent>
            <Badge data-testid="permission-action-badge" variant="outline">
              {permission.action === '*' ? (
                <Trans i18nKey="common:all" />
              ) : (
                permission.action
              )}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('settings:permissions.scope')}</CardTitle>
          </CardHeader>

          <CardContent>
            {permission.scope ? (
              <Badge data-testid="permission-scope-badge" variant="outline">
                {permission.scope}
              </Badge>
            ) : (
              <p
                data-testid="permission-scope-badge"
                className="text-muted-foreground"
              >
                -
              </p>
            )}
          </CardContent>
        </Card>

        {permission.schemaName && permission.tableName && (
          <Card>
            <CardHeader>
              <CardTitle>{t('settings:permissions.databaseAccess')}</CardTitle>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">
                    {t('settings:permissions.schema')}
                  </h4>

                  <p
                    data-testid="permission-schema-name-badge"
                    className="text-muted-foreground"
                  >
                    {getName(permission.schemaName)}
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium">
                    {t('settings:permissions.table')}
                  </h4>

                  <p
                    data-testid="permission-table-name-badge"
                    className="text-muted-foreground"
                  >
                    {getName(permission.tableName)}
                  </p>
                </div>

                {permission.columnName && (
                  <div>
                    <h4 className="text-sm font-medium">
                      {t('settings:permissions.column')}
                    </h4>

                    <p
                      data-testid="permission-column-name-badge"
                      className="text-muted-foreground"
                    >
                      {getName(permission.columnName)}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs
        className="mt-4"
        value={activeTab}
        onValueChange={(tab) => setActiveTab(tab as 'roles' | 'groups')}
      >
        <TabsList>
          <TabsTrigger value="roles" data-testid="roles-tab">
            {t('settings:permissions.rolesUsingThisPermission')}
          </TabsTrigger>

          <TabsTrigger value="groups" data-testid="groups-tab">
            {t('settings:permissions.permissionGroups')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {t('settings:permissions.rolesUsingThisPermission')}
              </CardTitle>

              <CardDescription>
                {t('settings:permissions.rolesUsingThisPermissionDescription')}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <If
                condition={roles.length > 0}
                fallback={
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {t('settings:permissions.noRolesUsingThisPermission')}
                    </p>

                    <p className="text-muted-foreground">
                      {t(
                        'settings:permissions.rolesUsingThisPermissionDescription',
                      )}
                      <span
                        className="mt-4 block cursor-pointer underline"
                        onClick={() => setActiveTab('groups')}
                      >
                        {t('settings:permissions.throughPermissionGroups')}
                      </span>
                    </p>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                    <Input
                      placeholder={t('common:search')}
                      value={rolesSearchTerm}
                      onChange={(e) => setRolesSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  <DataTable
                    columns={rolesColumns}
                    data={filteredRoles}
                    tableProps={{
                      'data-testid': 'permission-roles-table',
                    }}
                    onClick={(row) => {
                      navigate(
                        `/settings/permissions/roles/${row.original.id}`,
                      );
                    }}
                  />
                </div>
              </If>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>
                {t('settings:permissions.permissionGroups')}
              </CardTitle>

              <CardDescription>
                <Trans i18nKey="settings:permissions.permissionGroupsIncludingThisPermission" />
              </CardDescription>
            </CardHeader>

            <CardContent>
              <If
                condition={groups.length > 0}
                fallback={
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {t('settings:permissions.permissionInNoGroups')}
                    </p>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                    <Input
                      placeholder={t('common:search')}
                      value={groupsSearchTerm}
                      onChange={(e) => setGroupsSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  <DataTable
                    columns={groupsColumns}
                    data={filteredGroups}
                    tableProps={{
                      'data-testid': 'permission-groups-table',
                    }}
                    onClick={(row) => {
                      navigate(
                        `/settings/permissions/groups/${row.original.id}`,
                      );
                    }}
                  />
                </div>
              </If>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function getName(name: string) {
  if (name === '*') {
    return 'All';
  }

  return name;
}
