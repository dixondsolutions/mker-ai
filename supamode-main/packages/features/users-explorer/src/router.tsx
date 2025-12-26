import { LoaderFunctionArgs, RouteObject } from 'react-router';

import { z } from 'zod';

import { ContextualErrorBoundary } from '@kit/ui/contextual-error-boundary';

import {
  banUserBridgeAction,
  batchUsersBridgeAction,
  createUserBridgeAction,
  deleteUserBridgeAction,
  inviteUserBridgeAction,
  removeMfaFactorBridgeAction,
  resetPasswordBridgeAction,
  sendMagicLinkBridgeAction,
  unbanUserBridgeAction,
  updateAdminAccessBridgeAction,
} from './api/actions/bridge-actions';
import { userDetailsLoader, usersLoader } from './api/loaders/users-loader';

/**
 * @name createUsersExplorerRouter
 * @description Create routes for the users explorer
 * @returns RouteObject that defines the users explorer routes
 */
export function createUsersExplorerRouter(): RouteObject {
  return {
    path: '/users',
    ErrorBoundary: ContextualErrorBoundary,
    lazy: () =>
      import('./components/users-layout').then((mod) => ({
        Component: mod.UsersLayout,
      })),
    children: [
      {
        index: true,
        ErrorBoundary: ContextualErrorBoundary,
        action: async (args) => {
          // Check if it's a JSON request (batch operations)
          const contentType = args.request.headers.get('content-type');

          if (contentType?.includes('application/json')) {
            return batchUsersBridgeAction(args);
          }

          // Handle form data requests (individual operations)
          // Clone the request to avoid consuming it here
          const formData = await args.request.clone().formData();
          const intent = formData.get('intent');

          switch (intent) {
            case 'invite-user':
              return inviteUserBridgeAction(args);

            case 'create-user':
              return createUserBridgeAction(args);

            default:
              throw new Error(`Unknown intent: ${intent}`);
          }
        },
        loader: async ({ request }: LoaderFunctionArgs) => {
          const url = new URL(request.url);

          const page = url.searchParams.get('page');
          const search = url.searchParams.get('search');

          const response = await usersLoader({
            page: page ? parseInt(page) : undefined,
            search: search ?? undefined,
          });

          return {
            ...response,
            search,
          };
        },
        lazy: () =>
          import('./components/users-page').then((mod) => ({
            Component: mod.UsersPage,
          })),
      },
      {
        path: ':id',
        action: async (args) => {
          // Clone the request to avoid consuming it here
          const formData = await args.request.clone().formData();
          const intent = formData.get('intent');

          switch (intent) {
            case 'delete-user':
              return deleteUserBridgeAction(args);

            case 'ban-user':
              return banUserBridgeAction(args);

            case 'unban-user':
              return unbanUserBridgeAction(args);

            case 'reset-password':
              return resetPasswordBridgeAction(args);

            case 'send-magic-link':
              return sendMagicLinkBridgeAction(args);

            case 'remove-mfa-factor':
              return removeMfaFactorBridgeAction(args);

            case 'make-admin':
            case 'remove-admin':
              return updateAdminAccessBridgeAction(args);

            default:
              throw new Error(`Unknown intent: ${intent}`);
          }
        },
        ErrorBoundary: ContextualErrorBoundary,
        loader: ({ params }: LoaderFunctionArgs) => {
          const { id } = z.object({ id: z.string().uuid() }).parse(params);

          return userDetailsLoader(id);
        },
        lazy: () =>
          import('./components/user-details-page').then((mod) => ({
            Component: mod.UserDetailsPage,
          })),
      },
    ],
  };
}
