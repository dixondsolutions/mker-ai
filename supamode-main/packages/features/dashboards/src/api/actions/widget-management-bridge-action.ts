import { ActionFunctionArgs } from 'react-router';

import {
  createWidgetBridgeAction,
  deleteWidgetBridgeAction,
  updateWidgetBridgeAction,
} from './widget-bridge-actions';

/**
 * Unified widget management action that handles CREATE, UPDATE, DELETE based on HTTP methods
 */
export async function widgetManagementBridgeAction(args: ActionFunctionArgs) {
  const { request } = args;
  const method = request.method;

  switch (method) {
    case 'POST':
      return createWidgetBridgeAction(args);

    case 'PUT':
      return updateWidgetBridgeAction(args);

    case 'DELETE':
      return deleteWidgetBridgeAction(args);

    default:
      throw new Error(`Unsupported method: ${method}`);
  }
}
