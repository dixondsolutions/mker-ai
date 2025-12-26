import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { GetRolesForSharingRoute, GetRolesRoute } from '../routes';

/**
 * Router loader for fetching roles
 * Consolidated implementation for SSR integration
 * @returns Roles data for server-side rendering
 */
export async function rolesLoader() {
  const client = createHonoClient<GetRolesRoute>();
  const response = await client['v1']['roles'].$get();

  return handleHonoClientResponse(response);
}

/**
 * Router loader for fetching roles optimized for sharing
 * @returns Simplified roles data for dropdowns and selection components
 */
export async function rolesForSharingLoader() {
  const client = createHonoClient<GetRolesForSharingRoute>();
  const response = await client['v1']['roles']['sharing'].$get();

  return handleHonoClientResponse(response);
}
