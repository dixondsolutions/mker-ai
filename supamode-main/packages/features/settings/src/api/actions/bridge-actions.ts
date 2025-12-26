import { redirect } from 'react-router';

import { getI18n } from 'react-i18next';
import { z } from 'zod';

import {
  createAction,
  createActionWithCache,
} from '@kit/shared/router-query-bridge';
import { toast } from '@kit/ui/sonner';

import { activateMemberAction } from '../../actions/activate-member-action';
import { deactivateMemberAction } from '../../actions/deactivate-member-action';
import { saveLayoutAction } from '../../actions/save-layout-action';
import { syncManagedTablesRouterAction } from '../../actions/sync-managed-tables-action';
import { updateAccountAction } from '../../actions/update-account-action';
import { updateMemberRoleAction } from '../../actions/update-member-role-action';
import { updateMfaConfigurationAction } from '../../actions/update-mfa-configuration-action';
import {
  createPermissionGroupAction,
  deletePermissionGroupAction,
  updatePermissionGroupAction,
  updatePermissionGroupPermissionsAction,
} from '../../actions/update-permission-group-actions';
import {
  batchUpdateRolePermissionGroupsAction,
  batchUpdateRolePermissionsAction,
  createPermissionAction,
  createRoleAction,
  deletePermissionAction,
  deleteRoleAction,
  updatePermissionAction,
  updateRoleAction,
} from '../../actions/update-permissions-actions';
import { updatePreferencesAction } from '../../actions/update-preferences-action';
import { updateTableColumnsMetadataAction } from '../../actions/update-table-columns-metadata-action';
import { updateTableMetadataRouterAction } from '../../actions/update-table-metadata-action';
import { updateTablesMetadataRouterAction } from '../../actions/update-tables-metadata-action';
import { settingsQueryKeys } from '../loaders/bridge-loaders';

const SchemaTableParamsSchema = z.object({
  schema: z.string().min(1),
  table: z.string().min(1),
});

const IdParamsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Bridge-powered action for general settings
 * Handles user preferences and MFA configuration
 */
export const generalSettingsBridgeAction = createAction({
  mutationFn: async ({ request }) => {
    const data = await request.json();
    const t = getI18n().t;
    const intent = data.intent;

    switch (intent) {
      case 'update-user-preferences': {
        const promise = updatePreferencesAction(data.data);

        return toast
          .promise(promise, {
            loading: t('settings:general.savingPreferences'),
            success: t('settings:general.preferencesSaved'),
            error: (error) => {
              return (
                error.message || t('settings:general.failedToSavePreferences')
              );
            },
          })
          .unwrap()
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      case 'update-mfa-configuration': {
        const promise = updateMfaConfigurationAction(data.data.requiresMfa);

        return toast
          .promise(promise, {
            loading: t('settings:general.savingMfaConfiguration'),
            success: t('settings:general.mfaConfigurationSaved'),
            error: (error) => {
              return (
                error.message ||
                t('settings:general.failedToSaveMfaConfiguration')
              );
            },
          })
          .unwrap()
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      default:
        throw new Error(`Invalid intent: ${intent}`);
    }
  },
  invalidateKeys: () => [
    settingsQueryKeys.account(),
    settingsQueryKeys.mfaConfiguration(),
  ],
});

/**
 * Bridge-powered action for resources settings
 * Handles table metadata updates and sync operations
 */
export const resourcesSettingsBridgeAction = createActionWithCache({
  mutationFn: async ({ request }) => {
    const data = await request.json();
    const intent = data.intent;
    const t = getI18n().t;

    switch (intent) {
      case 'update-tables-metadata': {
        const promise = updateTablesMetadataRouterAction(data.data);

        return toast
          .promise(promise, {
            loading: t('settings:table.updatingTablesMetadata'),
            success: t('settings:table.tablesMetadataUpdatedSuccessfully'),
            error: (error) => {
              return (
                error.message ||
                t('settings:table.failedToUpdateTablesMetadata')
              );
            },
          })
          .unwrap();
      }

      case 'sync-managed-tables': {
        const promise = syncManagedTablesRouterAction(data);

        return toast
          .promise(promise, {
            loading: t('settings:table.syncingTables'),
            success: t('settings:table.tablesSyncedSuccessfully'),
            error: (error) => {
              return error.message || t('settings:table.failedToSyncTables');
            },
          })
          .unwrap();
      }

      default:
        throw new Error(`Invalid intent: ${intent}`);
    }
  },
  invalidateKeys: () => [
    settingsQueryKeys.tablesMetadata(),
    // Also invalidate all table metadata in case of sync
    settingsQueryKeys.all,
  ],
  cacheDependencies: [{ type: 'ALL_TABLES' }],
});

/**
 * Bridge-powered action for table settings
 * Handles individual table metadata updates
 */
export const tableSettingsBridgeAction = createActionWithCache({
  mutationFn: async ({ request, params }) => {
    const data = await request.json();
    const t = getI18n().t;
    const intent = data.intent;

    switch (intent) {
      case 'update-table-metadata': {
        const { schema, table } = SchemaTableParamsSchema.parse(params);

        const promise = updateTableMetadataRouterAction({
          schema,
          table,
          data: data.data,
        });

        return toast
          .promise(promise, {
            loading: t('settings:table.updatingTableMetadata'),
            success: t('settings:table.tableMetadataUpdatedSuccessfully'),
            error: (error) => {
              return (
                error.message || t('settings:table.failedToUpdateTableMetadata')
              );
            },
          })
          .unwrap();
      }

      case 'update-table-columns-config': {
        const { schema, table } = SchemaTableParamsSchema.parse(params);

        const promise = updateTableColumnsMetadataAction({
          schema,
          table,
          data: data.data,
        });

        return toast
          .promise(promise, {
            loading: t('settings:table.updatingColumn'),
            success: t('settings:table.columnUpdatedSuccessfully'),
            error: (error) => {
              return error.message || t('settings:table.failedToUpdateColumn');
            },
          })
          .unwrap();
      }

      case 'save-layout': {
        const { schema, table } = SchemaTableParamsSchema.parse(params);

        // Parse the layout from JSON string
        const layout =
          typeof data.data === 'string' ? JSON.parse(data.data) : data.data;

        const promise = saveLayoutAction({
          schema,
          table,
          layout,
        });

        return toast
          .promise(promise, {
            loading: t('settings:table.savingLayout'),
            success: t('settings:table.layoutSavedSuccessfully'),
            error: (error) => {
              return error.message || t('settings:table.failedToSaveLayout');
            },
          })
          .unwrap();
      }

      case 'reset-layout': {
        const { schema, table } = SchemaTableParamsSchema.parse(params);

        const promise = saveLayoutAction({
          schema,
          table,
          layout: null, // null clears the custom layout
        });

        return toast
          .promise(promise, {
            loading: t('settings:table.resettingLayout'),
            success: t('settings:table.layoutResetSuccessfully'),
            error: (error) => {
              return error.message || t('settings:table.failedToResetLayout');
            },
          })
          .unwrap();
      }

      default:
        throw new Error(`Invalid intent: ${intent}`);
    }
  },
  invalidateKeys: ({ params }) => {
    const { schema, table } = SchemaTableParamsSchema.parse(params);
    return [
      settingsQueryKeys.tableMetadata(schema, table),
      settingsQueryKeys.tablesMetadata(),
    ];
  },
  cacheDependencies: [
    // For table metadata updates that affect display (display_name, display_format),
    // we should clear all table caches since foreign key references will be affected
    { type: 'TABLE_DISPLAY_CHANGE' },
  ],
});

/**
 * Bridge-powered action for member details
 * Handles member activation, deactivation, role assignment, and account updates
 */
export const memberDetailsBridgeAction = createActionWithCache({
  mutationFn: async ({ request, params }) => {
    const formData = await request.formData();
    const { id: accountId } = IdParamsSchema.parse(params);
    const intent = formData.get('intent');
    const t = getI18n().t;

    switch (intent) {
      case 'deactivate': {
        const promise = deactivateMemberAction(accountId);

        return toast
          .promise(promise, {
            loading: t('settings:member.deactivatingMember'),
            success: t('settings:member.memberDeactivatedSuccessfully'),
            error: (error) => {
              return (
                error.message || t('settings:member.failedToDeactivateMember')
              );
            },
          })
          .unwrap();
      }

      case 'activate': {
        const promise = activateMemberAction(accountId);

        return toast
          .promise(promise, {
            loading: t('settings:member.activatingMember'),
            success: t('settings:member.memberActivatedSuccessfully'),
            error: (error) => {
              return (
                error.message || t('settings:member.failedToActivateMember')
              );
            },
          })
          .unwrap();
      }

      case 'assign-role': {
        const data = z
          .object({ roleId: z.string() })
          .parse(JSON.parse(formData.get('data') as string));

        const promise = updateMemberRoleAction({
          accountId,
          roleId: data.roleId,
        });

        return toast
          .promise(promise, {
            loading: t('settings:member.assigningRole'),
            success: t('settings:member.roleAssignedSuccessfully'),
            error: (error) => {
              return error.message || t('settings:member.failedToAssignRole');
            },
          })
          .unwrap();
      }

      case 'update-account':
        return updateAccountAction(
          accountId,
          JSON.parse(formData.get('data') as string),
        );

      default:
        throw new Error(`Invalid intent: ${intent}`);
    }
  },
  invalidateKeys: ({ params }) => {
    const { id: accountId } = IdParamsSchema.parse(params);
    return [
      settingsQueryKeys.memberDetails(accountId),
      settingsQueryKeys.members(),
    ];
  },
  cacheDependencies: ({ params }) => {
    const { id: accountId } = IdParamsSchema.parse(params);
    return [{ type: 'MEMBER_CHANGE', params: accountId }];
  },
});

/**
 * Bridge-powered action for permissions
 * Handles permission, role, and permission group creation
 */
export const permissionsBridgeAction = createActionWithCache({
  mutationFn: async ({ request }) => {
    const formData = await request.formData();
    const intent = formData.get('intent');
    const t = getI18n().t;

    switch (intent) {
      case 'create-permission': {
        const permissionData = JSON.parse(formData.get('data') as string);
        const createPromise = createPermissionAction(permissionData);

        return toast
          .promise(createPromise, {
            loading: t('settings:permissions.creatingPermission'),
            success: t('settings:permissions.permissionCreatedSuccessfully'),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToCreatePermission')
              );
            },
          })
          .unwrap();
      }

      case 'create-permission-group': {
        const permissionGroupData = JSON.parse(formData.get('data') as string);
        const createPromise = createPermissionGroupAction(permissionGroupData);

        return toast
          .promise(createPromise, {
            loading: t('settings:permissions.creatingPermissionGroup'),
            success: t(
              'settings:permissions.permissionGroupCreatedSuccessfully',
            ),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToCreatePermissionGroup')
              );
            },
          })
          .unwrap()
          .then((response) => {
            return redirect(`/settings/permissions/groups/${response.data}`);
          })
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      case 'create-role': {
        const roleData = JSON.parse(formData.get('data') as string);
        const promise = createRoleAction(roleData);

        return toast
          .promise(promise, {
            loading: t('settings:permissions.creatingRole'),
            success: t('settings:permissions.roleCreatedSuccessfully'),
            error: (error) => {
              return (
                error.message || t('settings:permissions.failedToCreateRole')
              );
            },
          })
          .unwrap()
          .then((response) => {
            return redirect(`/settings/permissions/roles/${response.data.id}`);
          })
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      default:
        throw new Error(`Invalid intent: ${intent}`);
    }
  },
  invalidateKeys: () => [settingsQueryKeys.permissions()],
  cacheDependencies: [{ type: 'PERMISSION_CHANGE' }],
});

/**
 * Bridge-powered action for permission details
 * Handles permission deletion and updates
 */
export const permissionDetailsBridgeAction = createActionWithCache({
  mutationFn: async ({ request, params }) => {
    const formData = await request.formData();
    const { id: permissionId } = IdParamsSchema.parse(params);
    const intent = formData.get('intent');
    const t = getI18n().t;

    switch (intent) {
      case 'delete-permission': {
        const deletePromise = deletePermissionAction(permissionId);

        return toast
          .promise(deletePromise, {
            loading: t('settings:permissions.deletingPermission'),
            success: t('settings:permissions.permissionDeletedSuccessfully'),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToDeletePermission')
              );
            },
          })
          .unwrap()
          .then(() => {
            return redirect(`/settings/permissions?tab=permissions`);
          })
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      case 'update-permission': {
        const data = JSON.parse(formData.get('data') as string);

        const updatePromise = updatePermissionAction({
          id: permissionId,
          data,
        });

        return toast
          .promise(updatePromise, {
            loading: t('settings:permissions.updatingPermission'),
            success: t('settings:permissions.permissionUpdatedSuccessfully'),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToUpdatePermission')
              );
            },
          })
          .unwrap();
      }

      default:
        throw new Error(`Invalid intent: ${intent}`);
    }
  },
  invalidateKeys: ({ params }) => {
    const { id: permissionId } = IdParamsSchema.parse(params);
    return [
      settingsQueryKeys.permissionDetails(permissionId),
      settingsQueryKeys.permissions(),
    ];
  },
  cacheDependencies: [{ type: 'PERMISSION_CHANGE' }],
});

/**
 * Bridge-powered action for permission group details
 * Handles permission group deletion, updates, and permission management
 */
export const permissionGroupDetailsBridgeAction = createActionWithCache({
  mutationFn: async ({ request, params }) => {
    const formData = await request.formData();
    const { id: permissionGroupId } = IdParamsSchema.parse(params);
    const intent = formData.get('intent');
    const t = getI18n().t;

    switch (intent) {
      case 'delete-permission-group': {
        const promise = deletePermissionGroupAction(permissionGroupId);

        return toast
          .promise(promise, {
            loading: t('settings:permissions.deletingPermissionGroup'),
            success: t(
              'settings:permissions.permissionGroupDeletedSuccessfully',
            ),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToDeletePermissionGroup')
              );
            },
          })
          .unwrap()
          .then(() => {
            return redirect(`/settings/permissions?tab=groups`);
          })
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      case 'set-permissions': {
        const { toAdd, toRemove } = JSON.parse(formData.get('data') as string);

        const batchUpdatePromise = updatePermissionGroupPermissionsAction({
          groupId: permissionGroupId,
          toAdd,
          toRemove,
        });

        return toast
          .promise(batchUpdatePromise, {
            loading: t('settings:permissions.updatingGroupPermissions'),
            success: t('settings:permissions.groupPermissionsUpdated'),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToUpdateGroupPermissions')
              );
            },
          })
          .unwrap()
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      case 'update-permission-group': {
        const data = JSON.parse(formData.get('data') as string);

        const updatePromise = updatePermissionGroupAction({
          id: permissionGroupId,
          data,
        });

        return toast
          .promise(updatePromise, {
            loading: t('settings:permissions.updatingPermissionGroup'),
            success: t(
              'settings:permissions.permissionGroupUpdatedSuccessfully',
            ),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToUpdatePermissionGroup')
              );
            },
          })
          .unwrap();
      }

      default:
        throw new Error(`Invalid intent: ${intent}`);
    }
  },
  invalidateKeys: ({ params }) => {
    const { id: permissionGroupId } = IdParamsSchema.parse(params);
    return [
      settingsQueryKeys.permissionGroupPermissions(permissionGroupId),
      settingsQueryKeys.permissions(),
    ];
  },
  cacheDependencies: [{ type: 'PERMISSION_CHANGE' }],
});

/**
 * Bridge-powered action for role details
 * Handles role deletion, updates, and permission management
 */
export const roleDetailsBridgeAction = createActionWithCache({
  mutationFn: async ({ request, params }) => {
    const formData = await request.formData();
    const { id: roleId } = IdParamsSchema.parse(params);
    const intent = formData.get('intent');
    const t = getI18n().t;

    switch (intent) {
      case 'delete-role': {
        const promise = deleteRoleAction(roleId);

        return toast
          .promise(promise, {
            loading: t('settings:permissions.deletingRole'),
            success: t('settings:permissions.roleDeletedSuccessfully'),
            error: (error) => {
              return (
                error.message || t('settings:permissions.failedToDeleteRole')
              );
            },
          })
          .unwrap()
          .then(() => {
            return redirect(`/settings/permissions?tab=roles`);
          })
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      case 'update-role': {
        const data = JSON.parse(formData.get('data') as string);

        const updatePromise = updateRoleAction({
          id: roleId,
          data,
        });

        return toast
          .promise(updatePromise, {
            loading: t('settings:permissions.updatingRole'),
            success: t('settings:permissions.roleUpdatedSuccessfully'),
            error: (error) => {
              return (
                error.message || t('settings:permissions.failedToUpdateRole')
              );
            },
          })
          .unwrap();
      }

      case 'set-permissions': {
        const { toAdd, toRemove } = JSON.parse(formData.get('data') as string);

        const batchUpdatePromise = batchUpdateRolePermissionsAction({
          roleId,
          toAdd,
          toRemove,
        });

        return toast
          .promise(batchUpdatePromise, {
            loading: t('settings:permissions.updatingRolePermissions'),
            success: t('settings:permissions.rolePermissionsUpdated'),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToUpdateRolePermissions')
              );
            },
          })
          .unwrap()
          .catch(() => {
            // don't do anything, we already show the error in the toast
          });
      }

      case 'set-permission-groups': {
        const { toAdd, toRemove } = JSON.parse(formData.get('data') as string);

        const updatePromise = batchUpdateRolePermissionGroupsAction({
          roleId,
          toAdd,
          toRemove,
        });

        return toast
          .promise(updatePromise, {
            loading: t('settings:permissions.updatingRolePermissionGroups'),
            success: t('settings:permissions.rolePermissionGroupsUpdated'),
            error: (error) => {
              return (
                error.message ||
                t('settings:permissions.failedToUpdateRolePermissionGroups')
              );
            },
          })
          .unwrap();
      }

      default:
        throw new Error(`Invalid intent: ${intent}`);
    }
  },
  invalidateKeys: ({ params }) => {
    const { id: roleId } = IdParamsSchema.parse(params);
    return [
      settingsQueryKeys.rolePermissions(roleId),
      settingsQueryKeys.permissions(),
    ];
  },
  cacheDependencies: ({ params }) => {
    const { id: roleId } = IdParamsSchema.parse(params);
    return [{ type: 'ROLE_CHANGE', params: roleId }];
  },
});
