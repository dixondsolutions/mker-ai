import { useQuery } from '@tanstack/react-query';

import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { GetRolesForSharingRoute, GetRolesRoute } from '../routes';

/**
 * React Query hook for fetching roles
 * Consolidated from multiple feature packages
 * @returns Query result with roles data
 */
export function useRolesQuery() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const client = createHonoClient<GetRolesRoute>();
      const response = await client['v1']['roles'].$get();
      return handleHonoClientResponse(response);
    },
  });
}

/**
 * React Query hook for fetching roles optimized for sharing/selection
 * Returns simplified role structure for dropdowns
 * @returns Query result with roles data optimized for sharing
 */
export function useRolesForSharingQuery() {
  return useQuery({
    queryKey: ['roles', 'sharing'],
    queryFn: async () => {
      const client = createHonoClient<GetRolesForSharingRoute>();
      const response = await client['v1']['roles']['sharing'].$get();
      return handleHonoClientResponse(response);
    },
  });
}
