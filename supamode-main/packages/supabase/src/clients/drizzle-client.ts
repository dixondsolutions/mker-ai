import type { SupabaseClient } from '@supabase/supabase-js';

import { DrizzleConfig, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { Context } from 'hono';
import { JwtPayload, jwtDecode } from 'jwt-decode';
import process from 'node:process';
import postgres from 'postgres';
import { z } from 'zod';

import * as schema from '../drizzle/schema';

// Config validation
const SUPABASE_DATABASE_URL = z
  .string({
    error: `The URL of the Supabase database. Please provide the variable SUPABASE_DATABASE_URL.`,
  })
  .min(1, 'The environment variable SUPABASE_DATABASE_URL is required')
  .parse(process.env['SUPABASE_DATABASE_URL']!);

const config = {
  casing: 'snake_case',
  schema,
  logger: process.env['PERF_LOG_LEVEL'] === 'on',
} satisfies DrizzleConfig<typeof schema>;

// Postgres connection options with supamode schema in search path
const postgresOptions = {
  prepare: false,
  // Set search_path to prioritize supamode schema
  connection: {
    search_path: 'supamode,public',
  },
};

// Admin client bypasses RLS
const adminClient = drizzle({
  client: postgres(SUPABASE_DATABASE_URL, postgresOptions),
  ...config,
});

// RLS protected client
const rlsClient = drizzle({
  client: postgres(SUPABASE_DATABASE_URL, postgresOptions),
  ...config,
});

/**
 * Returns an instance of the Supabase admin client configured with Drizzle.
 *
 */
export function getDrizzleSupabaseAdminClient() {
  return adminClient;
}

/**
 * Retrieves a configured Drizzle Supabase client that allows database transactions
 * under appropriate role-based access controls using Supabase JWT authentication.
 */
export async function getDrizzleSupabaseClient(c: Context) {
  const client = c.get('supabase');
  const { data, error } = await client.auth.getSession();
  const accessToken = data.session?.access_token;

  if (error) {
    throw new Error('Failed to get session');
  }

  if (!accessToken) {
    throw new Error('No access token found');
  }

  const token = decode(accessToken);

  const runTransaction = ((transaction, config) => {
    return rlsClient.transaction(async (tx) => {
      try {
        // Set up Supabase auth context and search path for supamode schema
        await tx.execute(sql`
          SET search_path TO supamode, public;

          select set_config('request.jwt.claims', '${sql.raw(
            JSON.stringify(token),
          )}', TRUE);

          select set_config('request.jwt.claim.sub', '${sql.raw(
            token.sub ?? '',
          )}', TRUE);

          set local role ${sql.raw(token.role ?? 'anon')};
        `);

        return await transaction(tx);
      } catch (error) {
        console.error(`Error in Drizzle transaction: ${error}`);

        const formatErrorMessage = (error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'Unknown error';

          return `Error in Drizzle transaction: \n\n"${message}".\n\nPlease check the logs for more details.`;
        };

        throw new Error(formatErrorMessage(error));
      } finally {
        try {
          // Clean up
          await tx.execute(sql`
          select set_config('request.jwt.claims', NULL, TRUE);
          select set_config('request.jwt.claim.sub', NULL, TRUE);
            reset role;
          `);
        } catch {
          // Ignore errors during cleanup
        }
      }
    }, config);
  }) as typeof rlsClient.transaction;

  return {
    runTransaction,
  };
}

function decode(accessToken: string) {
  try {
    return jwtDecode<JwtPayload & { role: string }>(accessToken);
  } catch {
    return { role: 'anon' } as JwtPayload & { role: string };
  }
}

export type DrizzleSupabaseClient = Awaited<
  ReturnType<typeof getDrizzleSupabaseClient>
>;

export { SupabaseClient };
