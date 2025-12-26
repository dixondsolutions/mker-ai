import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { MfaConfigurationRoute } from '../api/routes/mfa-configuration';

/**
 * Update MFA configuration action
 * @param requiresMfa - Whether MFA is required
 * @returns The response from the API
 */
export async function updateMfaConfigurationAction(requiresMfa: boolean) {
  const client = createHonoClient<MfaConfigurationRoute>();

  const response = await client['v1']['configuration']['mfa'].$put({
    json: { requiresMfa },
  });

  return handleHonoClientResponse(response);
}
