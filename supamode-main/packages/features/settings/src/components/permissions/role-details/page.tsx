import { useMemo, useState } from 'react';

import { Link, useLoaderData, useNavigate } from 'react-router';

import { ColumnDef } from '@tanstack/react-table';
import {
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  SettingsIcon,
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
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { PageHeader } from '@kit/ui/page';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { rolePermissionsLoader } from '../../../loaders';
import { AssignPermissionDialog } from './assign-permission-dialog';
import { AssignPermissionGroupDialog } from './assign-permission-group-dialog';
import { DeleteRoleDialog } from './delete-role-dialog';
import { EditRoleDialog } from './edit-role-dialog';

export function RoleDetailsPage() {
  const data = useLoaderData<typeof rolePermissionsLoader>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'permissions' | 'groups'>(
    'permissions',
  );

  const [permissionsSearchTerm, setPermissionsSearchTerm] = useState('');

  const [permissionsTypeFilter, setPermissionsTypeFilter] =
    useState<string>('all');

  const [permissionsScopeFilter, setPermissionsScopeFilter] =
    useState<string>('all');

  const [permissionsShowFilters, setPermissionsShowFilters] = useState(false);
  const [groupsSearchTerm, setGroupsSearchTerm] = useState('');

  const role = data.roles[0]!;

  const filteredPermissions = useMemo(() => {
    let filtered = data.permissions;

    if (permissionsSearchTerm) {
      filtered = filtered.filter(
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
          (permission.systemResource &&
            permission.systemResource
              .toLowerCase()
              .includes(permissionsSearchTerm.toLowerCase())) ||
          (permission.tableName &&
            permission.tableName
              .toLowerCase()
              .includes(permissionsSearchTerm.toLowerCase())),
      );
    }

    if (permissionsTypeFilter !== 'all') {
      filtered = filtered.filter(
        (permission) => permission.permissionType === permissionsTypeFilter,
      );
    }

    if (permissionsScopeFilter !== 'all') {
      filtered = filtered.filter(
        (permission) => permission.scope === permissionsScopeFilter,
      );
    }

    return filtered;
  }, [
    data.permissions,
    permissionsSearchTerm,
    permissionsTypeFilter,
    permissionsScopeFilter,
  ]);

  const filteredGroups = useMemo(() => {
    if (!groupsSearchTerm) return data.permission_groups;

    return data.permission_groups.filter(
      (group) =>
        group.name.toLowerCase().includes(groupsSearchTerm.toLowerCase()) ||
        (group.description &&
          group.description
            .toLowerCase()
            .includes(groupsSearchTerm.toLowerCase())),
    );
  }, [data.permission_groups, groupsSearchTerm]);

  const permissionsColumns: ColumnDef<(typeof data.permissions)[number]>[] =
    useMemo(
      () => [
        {
          accessorKey: 'name',
          header: t('settings:permissions.permission'),
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
                row.original.permissionType === 'system'
                  ? 'default'
                  : 'secondary'
              }
            >
              {row.original.permissionType}
            </Badge>
          ),
        },
        {
          accessorKey: 'action',
          header: t('common:action'),
          cell: ({ row }) => {
            const action = row.original.action;

            if (action === '*') {
              return <Badge variant="secondary">All</Badge>;
            }

            return (
              <Badge variant="secondary" className="capitalize">
                {action}
              </Badge>
            );
          },
        },
        {
          accessorKey: 'scope',
          header: t('settings:permissions.scope'),
          cell: ({ row }) => {
            const scope = row.original.scope;

            if (!scope) {
              return '-';
            }

            return (
              <Badge variant="secondary" className="capitalize">
                {scope}
              </Badge>
            );
          },
        },
      ],
      [t],
    );

  const permissionGroupsColumns: ColumnDef<
    (typeof data.permission_groups)[number]
  >[] = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('settings:permissions.group'),
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
                <DropdownMenuItem>
                  <Link to={`/settings/permissions/groups/${row.original.id}`}>
                    <Trans i18nKey="settings:permissions.viewGroup" />
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
      <PageHeader
        title={role.name}
        description={role.description}
        breadcrumbs={
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
                  to="/settings/permissions?tab=roles"
                >
                  <Trans i18nKey="settings:roles.roles" />
                </Link>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem>{role.name}</BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      >
        <If condition={data.access.canManagePermissions}>
          <AssignPermissionDialog roleId={role.id}>
            <Button data-testid="manage-permissions-button" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              <Trans i18nKey="settings:permissions.managePermissions" />
            </Button>
          </AssignPermissionDialog>
        </If>

        <If condition={data.access.canManagePermissionGroups}>
          <AssignPermissionGroupDialog roleId={role.id}>
            <Button
              data-testid="manage-permission-groups-button"
              variant="outline"
            >
              <Plus className="mr-2 h-4 w-4" />
              <Trans i18nKey="settings:permissions.managePermissionGroups" />
            </Button>
          </AssignPermissionGroupDialog>
        </If>

        <If condition={data.access.canUpdate}>
          <EditRoleDialog roleId={role.id} maxRank={data.access.maxRank}>
            <Button data-testid="edit-role-button" variant="outline">
              <SettingsIcon className="mr-2 h-4 w-4" />
              <Trans i18nKey="settings:roles.edit" />
            </Button>
          </EditRoleDialog>
        </If>

        <If condition={data.access.canDelete}>
          <DeleteRoleDialog
            roleName={role.name}
            roleDescription={role.description || undefined}
          >
            <Button data-testid="delete-role-button" variant="destructive">
              <TrashIcon className="mr-2 h-4 w-4" />
              <Trans i18nKey="settings:roles.delete" />
            </Button>
          </DeleteRoleDialog>
        </If>
      </PageHeader>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:roles.rank" />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <span className="text-xl font-semibold">{role.rank ?? 0}</span>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(tab) => setActiveTab(tab as 'permissions' | 'groups')}
      >
        <TabsList>
          <TabsTrigger value="permissions" data-testid="permissions-tab">
            <Trans i18nKey="settings:permissions.permissions" />
          </TabsTrigger>

          <TabsTrigger value="groups" data-testid="groups-tab">
            <Trans i18nKey="settings:permissions.groups" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="permissions" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="settings:permissions.assignedPermissions" />
              </CardTitle>

              <CardDescription>
                <Trans i18nKey="settings:permissions.assignedPermissionsDescription" />
              </CardDescription>
            </CardHeader>

            <CardContent>
              <If
                condition={data.permissions.length > 0}
                fallback={
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      <Trans i18nKey="settings:permissions.noPermissionsAssigned" />
                    </p>

                    <If condition={data.access.canManagePermissions}>
                      <AssignPermissionDialog roleId={role.id}>
                        <Button variant="outline" className="mt-4">
                          <Plus className="mr-2 h-4 w-4" />

                          <Trans i18nKey="settings:permissions.assignPermission" />
                        </Button>
                      </AssignPermissionDialog>
                    </If>
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="text-muted-foreground absolute top-2.5 left-2 h-4 w-4" />
                      <Input
                        placeholder={t('common:search')}
                        value={permissionsSearchTerm}
                        onChange={(e) =>
                          setPermissionsSearchTerm(e.target.value)
                        }
                        className="pl-8"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPermissionsShowFilters(!permissionsShowFilters)
                      }
                      className="shrink-0"
                    >
                      <Filter className="mr-2 h-4 w-4" />
                      {t('common:filters')}
                    </Button>
                  </div>

                  {permissionsShowFilters && (
                    <div className="bg-muted/20 grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          {t('settings:permissions.type')}
                        </label>

                        <Select
                          value={permissionsTypeFilter}
                          onValueChange={setPermissionsTypeFilter}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>

                          <SelectContent>
                            <SelectItem value="all">
                              {t('common:all')}
                            </SelectItem>

                            <SelectItem value="system">
                              {t('settings:permissions.system')}
                            </SelectItem>

                            <SelectItem value="data">
                              {t('settings:permissions.data')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {permissionsTypeFilter === 'data' && (
                        <div>
                          <label className="mb-1 block text-sm font-medium">
                            {t('settings:permissions.scope')}
                          </label>
                          <Select
                            value={permissionsScopeFilter}
                            onValueChange={setPermissionsScopeFilter}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">
                                {t('common:all')}
                              </SelectItem>
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
                    </div>
                  )}

                  <DataTable
                    columns={permissionsColumns}
                    data={filteredPermissions}
                    tableProps={{
                      'data-testid': 'role-permissions-table',
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

        <TabsContent value="groups" className="mt-2">
          <Card>
            <CardHeader>
              <CardTitle>
                <Trans i18nKey="settings:permissions.assignedPermissionGroups" />
              </CardTitle>

              <CardDescription>
                <Trans i18nKey="settings:permissions.assignedPermissionGroupsDescription" />
              </CardDescription>
            </CardHeader>

            <CardContent>
              <If
                condition={data.permission_groups.length > 0}
                fallback={
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">
                      <Trans i18nKey="settings:permissions.noPermissionGroupsAssigned" />
                    </p>

                    <If condition={data.access.canManagePermissionGroups}>
                      <AssignPermissionGroupDialog roleId={role.id}>
                        <Button
                          data-testid="assign-permission-group-button"
                          variant="outline"
                          className="mt-4"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          <Trans i18nKey="settings:permissions.assignPermissionGroup" />
                        </Button>
                      </AssignPermissionGroupDialog>
                    </If>
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
                    columns={permissionGroupsColumns}
                    data={filteredGroups}
                    tableProps={{
                      'data-testid': 'role-permission-groups-table',
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
