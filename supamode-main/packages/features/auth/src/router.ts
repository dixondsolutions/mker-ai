import { type RouteObject, redirect } from 'react-router';

import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';
import { userContext } from '@kit/supabase/provider';

export function createAuthRouter(props: {
  Layout: React.ReactNode;
}): RouteObject[] {
  return [
    {
      path: '/auth/sign-out',
      loader: async () => {
        const client = getSupabaseBrowserClient();

        await client.auth.signOut();

        return redirect('/');
      },
    },
    {
      path: '/auth',
      Component: () => props.Layout,
      children: [
        {
          path: 'sign-in',
          middleware: [
            async (args) => {
              const client = getSupabaseBrowserClient();

              const { error, data: claimsResponse } =
                await client.auth.getClaims();

              const claims = claimsResponse?.claims;

              if (error || !claims) {
                return;
              }

              args.context.set(userContext, {
                id: claims.sub,
                email: claims['email'],
              });
            },
          ],
          loader: async (args) => {
            try {
              const context = args.context.get(userContext);

              if (context) {
                return redirect('/');
              }

              return {};
            } catch {
              // the context is not set, so we can continue
            }
          },
          lazy: () =>
            import('./components/sign-in-route').then((mod) => {
              return {
                Component: mod.SignInRoute,
              };
            }),
        },
        {
          path: 'mfa',
          loader: async (args) => {
            const client = getSupabaseBrowserClient();

            const {
              error,
              data: { user },
            } = await client.auth.getUser();

            if (error || !user) {
              return redirect('/auth/sign-in', 301);
            }

            const requiresMfa =
              await checkRequiresMultiFactorAuthentication(client);

            if (requiresMfa) {
              args.context.set(userContext, user);

              return {};
            } else {
              return redirect('/');
            }
          },
          lazy: () =>
            import('./components/mfa-route').then((mod) => {
              return {
                Component: mod.MultiFactorAuthenticationRoute,
              };
            }),
        },
      ],
    },
  ];
}
