import { RouteObject } from 'react-router';

import { ContextualErrorBoundary } from '@kit/ui/contextual-error-boundary';

import { bucketOperationsBridgeAction } from './api/actions/bridge-actions';
import {
  bucketContentsBridgeLoader,
  storageBucketsBridgeLoader,
} from './api/loaders/bridge-loaders';

export function createStorageExplorerRouter(): RouteObject {
  return {
    path: '/assets',
    children: [
      {
        index: true,
        loader: storageBucketsBridgeLoader,
        ErrorBoundary: ContextualErrorBoundary,
        lazy: () =>
          import('./components/storage-explorer-page').then((mod) => ({
            Component: mod.StorageExplorerPage,
          })),
      },
      {
        path: ':bucket/*',
        action: bucketOperationsBridgeAction,
        loader: bucketContentsBridgeLoader,
        ErrorBoundary: ContextualErrorBoundary,
        lazy: () =>
          import('./components/file-explorer-view').then((mod) => ({
            Component: mod.FileExplorerView,
          })),
      },
    ],
  };
}
