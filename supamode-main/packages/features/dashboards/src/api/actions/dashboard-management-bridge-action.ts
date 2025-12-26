import { ActionFunctionArgs } from 'react-router';

import {
  deleteDashboardBridgeAction,
  updateDashboardBridgeAction,
} from './dashboard-bridge-actions';

/**
 * Unified dashboard management action that handles UPDATE and DELETE
 */
export async function dashboardManagementBridgeAction(
  args: ActionFunctionArgs,
) {
  const { request } = args;
  const method = request.method;

  switch (method) {
    case 'PUT':
      return updateDashboardBridgeAction(args);

    case 'DELETE':
      return deleteDashboardBridgeAction(args);

    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
