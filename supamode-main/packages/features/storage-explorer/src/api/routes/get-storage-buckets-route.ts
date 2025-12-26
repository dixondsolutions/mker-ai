import { Hono } from 'hono';

import { getLogger } from '@kit/shared/logger';
import { getErrorMessage } from '@kit/shared/utils';

import { createStorageService } from '../services/storage.service';

/**
 * Register the storage buckets router
 * @param router
 */
export function registerStorageBucketsRouter(router: Hono) {
  return router.get('/v1/storage/buckets', async (c) => {
    const service = createStorageService(c);
    const logger = await getLogger();

    try {
      const buckets = await service.getBuckets();

      return c.json({ buckets });
    } catch (error) {
      logger.error(
        {
          error,
        },
        'Error getting storage buckets',
      );

      return c.json({ error: getErrorMessage(error) }, 500);
    }
  });
}

/**
 * Get storage buckets route type
 */
export type GetStorageBucketsRoute = ReturnType<
  typeof registerStorageBucketsRouter
>;
