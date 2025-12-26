import { createBrowserClient } from '@supabase/ssr';
import { z } from 'zod';

import { Database } from '../database.types';
import { getSupabaseClientKeys } from '../get-supabase-client-keys';

const siteUrl = z
  .url({
    error: 'VITE_SITE_URL is required',
  })
  .transform((url) => new URL(url))
  .parse(import.meta.env['VITE_SITE_URL']);

/**
 * @name getSupabaseBrowserClient
 * @description Get a Supabase client for use in the Browser
 */
export function getSupabaseBrowserClient<GenericSchema = Database>() {
  const keys = getSupabaseClientKeys();
  const domain = new URL(siteUrl).hostname;

  return createBrowserClient<GenericSchema>(keys.url, keys.publicKey, {
    cookieOptions: {
      // allows sharing cookies from subdomains
      // (ex. hosting the API on api.example.com and the site on example.com)
      domain: '.' + domain,
      secure: siteUrl.href.startsWith('https'),
      sameSite: 'lax',
      httpOnly: false,
    },
  });
}
