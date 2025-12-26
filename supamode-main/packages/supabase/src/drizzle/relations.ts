import { relations } from 'drizzle-orm/relations';

import {
  accountPermissionsInSupamode,
  accountRolesInSupamode,
  accountsInSupamode,
  auditLogsInSupamode,
  dashboardRoleSharesInSupamode,
  dashboardWidgetsInSupamode,
  dashboardsInSupamode,
  permissionGroupPermissionsInSupamode,
  permissionGroupsInSupamode,
  permissionsInSupamode,
  rolePermissionGroupsInSupamode,
  rolePermissionsInSupamode,
  rolesInSupamode,
  savedViewRolesInSupamode,
  savedViewsInSupamode,
  tableMetadataInSupamode,
  usersInAuth,
} from './schema';

export const accountsInSupamodeRelations = relations(
  accountsInSupamode,
  ({ one, many }) => ({
    usersInAuth: one(usersInAuth, {
      fields: [accountsInSupamode.authUserId],
      references: [usersInAuth.id],
    }),
    permissionGroupsInSupamodes: many(permissionGroupsInSupamode),
    savedViewsInSupamodes: many(savedViewsInSupamode),
    auditLogsInSupamodes: many(auditLogsInSupamode),
    dashboardsInSupamodes: many(dashboardsInSupamode),
    dashboardRoleSharesInSupamodes: many(dashboardRoleSharesInSupamode),
    permissionGroupPermissionsInSupamodes: many(
      permissionGroupPermissionsInSupamode,
    ),
    accountRolesInSupamodes_accountId: many(accountRolesInSupamode, {
      relationName: 'accountRolesInSupamode_accountId_accountsInSupamode_id',
    }),
    accountRolesInSupamodes_assignedBy: many(accountRolesInSupamode, {
      relationName: 'accountRolesInSupamode_assignedBy_accountsInSupamode_id',
    }),
    rolePermissionGroupsInSupamodes: many(rolePermissionGroupsInSupamode),
    accountPermissionsInSupamodes_accountId: many(
      accountPermissionsInSupamode,
      {
        relationName:
          'accountPermissionsInSupamode_accountId_accountsInSupamode_id',
      },
    ),
    accountPermissionsInSupamodes_grantedBy: many(
      accountPermissionsInSupamode,
      {
        relationName:
          'accountPermissionsInSupamode_grantedBy_accountsInSupamode_id',
      },
    ),
    rolePermissionsInSupamodes: many(rolePermissionsInSupamode),
  }),
);

export const usersInAuthRelations = relations(usersInAuth, ({ many }) => ({
  accountsInSupamodes: many(accountsInSupamode),
  auditLogsInSupamodes: many(auditLogsInSupamode),
}));

export const permissionGroupsInSupamodeRelations = relations(
  permissionGroupsInSupamode,
  ({ one, many }) => ({
    accountsInSupamode: one(accountsInSupamode, {
      fields: [permissionGroupsInSupamode.createdBy],
      references: [accountsInSupamode.id],
    }),
    permissionGroupPermissionsInSupamodes: many(
      permissionGroupPermissionsInSupamode,
    ),
    rolePermissionGroupsInSupamodes: many(rolePermissionGroupsInSupamode),
  }),
);

export const savedViewsInSupamodeRelations = relations(
  savedViewsInSupamode,
  ({ one, many }) => ({
    accountsInSupamode: one(accountsInSupamode, {
      fields: [savedViewsInSupamode.createdBy],
      references: [accountsInSupamode.id],
    }),
    tableMetadataInSupamode: one(tableMetadataInSupamode, {
      fields: [savedViewsInSupamode.schemaName],
      references: [tableMetadataInSupamode.schemaName],
    }),
    savedViewRolesInSupamodes: many(savedViewRolesInSupamode),
  }),
);

export const tableMetadataInSupamodeRelations = relations(
  tableMetadataInSupamode,
  ({ many }) => ({
    savedViewsInSupamodes: many(savedViewsInSupamode),
    dashboardWidgetsInSupamodes: many(dashboardWidgetsInSupamode),
  }),
);

export const auditLogsInSupamodeRelations = relations(
  auditLogsInSupamode,
  ({ one }) => ({
    accountsInSupamode: one(accountsInSupamode, {
      fields: [auditLogsInSupamode.accountId],
      references: [accountsInSupamode.id],
    }),
    usersInAuth: one(usersInAuth, {
      fields: [auditLogsInSupamode.userId],
      references: [usersInAuth.id],
    }),
  }),
);

export const dashboardsInSupamodeRelations = relations(
  dashboardsInSupamode,
  ({ one, many }) => ({
    accountsInSupamode: one(accountsInSupamode, {
      fields: [dashboardsInSupamode.createdBy],
      references: [accountsInSupamode.id],
    }),
    dashboardWidgetsInSupamodes: many(dashboardWidgetsInSupamode),
    dashboardRoleSharesInSupamodes: many(dashboardRoleSharesInSupamode),
  }),
);

export const dashboardWidgetsInSupamodeRelations = relations(
  dashboardWidgetsInSupamode,
  ({ one }) => ({
    dashboardsInSupamode: one(dashboardsInSupamode, {
      fields: [dashboardWidgetsInSupamode.dashboardId],
      references: [dashboardsInSupamode.id],
    }),
    tableMetadataInSupamode: one(tableMetadataInSupamode, {
      fields: [dashboardWidgetsInSupamode.schemaName],
      references: [tableMetadataInSupamode.schemaName],
    }),
  }),
);

export const savedViewRolesInSupamodeRelations = relations(
  savedViewRolesInSupamode,
  ({ one }) => ({
    savedViewsInSupamode: one(savedViewsInSupamode, {
      fields: [savedViewRolesInSupamode.viewId],
      references: [savedViewsInSupamode.id],
    }),
    rolesInSupamode: one(rolesInSupamode, {
      fields: [savedViewRolesInSupamode.roleId],
      references: [rolesInSupamode.id],
    }),
  }),
);

export const rolesInSupamodeRelations = relations(
  rolesInSupamode,
  ({ many }) => ({
    savedViewRolesInSupamodes: many(savedViewRolesInSupamode),
    dashboardRoleSharesInSupamodes: many(dashboardRoleSharesInSupamode),
    accountRolesInSupamodes: many(accountRolesInSupamode),
    rolePermissionGroupsInSupamodes: many(rolePermissionGroupsInSupamode),
    rolePermissionsInSupamodes: many(rolePermissionsInSupamode),
  }),
);

export const dashboardRoleSharesInSupamodeRelations = relations(
  dashboardRoleSharesInSupamode,
  ({ one }) => ({
    dashboardsInSupamode: one(dashboardsInSupamode, {
      fields: [dashboardRoleSharesInSupamode.dashboardId],
      references: [dashboardsInSupamode.id],
    }),
    rolesInSupamode: one(rolesInSupamode, {
      fields: [dashboardRoleSharesInSupamode.roleId],
      references: [rolesInSupamode.id],
    }),
    accountsInSupamode: one(accountsInSupamode, {
      fields: [dashboardRoleSharesInSupamode.grantedBy],
      references: [accountsInSupamode.id],
    }),
  }),
);

export const permissionGroupPermissionsInSupamodeRelations = relations(
  permissionGroupPermissionsInSupamode,
  ({ one }) => ({
    permissionGroupsInSupamode: one(permissionGroupsInSupamode, {
      fields: [permissionGroupPermissionsInSupamode.groupId],
      references: [permissionGroupsInSupamode.id],
    }),
    permissionsInSupamode: one(permissionsInSupamode, {
      fields: [permissionGroupPermissionsInSupamode.permissionId],
      references: [permissionsInSupamode.id],
    }),
    accountsInSupamode: one(accountsInSupamode, {
      fields: [permissionGroupPermissionsInSupamode.addedBy],
      references: [accountsInSupamode.id],
    }),
  }),
);

export const permissionsInSupamodeRelations = relations(
  permissionsInSupamode,
  ({ many }) => ({
    permissionGroupPermissionsInSupamodes: many(
      permissionGroupPermissionsInSupamode,
    ),
    accountPermissionsInSupamodes: many(accountPermissionsInSupamode),
    rolePermissionsInSupamodes: many(rolePermissionsInSupamode),
  }),
);

export const accountRolesInSupamodeRelations = relations(
  accountRolesInSupamode,
  ({ one }) => ({
    accountsInSupamode_accountId: one(accountsInSupamode, {
      fields: [accountRolesInSupamode.accountId],
      references: [accountsInSupamode.id],
      relationName: 'accountRolesInSupamode_accountId_accountsInSupamode_id',
    }),
    rolesInSupamode: one(rolesInSupamode, {
      fields: [accountRolesInSupamode.roleId],
      references: [rolesInSupamode.id],
    }),
    accountsInSupamode_assignedBy: one(accountsInSupamode, {
      fields: [accountRolesInSupamode.assignedBy],
      references: [accountsInSupamode.id],
      relationName: 'accountRolesInSupamode_assignedBy_accountsInSupamode_id',
    }),
  }),
);

export const rolePermissionGroupsInSupamodeRelations = relations(
  rolePermissionGroupsInSupamode,
  ({ one }) => ({
    rolesInSupamode: one(rolesInSupamode, {
      fields: [rolePermissionGroupsInSupamode.roleId],
      references: [rolesInSupamode.id],
    }),
    permissionGroupsInSupamode: one(permissionGroupsInSupamode, {
      fields: [rolePermissionGroupsInSupamode.groupId],
      references: [permissionGroupsInSupamode.id],
    }),
    accountsInSupamode: one(accountsInSupamode, {
      fields: [rolePermissionGroupsInSupamode.assignedBy],
      references: [accountsInSupamode.id],
    }),
  }),
);

export const accountPermissionsInSupamodeRelations = relations(
  accountPermissionsInSupamode,
  ({ one }) => ({
    accountsInSupamode_accountId: one(accountsInSupamode, {
      fields: [accountPermissionsInSupamode.accountId],
      references: [accountsInSupamode.id],
      relationName:
        'accountPermissionsInSupamode_accountId_accountsInSupamode_id',
    }),
    permissionsInSupamode: one(permissionsInSupamode, {
      fields: [accountPermissionsInSupamode.permissionId],
      references: [permissionsInSupamode.id],
    }),
    accountsInSupamode_grantedBy: one(accountsInSupamode, {
      fields: [accountPermissionsInSupamode.grantedBy],
      references: [accountsInSupamode.id],
      relationName:
        'accountPermissionsInSupamode_grantedBy_accountsInSupamode_id',
    }),
  }),
);

export const rolePermissionsInSupamodeRelations = relations(
  rolePermissionsInSupamode,
  ({ one }) => ({
    rolesInSupamode: one(rolesInSupamode, {
      fields: [rolePermissionsInSupamode.roleId],
      references: [rolesInSupamode.id],
    }),
    permissionsInSupamode: one(permissionsInSupamode, {
      fields: [rolePermissionsInSupamode.permissionId],
      references: [permissionsInSupamode.id],
    }),
    accountsInSupamode: one(accountsInSupamode, {
      fields: [rolePermissionsInSupamode.grantedBy],
      references: [accountsInSupamode.id],
    }),
  }),
);
