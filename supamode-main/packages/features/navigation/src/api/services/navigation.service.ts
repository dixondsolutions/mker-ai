import { asc } from 'drizzle-orm';
import { Context } from 'hono';

import { tableMetadataInSupamode } from '@kit/supabase/schema';

type ManagedTable = typeof tableMetadataInSupamode.$inferSelect;

/**
 * Create a new navigation service
 * @param context
 */
export function createNavigationService(context: Context) {
  return new NavigationService(context);
}

/**
 * Service to load the navigation from the database
 */
class NavigationService {
  constructor(private readonly context: Context) {}

  /**
   * Load the sidebar from the database
   * @returns The sidebar config
   */
  async getNavigationItems() {
    const client = this.context.get('drizzle');

    // Load resources from managed_tables
    const resources = await client.runTransaction(async (tx) => {
      return tx
        .select()
        .from(tableMetadataInSupamode)
        .orderBy(asc(tableMetadataInSupamode.ordering));
    });

    // Process resources
    return resources.map((resource: ManagedTable) => {
      return {
        type: 'resource',
        key: `${resource.schemaName}.${resource.tableName}`,
        label: resource.displayName || resource.tableName,
        icon: undefined,
        path: `/resources/${resource.schemaName}/${resource.tableName}`,
        metadata: resource,
      };
    });
  }
}
