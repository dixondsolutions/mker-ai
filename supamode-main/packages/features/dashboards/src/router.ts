import { lazy } from 'react';

import { Navigate, RouteObject } from 'react-router';

import { createDashboardBridgeAction } from './api/actions/dashboard-bridge-actions';
import { updateWidgetPositionsBridgeAction } from './api/actions/widget-bridge-actions';
import {
  dashboardBridgeLoader,
  dashboardsBridgeLoader,
} from './api/loaders/dashboards-loaders';

const DashboardLayout = lazy(
  () => import('./components/dashboard/dashboard-layout'),
);

const UnifiedDashboardPage = lazy(
  () => import('./components/dashboard/dashboard-page'),
);

const DashboardRedirect = lazy(() =>
  import('./components/dashboard/dashboard-redirect').then((m) => ({
    default: m.DashboardRedirect,
  })),
);

const dashboardsRoutes: RouteObject[] = [
  {
    path: '',
    children: [
      {
        path: '',
        Component: () => Navigate({ to: '/dashboards' }),
      },
      {
        Component: DashboardLayout,
        id: 'dashboards',
        loader: dashboardsBridgeLoader,
        children: [
          {
            path: 'dashboards',
            index: true,
            action: createDashboardBridgeAction,
            Component: DashboardRedirect,
          },
          {
            path: 'dashboards/:dashboardId',
            Component: UnifiedDashboardPage,
            id: 'dashboard',
            loader: dashboardBridgeLoader,
            action: async (args) => {
              const { dashboardManagementBridgeAction } = await import(
                './api/actions/dashboard-management-bridge-action'
              );

              return dashboardManagementBridgeAction(args);
            },
            children: [
              {
                path: 'widgets',
                action: async (args) => {
                  const { widgetManagementBridgeAction } = await import(
                    './api/actions/widget-management-bridge-action'
                  );
                  return widgetManagementBridgeAction(args);
                },
              },
              {
                path: 'widgets/:widgetId',
                action: async (args) => {
                  const { widgetManagementBridgeAction } = await import(
                    './api/actions/widget-management-bridge-action'
                  );
                  return widgetManagementBridgeAction(args);
                },
              },
              {
                path: 'widgets/:widgetId/duplicate',
                action: async (args) => {
                  const { widgetManagementBridgeAction } = await import(
                    './api/actions/widget-management-bridge-action'
                  );
                  return widgetManagementBridgeAction(args);
                },
              },
              {
                path: 'widgets/positions',
                action: updateWidgetPositionsBridgeAction,
              },
            ],
          },
        ],
      },
    ],
  },
];

export function createDashboardsRouter() {
  return {
    path: '',
    children: dashboardsRoutes,
  };
}
