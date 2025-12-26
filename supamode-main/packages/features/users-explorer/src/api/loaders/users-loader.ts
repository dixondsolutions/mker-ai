import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import { GetUserByIdRoute, GetUsersRoute } from '../routes';

/**
 * @name usersLoader
 * @description Loader for fetching users with pagination
 * @param params
 */
export async function usersLoader(params: { page?: number; search?: string }) {
  const client = createHonoClient<GetUsersRoute>();

  const response = await client['v1']['users'].$get({
    query: {
      page: params.page?.toString(),
      search: params.search,
    },
  });

  return handleHonoClientResponse(response);
}

/**
 * @name userDetailsLoader
 * @description Loader for fetching a single user by ID
 * @param id - The user ID
 */
export async function userDetailsLoader(id: string) {
  const client = createHonoClient<GetUserByIdRoute>();

  const response = await client['v1']['users'][':id'].$get({
    param: { id },
  });

  return handleHonoClientResponse(response);
}
