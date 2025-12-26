import { Context, Hono } from 'hono';

import { getSupabaseClient } from '@kit/supabase/hono';

/**
 * @name registerAuthMiddleware
 * @description Register the middleware for the authentication routes
 * @param router
 * @returns
 */
export function registerAuthMiddleware(router: Hono) {
  return router.use(async (c, next) => {
    try {
      const { data, error } = await getUser(c);

      if (error) {
        if (error === 'user_not_found') {
          return new Response(
            JSON.stringify({
              error: 'Your account was not found',
            }),
            { status: 403 },
          );
        }

        if (error === 'not_admin') {
          // the user does not have admin access, we need to redirect to the sign in page
          return new Response(
            JSON.stringify({
              error: 'You do not have admin access',
            }),
            { status: 403 },
          );
        }

        if (error === 'user_banned') {
          // the user is banned, we need to redirect to the sign in page
          return new Response(
            JSON.stringify({
              error: 'Your account was banned',
            }),
            { status: 403 },
          );
        }

        return new Response(
          JSON.stringify({
            error: 'User is not logged in',
          }),
          { status: 401 },
        );
      }

      // if for any reason the user is not found, we need to redirect to the sign in page
      if (!data) {
        return new Response(
          JSON.stringify({
            error: 'Your account was not found',
          }),
          { status: 403 },
        );
      }

      // proceed to the next middleware
      await next();
    } catch (error) {
      console.error(error);

      return new Response(
        JSON.stringify({
          error: 'User is not logged in',
        }),
        { status: 401 },
      );
    }
  });
}

/**
 * @name getUser
 * @description Get the current user
 * @param c
 * @returns
 */
async function getUser(c: Context) {
  try {
    const client = getSupabaseClient(c);

    const { data, error } = await client.auth.getClaims();

    const user = data?.claims as unknown as {
      is_anonymous: boolean;
      role: string;
      app_metadata: {
        supamode_access: 'true' | 'false';
      };
      user_metadata: Record<string, unknown>;
      email: string;
      phone: string;
      session_id: string;
      aal: string;
    };

    if (error || !user) {
      if (error) {
        console.error(error);
      }

      return {
        data: null,
        error: error?.code,
      };
    }

    if (user.role === 'anonymous') {
      return {
        data: null,
        error: 'user_not_found',
      };
    }

    // this property is not typed in the supabase user object
    const userWithBannedUntil = user as unknown as {
      banned_until: string;
    };

    if (
      userWithBannedUntil &&
      userWithBannedUntil.banned_until &&
      new Date(userWithBannedUntil.banned_until) > new Date()
    ) {
      return {
        data: null,
        error: 'user_banned',
      };
    }

    const appMetadata = user.app_metadata;
    const hasAdminAccess = Boolean(appMetadata['supamode_access'] === 'true');

    if (!hasAdminAccess) {
      console.warn('User does not have admin access');

      return {
        data: null,
        error: 'not_admin',
      };
    }

    return {
      data: user,
      error: null,
    };
  } catch (error) {
    console.error(error);

    return {
      data: null,
      error: 'unknown_error',
    };
  }
}
