import { createHonoClient, handleHonoClientResponse } from '@kit/api';

import type { MfaConfigurationRoute } from '../api/routes/mfa-configuration';

/**
 * Load MFA configuration data
 */
export async function mfaConfigurationLoader() {
  const client = createHonoClient<MfaConfigurationRoute>();
  const response = await client['v1']['configuration']['mfa'].$get();

  return handleHonoClientResponse(response);
}
