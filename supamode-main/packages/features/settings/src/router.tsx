import { Navigate, RouteObject } from 'react-router';

import { ContextualErrorBoundary } from '@kit/ui/contextual-error-boundary';
import { GlobalLoader } from '@kit/ui/global-loader';

import {
  generalSettingsBridgeAction,
  memberDetailsBridgeAction,
  permissionDetailsBridgeAction,
  permissionGroupDetailsBridgeAction,
  permissionsBridgeAction,
  resourcesSettingsBridgeAction,
  roleDetailsBridgeAction,
  tableSettingsBridgeAction,
} from './api/actions/bridge-actions';
import {
  authenticationBridgeLoader,
  memberDetailsBridgeLoader,
  membersBridgeLoader,
  mfaConfigurationBridgeLoader,
  permissionDetailsBridgeLoader,
  permissionGroupPermissionsBridgeLoader,
  permissionsBridgeLoader,
  rolePermissionsBridgeLoader,
  tableMetadataBridgeLoader,
  tablesMetadataBridgeLoader,
} from './api/loaders/bridge-loaders';
import { SettingsLayout } from './components/settings-layout';

export function createSettingsRouter(): RouteObject[] {
  return [
    {
      path: 'settings',
      Component: SettingsLayout,
      HydrateFallback: GlobalLoader,
      children: [
        {
          index: true,
          element: <Navigate to="/settings/general" replace />,
        },
        {
          path: 'general',
          ErrorBoundary: ContextualErrorBoundary,
          loader: mfaConfigurationBridgeLoader,
          HydrateFallback: GlobalLoader,
          lazy: () =>
            import('./components/general/page').then((mod) => {
              return {
                Component: mod.GeneralSettingsPage,
              };
            }),
          action: generalSettingsBridgeAction,
        },
        {
          path: 'authentication',
          ErrorBoundary: ContextualErrorBoundary,
          loader: authenticationBridgeLoader,
          HydrateFallback: GlobalLoader,
          lazy: () =>
            import('./components/authentication/page').then((mod) => {
              return {
                Component: mod.AuthenticationSettingsPage,
              };
            }),
        },
        {
          path: 'resources',
          ErrorBoundary: ContextualErrorBoundary,
          HydrateFallback: GlobalLoader,
          action: resourcesSettingsBridgeAction,
          loader: tablesMetadataBridgeLoader,
          lazy: () =>
            import('./components/resources/page').then((mod) => {
              return {
                Component: mod.ResourcesConfigForm,
              };
            }),
        },
        {
          path: 'resources/:schema/:table',
          HydrateFallback: GlobalLoader,
          ErrorBoundary: ContextualErrorBoundary,
          loader: tableMetadataBridgeLoader,
          action: tableSettingsBridgeAction,
          lazy: () =>
            import('./components/resources/resource/page').then((mod) => {
              return {
                Component: mod.ResourceSettingsPage,
              };
            }),
        },
        {
          path: 'resources/:schema/:table/layout',
          HydrateFallback: GlobalLoader,
          ErrorBoundary: ContextualErrorBoundary,
          loader: tableMetadataBridgeLoader,
          action: tableSettingsBridgeAction,
          lazy: () =>
            import('./components/layout-designer/layout-designer-page').then(
              (mod) => {
                return {
                  Component: mod.LayoutDesignerPage,
                };
              },
            ),
        },
        {
          path: 'permissions',
          ErrorBoundary: ContextualErrorBoundary,
          HydrateFallback: GlobalLoader,
          loader: permissionsBridgeLoader,
          action: permissionsBridgeAction,
          lazy: () =>
            import('./components/permissions/page').then((mod) => {
              return {
                Component: mod.PermissionsSettingsPage,
              };
            }),
        },
        {
          path: 'permissions/roles/:id',
          ErrorBoundary: ContextualErrorBoundary,
          HydrateFallback: GlobalLoader,
          loader: rolePermissionsBridgeLoader,
          action: roleDetailsBridgeAction,
          lazy: () =>
            import('./components/permissions/role-details/page').then((mod) => {
              return {
                Component: mod.RoleDetailsPage,
              };
            }),
        },
        {
          path: 'permissions/groups/:id',
          ErrorBoundary: ContextualErrorBoundary,
          HydrateFallback: GlobalLoader,
          loader: permissionGroupPermissionsBridgeLoader,
          action: permissionGroupDetailsBridgeAction,
          lazy: () =>
            import(
              './components/permissions/permission-group-details/page'
            ).then((mod) => {
              return {
                Component: mod.PermissionGroupDetailsPage,
              };
            }),
        },
        {
          path: 'permissions/:id',
          ErrorBoundary: ContextualErrorBoundary,
          HydrateFallback: GlobalLoader,
          loader: permissionDetailsBridgeLoader,
          action: permissionDetailsBridgeAction,
          lazy: () =>
            import('./components/permissions/permission-details/page').then(
              (mod) => {
                return {
                  Component: mod.PermissionDetailsPage,
                };
              },
            ),
        },
        {
          path: 'members',
          ErrorBoundary: ContextualErrorBoundary,
          HydrateFallback: GlobalLoader,
          loader: membersBridgeLoader,
          lazy: () =>
            import('./components/members/page').then((mod) => {
              return {
                Component: mod.MembersSettingsPage,
              };
            }),
        },
        {
          path: 'members/:id',
          ErrorBoundary: ContextualErrorBoundary,
          HydrateFallback: GlobalLoader,
          loader: memberDetailsBridgeLoader,
          action: memberDetailsBridgeAction,
          lazy: () =>
            import('./components/members/member-details/page').then((mod) => {
              return {
                Component: mod.MemberDetailsPage,
              };
            }),
        },
      ],
    },
  ];
}
