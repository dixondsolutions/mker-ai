import { ActionFunctionArgs } from 'react-router';

import { getI18n } from 'react-i18next';

import { createAction } from '@kit/shared/router-query-bridge';
import { extractErrorMessage } from '@kit/shared/utils';
import { toast } from '@kit/ui/sonner';

import { dashboardsQueryKeys } from '../../lib/query-keys';
import { clearWidgetCacheAllVariants } from '../loaders/bridge-loaders';
import {
  createWidgetAction,
  deleteWidgetAction,
  updateWidgetAction,
  updateWidgetPositionsAction,
} from './widget-actions';

/**
 * Bridge action for creating a widget
 */
export const createWidgetBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { request } = args;
    const data = await request.json();

    const result = await createWidgetAction(data);

    // Return result with dashboardId for invalidation
    return {
      ...result,
      _dashboardId: data.dashboardId,
    };
  },
  invalidateKeys: (args, result) => {
    const params = args.params as Record<string, string>;
    // Get dashboardId from params or from the result
    const dashboardId = params['dashboardId'] || result?._dashboardId;

    return [
      dashboardsQueryKeys.all(),
      ...(dashboardId ? [dashboardsQueryKeys.dashboard(dashboardId)] : []),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('dashboards:widgets.widgetCreated'));

    // Remove internal dashboardId and preserve position adjustment metadata
    const { _dashboardId, ...cleanData } = data;

    return {
      success: cleanData.success,
      data: cleanData.data,
      positionAdjusted: cleanData.positionAdjusted,
      originalPosition: cleanData.originalPosition,
      finalPosition: cleanData.finalPosition,
    };
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dashboards:widgets.createFailed'));
  },
});

/**
 * Bridge action for updating a widget
 */
export const updateWidgetBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { params, request } = args;
    const widgetId = params['widgetId'] as string;
    const data = await request.json();

    if (!widgetId) {
      throw new Error('Widget ID is required');
    }

    const result = await updateWidgetAction({
      id: widgetId,
      data,
    });

    // Clear sessionStorage cache immediately after successful update
    // This ensures TanStack Query refetch gets fresh data
    clearWidgetCacheAllVariants(widgetId);

    return result;
  },
  invalidateKeys: (args) => {
    const params = args.params as Record<string, string>;
    const dashboardId = params['dashboardId'];
    const widgetId = params['widgetId'];

    return [
      dashboardsQueryKeys.all(),
      ...(dashboardId ? [dashboardsQueryKeys.dashboard(dashboardId)] : []),
      ...(widgetId ? [['widget-data', widgetId]] : []),
    ];
  },
  onSuccessReturn: async (data) => {
    const t = getI18n().t;

    toast.success(t('dashboards:widgets.widgetUpdated'));

    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dashboards:widgets.updateFailed'));
  },
});

/**
 * Bridge action for deleting a widget
 */
export const deleteWidgetBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { params } = args;
    const widgetId = params['widgetId'] as string;

    if (!widgetId) {
      throw new Error('Widget ID is required');
    }

    const result = await deleteWidgetAction({
      id: widgetId,
    });

    // Clear sessionStorage cache immediately after successful deletion
    clearWidgetCacheAllVariants(widgetId);

    return result;
  },
  invalidateKeys: (args) => {
    const params = args.params as Record<string, string>;
    const dashboardId = params['dashboardId'];
    const widgetId = params['widgetId'];

    return [
      dashboardsQueryKeys.all(),
      ...(dashboardId ? [dashboardsQueryKeys.dashboard(dashboardId)] : []),
      ...(widgetId ? [['widget-data', widgetId]] : []),
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;

    toast.success(t('dashboards:widgets.widgetDeleted'));

    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dashboards:widgets.deleteFailed'));
  },
});

/**
 * Bridge action for updating widget positions
 */
export const updateWidgetPositionsBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { request } = args;
    const data = await request.json();

    if (!data.updates || !Array.isArray(data.updates)) {
      throw new Error('Updates array is required');
    }

    const result = await updateWidgetPositionsAction({
      updates: data.updates,
    });

    // Clear localStorage caches for all widgets that had position updates
    if (result?.data) {
      result.data.forEach((update: { id: string }) => {
        if (update.id) {
          clearWidgetCacheAllVariants(update.id);
        }
      });
    }

    return result;
  },
  invalidateKeys: (args, result) => {
    const params = args.params as Record<string, string>;
    const dashboardId = params['dashboardId'];

    // Get widget IDs from the updates that were applied
    const widgetIds =
      result.data?.map((update: { id: string }) => update.id) || [];

    const widgetDataKeys = widgetIds.map((id: string) => ['widget-data', id]);

    return [
      dashboardsQueryKeys.all(),
      ...(dashboardId ? [dashboardsQueryKeys.dashboard(dashboardId)] : []),
      ...widgetDataKeys,
    ];
  },
  onSuccessReturn: (data) => {
    const t = getI18n().t;

    toast.success(t('dashboards:widgets.widgetPositionsUpdated'));

    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dashboards:widgets.positionUpdateFailed'));
  },
});
