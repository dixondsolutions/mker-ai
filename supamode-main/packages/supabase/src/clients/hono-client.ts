import { createClient } from '@supabase/supabase-js';

import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { Context } from 'hono';
import { env } from 'hono/adapter';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';

import { getSecretKey } from '../get-service-role-key';

type SupabaseEnv = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
};

/**
 * @name getSupabaseAdminClient
 * @description Get a Supabase client for use in the Browser
 */
export function getSupabaseAdminClient() {
  const url = z
    .url({
      error: 'SUPABASE_URL is required',
    })
    .parse(process.env['SUPABASE_URL']);

  const secretKey = getSecretKey();

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * @name getSupabaseClient
 * @description Get a Supabase client for use in the Browser
 */
export function getSupabaseClient(c: Context) {
  const supabaseEnv = env<SupabaseEnv>(c);

  const supabaseUrl = z
    .url({
      error: 'SUPABASE_URL is required',
    })
    .parse(supabaseEnv.SUPABASE_URL);

  const supabaseAnonKey = z
    .string({
      error: 'SUPABASE_ANON_KEY is required',
    })
    .parse(supabaseEnv.SUPABASE_ANON_KEY);

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = c.req.header('cookie') ?? '';

        return parseCookieHeader(cookieHeader) as Array<{
          name: string;
          value: string;
        }>;
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          setCookie(c, name, value, {
            ...options,
            sameSite: options.sameSite as
              | 'lax'
              | 'strict'
              | 'none'
              | 'Strict'
              | 'Lax'
              | 'None'
              | undefined,
            priority: getPriority(options.priority),
          });
        });
      },
    },
  });
}

function getPriority(priority?: string) {
  switch (priority) {
    case 'low':
      return 'Low';

    case 'high':
      return 'High';

    case 'Medium':
      return 'Medium';
  }
}
