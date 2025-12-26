import { z } from 'zod';

/**
 * Returns and validates the Supabase client keys from the environment.
 */
export function getSupabaseClientKeys() {
  return z
    .object({
      url: z.url({
        error: 'VITE_SUPABASE_URL is required',
      }),
      publicKey: z
        .string({
          error:
            'VITE_SUPABASE_PUBLIC_KEY or VITE_SUPABASE_ANON_KEY is required',
        })
        .min(1),
    })
    .parse({
      url: import.meta.env['VITE_SUPABASE_URL'],
      publicKey:
        import.meta.env['VITE_SUPABASE_PUBLIC_KEY'] ||
        import.meta.env['VITE_SUPABASE_ANON_KEY'],
    });
}
