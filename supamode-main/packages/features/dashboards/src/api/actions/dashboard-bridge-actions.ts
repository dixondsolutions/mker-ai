import { ActionFunctionArgs, redirect } from 'react-router';

import { getI18n } from 'react-i18next';

import { createAction } from '@kit/shared/router-query-bridge';
import { extractErrorMessage } from '@kit/shared/utils';
import { toast } from '@kit/ui/sonner';

import { dashboardsQueryKeys } from '../../lib/query-keys';
import {
  createDashboardAction,
  deleteDashboardAction,
  updateDashboardAction,
} from './dashboard-actions';

/**
 * Bridge action for creating a dashboard
 */
export const createDashboardBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const formData = await args.request.json();

    return await createDashboardAction(formData);
  },
  invalidateKeys: () => [dashboardsQueryKeys.all()],
  onSuccessReturn: (data) => {
    const t = getI18n().t;
    toast.success(t('dashboards:dashboardCreated'));

    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dashboards:dashboardCreateFailed'));
  },
});

/**
 * Bridge action for updating a dashboard
 */
export const updateDashboardBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { params, request } = args;

    const dashboardId = params['dashboardId'] as string;
    const formData = await request.json();

    if (!dashboardId) {
      throw new Error('Dashboard ID is required');
    }

    return updateDashboardAction({
      id: dashboardId,
      data: formData,
    });
  },
  invalidateKeys: () => [dashboardsQueryKeys.all()],
  onSuccessReturn: (data) => {
    const t = getI18n().t;

    toast.success(t('dashboard:dashboardUpdated'));

    return data;
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dashboard:dashboardUpdateFailed'));
  },
});

/**
 * Bridge action for deleting a dashboard
 */
export const deleteDashboardBridgeAction = createAction({
  mutationFn: async (args: ActionFunctionArgs) => {
    const { params } = args;
    const dashboardId = params['dashboardId'] as string;

    if (!dashboardId) {
      throw new Error('Dashboard ID is required');
    }

    return await deleteDashboardAction({
      id: dashboardId,
    });
  },
  invalidateKeys: () => [dashboardsQueryKeys.all()],
  onSuccessReturn: () => {
    const t = getI18n().t;
    toast.success(t('dashboard:dashboardDeleted'));

    // Redirect to dashboards index after deletion
    return redirect('/dashboards');
  },
  onError: (error) => {
    const t = getI18n().t;
    const errorMessage = extractErrorMessage(error);
    toast.error(errorMessage || t('dashboard:dashboardDeleteFailed'));
  },
});
