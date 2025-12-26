import { ActionFunctionArgs, redirect } from 'react-router';

import { getI18n } from 'react-i18next';

import { createHonoClient, handleHonoClientResponse } from '@kit/api';
import { createAction } from '@kit/shared/router-query-bridge';
import { extractErrorMessage } from '@kit/shared/utils';
import { toast } from '@kit/ui/sonner';

import { dashboardsQueryKeys } from '../../lib/query-keys';
import type { DeleteDashboardRoute } from '../routes/dashboards-routes';

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

    const client = createHonoClient<DeleteDashboardRoute>();

    const response = await client['v1']['dashboards'][':id'].$delete({
      param: { id: dashboardId },
    });

    return await handleHonoClientResponse(response);
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
