import { sql } from 'drizzle-orm';

import { getDrizzleSupabaseAdminClient } from './clients/drizzle-client';

/**
 * @name setupDemoSchema
 * @description Setup the demo schema for the database
 * @returns The result of the install_demo_schema function
 */
export async function setupDemoSchema() {
  console.log('Setting up demo schema...');

  const client = getDrizzleSupabaseAdminClient();
  const result = await client.execute(sql`call supamode.install_demo_schema()`);

  console.log('Demo schema setup complete');

  return result;
}

setupDemoSchema()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting up demo schema:', error);
    process.exit(1);
  });
