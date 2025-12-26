import { useMemo, useState } from 'react';

import { Link, useLoaderData, useNavigate } from 'react-router';

import { ColumnDef } from '@tanstack/react-table';
import {
  MoreHorizontal,
  Plus,
  Search,
  SquarePenIcon,
  TrashIcon,
} from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { DataTable } from '@kit/ui/enhanced-data-table';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { permissionGroupPermissionsLoader } from '../../../loaders';
import { DeletePermissionGroupDialog } from './delete-permission-group-dialog';
import { EditPermissionGroupDialog } from './edit-permission-group-dialog';
import { ManageGroupPermissionsDialog } from './manage-group-permissions-dialog';

export function PermissionGroupDetailsPage() {
  const { group, permissions, roles, access } =
    useLoaderData<typeof permissionGroupPermissionsLoader>();

  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'permissions' | 'roles'>(
    'permissions',
  );

  const [permissionsSearchTerm, setPermissionsSearchTerm] = useState('');
  const [rolesSearchTerm, setRolesSearchTerm] = useState('');

  const filteredPermissions = useMemo(() => {
    if (!permissionsSearchTerm) return permissions;

    return permissions.filter(
      (permission) =>
        permission.name
          .toLowerCase()
          .includes(permissionsSearchTerm.toLowerCase()) ||
        (permission.description &&
          permission.description
            .toLowerCase()
            .includes(permissionsSearchTerm.toLowerCase())) ||
        permission.action
          .toLowerCase()
          .includes(permissionsSearchTerm.toLowerCase()) ||
        (permission.tableName &&
          permission.tableName
            .toLowerCase()
            .includes(permissionsSearchTerm.toLowerCase())) ||
        (permission.schemaName &&
          permission.schemaName
            .toLowerCase()
            .includes(permissionsSearchTerm.toLowerCase())),
    );
  }, [permissions, permissionsSearchTerm]);

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

  const permissionsColumns: ColumnDef<(typeof permissions)[number]>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('settings:permissions.permission'),
        size: 250,
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
        accessorKey: 'scope',
        header: t('settings:permissions.scope'),
        cell: ({ row }) =>
          row.original.scope ? (
            <Badge variant="secondary" className="capitalize">
              {row.original.scope}
            </Badge>
          ) : (
            '-'
          ),
      },
      {
        id: 'permissionType',
        header: t('settings:permissions.type'),
        cell: ({ row }) => (
          <Badge variant="secondary" className="capitalize">
            {row.original.permissionType}
          </Badge>
        ),
      },
      {
        id: 'schemaName',
        header: t('settings:permissions.schema'),
        cell: ({ row }) => {
          const schemaName = row.original.schemaName;

          if (schemaName === '*') {
            return <Badge variant="secondary">All</Badge>;
          }

          if (!schemaName) {
            return '-';
          }

          return <Badge variant="secondary">{schemaName}</Badge>;
        },
      },
      {
        id: 'tableName',
        header: t('settings:permissions.table'),
        cell: ({ row }) => {
          const tableName = row.original.tableName;

          if (tableName === '*') {
            return <Badge variant="secondary">All</Badge>;
          }

          if (!tableName) {
            return '-';
          }

          return <Badge variant="secondary">{tableName}</Badge>;
        },
      },
      {
        accessorKey: 'action',
        header: t('settings:permissions.action'),
        cell: ({ row }) => {
          const action = row.original.action;

          if (action === '*') {
            return <Badge variant="secondary">All</Badge>;
          }

          return (
            <Badge variant="secondary" className="capitalize">
              {row.original.action}
            </Badge>
          );
        },
      },
    ],
    [t],
  );

  const rolesColumns: ColumnDef<(typeof roles)[number]>[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('settings:permissions.role'),
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
        cell: ({ row }) => row.original.rank || 0,
      },
      {
        id: 'actions',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 p-0 shadow-none"
                >
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/settings/permissions/roles/${row.original.id}`}>
                    <Trans i18nKey="settings:permissions.viewRole" />
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb>
            <BreadcrumbList className="text-xs">
              <BreadcrumbItem>
                <Link className="hover:underline" to="/settings">
                  <Trans i18nKey="common:settings" />
                </Link>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>
                <Link
                  className="hover:underline"
                  to="/settings/permissions?tab=groups"
                >
                  <Trans i18nKey="settings:permissions.groups" />
                </Link>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>{group.name}</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Heading level={5}>{group.name}</Heading>

          <If condition={group.description}>
            <p className="text-muted-foreground text-sm">{group.description}</p>
          </If>
        </div>

        <div className="flex items-center space-x-2">
          <If condition={access.canManagePermissions}>
            <ManageGroupPermissionsDialog groupId={group.id}>
              <Button
                data-testid="manage-group-permissions-button"
                variant="outline"
              >
                <Plus className="mr-2 h-4 w-4" />
                <Trans i18nKey="settings:permissions.managePermissions" />
              </Button>
            </ManageGroupPermissionsDialog>
          </If>

          <If condition={access.canUpdate}>
            <EditPermissionGroupDialog permissionGroup={group}>
              <Button
                data-testid="edit-permission-group-button"
                variant="outline"
              >
                <SquarePenIcon className="mr-2 h-4 w-4" />

                <span>
                  <Trans i18nKey="settings:permissions.editGroup" />
                </span>
              </Button>
            </EditPermissionGroupDialog>
          </If>

          <If condition={access.canDelete}>
            <DeletePermissionGroupDialog permissionGroup={group}>
              <Button
                data-testid="delete-permission-group-button"
                variant="destructive"
              >
                <TrashIcon className="mr-2 h-4 w-4" />

                <span>
                  <Trans i18nKey="settings:permissions.deleteGroup" />
                </span>
              </Button>
            </DeletePermissionGroupDialog>
          </If>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => setActiveTab(tab as 'permissions' | 'roles')}
      >
        <TabsList>
          <TabsTrigger value="permissions" data-testid="permissions-tab">
            <Trans i18nKey="settings:permissions.permissions" />
          </TabsTrigger>

          <TabsTrigger value="roles" data-testid="roles-tab">
            <Trans i18nKey="settings:permissions.roles" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="settings:permissions.permissionsInGroup" />
              </CardTitle>

              <CardDescription>
                <Trans i18nKey="settings:permissions.permissionsInGroupDescription" />
              </CardDescription>
            </CardHeader>

            <CardContent>
              <If
                condition={permissions.length > 0}
                fallback={
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      <Trans i18nKey="settings:permissions.noPermissionsAssignedToGroup" />
                    </p>

                    <ManageGroupPermissionsDialog groupId={group.id}>
                      <Button
                        data-testid="add-permissions-button"
                        variant="outline"
                        className="mt-4"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <Trans i18nKey="settings:permissions.addPermissions" />
                      </Button>
                    </ManageGroupPermissionsDialog>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />

                    <Input
                      placeholder={t('common:search')}
                      value={permissionsSearchTerm}
                      onChange={(e) => setPermissionsSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>

                  <DataTable
                    columns={permissionsColumns}
                    data={filteredPermissions}
                    tableProps={{
                      'data-testid': 'group-permissions-table',
                    }}
                    onClick={(row) => {
                      navigate(`/settings/permissions/${row.original.id}`);
                    }}
                  />
                </div>
              </If>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="settings:permissions.rolesUsingThisGroup" />
              </CardTitle>

              <CardDescription>
                <Trans i18nKey="settings:permissions.rolesUsingThisGroupDescription" />
              </CardDescription>
            </CardHeader>

            <CardContent>
              <If
                condition={roles.length > 0}
                fallback={
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      <Trans i18nKey="settings:permissions.noRolesAssignedToGroup" />
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
                      'data-testid': 'group-roles-table',
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
      </Tabs>
    </div>
  );
}
