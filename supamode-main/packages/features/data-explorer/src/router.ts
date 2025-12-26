import { ActionFunctionArgs, RouteObject } from 'react-router';

import { ContextualErrorBoundary } from '@kit/ui/contextual-error-boundary';

import {
  batchDeleteRecordsBridgeAction,
  deleteRecordBridgeAction,
  deleteRecordByConditionsBridgeAction,
  insertRecordBridgeAction,
  savedViewsBridgeAction,
  updateRecordBridgeAction,
  updateRecordByConditionsBridgeAction,
} from './api/actions/bridge-actions';
// Bridge-powered loaders and actions
import {
  recordBridgeLoader,
  recordByConditionsBridgeLoader,
  tableDataBridgeLoader,
  tableMetadataBridgeLoader,
} from './api/loaders/bridge-loaders';
import { DataExplorerEmptyState } from './components/data-explorer-editor-empty-state';

export function createDataExplorerRouter(): RouteObject {
  return {
    children: [
      {
        path: '',
        Component: DataExplorerEmptyState,
      },
      {
        path: ':schema/:table',
        action: handleTableRouteActionBridge,
        loader: async (args) => {
          // Load table data and metadata in parallel
          const [tableData, metadata] = await Promise.all([
            tableDataBridgeLoader(args),
            tableMetadataBridgeLoader(args),
          ]);

          return { tableData, metadata };
        },
        ErrorBoundary: ContextualErrorBoundary,
        lazy: () =>
          import('./components/data-explorer-table-route').then((mod) => {
            return {
              Component: mod.DataExplorerTableRoute,
            };
          }),
      },
      {
        path: ':schema/:table/new',
        ErrorBoundary: ContextualErrorBoundary,
        loader: tableMetadataBridgeLoader,
        action: insertRecordBridgeAction,
        lazy: () =>
          import('./components/record/record-create-page').then((mod) => {
            return {
              Component: mod.RecordCreatePage,
            };
          }),
      },
      {
        path: ':schema/:table/record',
        action: async (args: ActionFunctionArgs) => {
          const method = args.request.method.toLowerCase();

          switch (method) {
            case 'delete':
              return deleteRecordByConditionsBridgeAction(args);

            case 'put':
              return updateRecordByConditionsBridgeAction(args);
          }

          throw new Error(`Unknown method: ${method}`);
        },
        ErrorBoundary: ContextualErrorBoundary,
        loader: recordByConditionsBridgeLoader,
        lazy: () =>
          import('./components/record/record-page').then((mod) => {
            return {
              Component: mod.RecordPage,
            };
          }),
      },
      {
        path: ':schema/:table/record/:id',
        action: async (args: ActionFunctionArgs) => {
          const method = args.request.method.toLowerCase();

          switch (method) {
            case 'delete':
              return deleteRecordBridgeAction(args);

            case 'put':
              return updateRecordBridgeAction(args);
          }

          throw new Error(`Unknown method: ${method}`);
        },
        ErrorBoundary: ContextualErrorBoundary,
        loader: recordBridgeLoader,
        lazy: () =>
          import('./components/record/record-page').then((mod) => {
            return {
              Component: mod.RecordPage,
            };
          }),
      },
      {
        path: ':schema/:table/record/edit',
        action: updateRecordByConditionsBridgeAction,
        loader: recordByConditionsBridgeLoader,
        lazy: () =>
          import('./components/record/record-edit-page').then((mod) => {
            return {
              Component: mod.RecordEditPage,
            };
          }),
      },
      {
        path: ':schema/:table/record/:id/edit',
        action: updateRecordBridgeAction,
        ErrorBoundary: ContextualErrorBoundary,
        loader: recordBridgeLoader,
        lazy: () =>
          import('./components/record/record-edit-page').then((mod) => {
            return {
              Component: mod.RecordEditPage,
            };
          }),
      },
    ],
    lazy: () =>
      import('./components/data-explorer-layout').then((mod) => {
        return {
          Component: mod.DataExplorerLayout,
        };
      }),
  };
}

/**
 * Handle the action for the table route with bridge
 * @param args
 */
async function handleTableRouteActionBridge(args: ActionFunctionArgs) {
  const { request } = args;
  const json = await request.clone().json();
  const { intent } = json;

  switch (intent) {
    case 'create-record': {
      return insertRecordBridgeAction(args);
    }

    case 'create-saved-view':
    case 'update-saved-view':
    case 'delete-saved-view': {
      return savedViewsBridgeAction(args);
    }

    case 'delete-items': {
      return batchDeleteRecordsBridgeAction(args);
    }
  }

  throw new Error(`Unknown intent: ${intent}`);
}
