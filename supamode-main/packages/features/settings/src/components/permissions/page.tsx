import { useState } from 'react';

import { useLoaderData, useSearchParams } from 'react-router';

import { PlusIcon } from 'lucide-react';

import { permissionsLoader } from '@kit/settings/loaders';
import { Button } from '@kit/ui/button';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';

import { CreatePermissionDialog } from './dialogs/create-permission-dialog';
import { CreatePermissionGroupDialog } from './dialogs/create-permission-group-dialog';
import { CreateRoleDialog } from './dialogs/create-role-dialog';
import { PermissionGroupsTable } from './tables/permission-groups-table';
import { PermissionsTable } from './tables/permissions-table';
import { RolesTable } from './tables/roles-table';

export function PermissionsSettingsPage() {
  const { roles, permissions, permissionGroups, access } =
    useLoaderData<typeof permissionsLoader>();

  const [params] = useSearchParams();
  const [activeTab, setActiveTab] = useState(params.get('tab') || 'roles');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Heading level={5}>
            <Trans i18nKey="settings:permissions.title" />
          </Heading>

          <Heading level={6} className={'text-muted-foreground font-normal'}>
            <Trans i18nKey="settings:permissions.description" />
          </Heading>
        </div>

        <div className="space-x-2">
          <If condition={activeTab === 'roles'}>
            <If condition={access.canCreateRole}>
              <CreateRoleDialog maxRank={access.roleRank}>
                <Button data-testid="create-role-button">
                  <PlusIcon className="mr-2 h-4 w-4" />

                  <span>
                    <Trans i18nKey="settings:roles.create" />
                  </span>
                </Button>
              </CreateRoleDialog>
            </If>
          </If>

          <If condition={activeTab === 'permissions'}>
            <If condition={access.canCreatePermission}>
              <CreatePermissionDialog>
                <Button data-testid="create-permission-button">
                  <PlusIcon className="mr-2 h-4 w-4" />

                  <span>
                    <Trans i18nKey="settings:permissions.create" />
                  </span>
                </Button>
              </CreatePermissionDialog>
            </If>
          </If>

          <If condition={activeTab === 'groups'}>
            <If condition={access.canCreatePermissionGroup}>
              <CreatePermissionGroupDialog>
                <Button data-testid="create-permission-group-button">
                  <PlusIcon className="mr-2 h-4 w-4" />

                  <span>
                    <Trans i18nKey="settings:permissions.createGroup" />
                  </span>
                </Button>
              </CreatePermissionGroupDialog>
            </If>
          </If>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="permissions-page-tabs-list">
          <TabsTrigger value="roles">
            <Trans i18nKey="settings:roles.roles" />
          </TabsTrigger>

          <TabsTrigger value="permissions">
            <Trans i18nKey="settings:permissions.permissions" />
          </TabsTrigger>

          <TabsTrigger value="groups">
            <Trans i18nKey="settings:permissions.groups" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <RolesTable data={roles} />
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <PermissionsTable data={permissions} />
        </TabsContent>

        <TabsContent value="groups" className="mt-4">
          <PermissionGroupsTable data={permissionGroups} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
