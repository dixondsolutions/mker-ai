import { accountLoader } from '@kit/settings/loaders';
import { createLoader } from '@kit/shared/router-query-bridge';

/**
 * Bridge-powered loader for account data
 * Provides smart caching for user account information
 */
export const accountBridgeLoader = createLoader({
  queryKey: ['account'],
  queryFn: accountLoader,
  staleTime: 5 * 60 * 1000, // 5 minutes - account data doesn't change frequently
});
