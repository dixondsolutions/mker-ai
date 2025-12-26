import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type {
  CreateDashboardRoute,
  DeleteDashboardRoute,
  GetDashboardRoute,
  UpdateDashboardRoute,
} from '../routes/dashboards-routes';

/**
 * Create a new dashboard
 */
export async function createDashboardAction(data: { name: string }) {
  const client = createHonoClient<CreateDashboardRoute>();

  const response = await client['v1']['dashboards'].$post({
    json: data,
  });

  return await handleHonoClientResponse(response);
}

/**
 * Update an existing dashboard
 */
export async function updateDashboardAction({
  id,
  data,
}: {
  id: string;
  data: {
    name: string;
  };
}) {
  const client = createHonoClient<UpdateDashboardRoute>();

  const response = await client['v1']['dashboards'][':id'].$put({
    param: { id },
    json: data,
  });

  return await handleHonoClientResponse(response);
}

/**
 * Delete a dashboard
 */
export async function deleteDashboardAction({ id }: { id: string }) {
  const client = createHonoClient<DeleteDashboardRoute>();

  const response = await client['v1']['dashboards'][':id'].$delete({
    param: { id },
  });

  return await handleHonoClientResponse(response);
}

/**
 * Get a specific dashboard by ID
 */
export async function getDashboardAction({ id }: { id: string }) {
  const client = createHonoClient<GetDashboardRoute>();

  const response = await client['v1']['dashboards'][':id'].$get({
    param: { id },
  });

  return await handleHonoClientResponse(response);
}
