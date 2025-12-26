import { RouteObject } from 'react-router';

import { ContextualErrorBoundary } from '@kit/ui/contextual-error-boundary';

import {
  auditLogDetailsBridgeLoader,
  auditLogsBridgeLoader,
} from './api/loaders/bridge-loaders';

export function createAuditLogsRouter(): RouteObject {
  return {
    lazy: () =>
      import('./components/audit-logs-layout').then((mod) => {
        return { Component: mod.AuditLogsLayout };
      }),
    children: [
      {
        ErrorBoundary: ContextualErrorBoundary,
        path: 'logs',
        loader: auditLogsBridgeLoader,
        lazy: () =>
          import('./components/logs-page').then((mod) => {
            return { Component: mod.LogsPage };
          }),
      },
      {
        path: 'logs/:id',
        ErrorBoundary: ContextualErrorBoundary,
        loader: auditLogDetailsBridgeLoader,
        lazy: () =>
          import('./components/log-details-page').then((mod) => {
            return { Component: mod.LogDetailsPage };
          }),
      },
    ],
  };
}
