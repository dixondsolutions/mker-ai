import { getSupabaseBrowserClient } from './clients/browser-client';

/**
 * @name getFetchOptionsWithAuthHeaders
 * @description Get fetch options with auth headers
 */
export async function getFetchOptionsWithAuthHeaders(options?: RequestInit) {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw error;
  }

  const { access_token } = data.session;

  const headers = {
    ApiKey: import.meta.env['VITE_SUPABASE_ANON_KEY']!,
    Authorization: `Bearer ${access_token}`,
  };

  if (options?.headers) {
    options.headers = new Headers({
      ...options.headers,
      ...headers,
    });

    return options;
  } else {
    if (options?.headers) {
      options.headers = new Headers({
        ...options.headers,
        ...headers,
      });
    } else {
      if (!options) {
        options = {};
      }

      options.headers = new Headers(headers);
    }
  }

  return options;
}
