import { StrictMode } from 'react';

import {
  Outlet,
  RouterProvider,
  createBrowserRouter,
  redirect,
} from 'react-router';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { createRoot } from 'react-dom/client';

import { createAuditLogsRouter } from '@kit/audit-logs/router';
import { AuthLayoutShell, createAuthRouter } from '@kit/auth';
import { CaptchaProvider, CaptchaTokenSetter } from '@kit/captcha/client';
import { createDashboardsRouter } from '@kit/dashboards/router';
import { createDataExplorerRouter } from '@kit/data-explorer/router';
import { createSettingsRouter } from '@kit/settings/router';
import { initializeQueryClient } from '@kit/shared/router-query-bridge';
import { createStorageExplorerRouter } from '@kit/storage-explorer/router';
import { getSupabaseBrowserClient } from '@kit/supabase/browser-client';
import { checkRequiresMultiFactorAuthentication } from '@kit/supabase/check-requires-mfa';
import { userContext } from '@kit/supabase/provider';
import { GlobalLoader } from '@kit/ui/global-loader';
import { Toaster } from '@kit/ui/sonner';
import { createUsersExplorerRouter } from '@kit/users-explorer/router';

// local components
import { AppLogo } from './components/app-logo.tsx';
import { AppShell } from './components/app-shell.tsx';
import { GlobalErrorBoundary } from './components/global-error-boundary.tsx';
import {
  VersionUpdater,
  VersionUpdaterProvider,
} from './components/version-updater';
import { I18nProvider } from './i18n/i18n-provider.tsx';
import { i18nResolver } from './i18n/i18n.resolver.ts';
import { accountBridgeLoader } from './lib/account-bridge-loader.ts';
// global styles
import './styles/global.css';

/**
 * @name queryClient
 * @description The query client for the application
 */
const queryClient = new QueryClient();

// Initialize the router-query bridge
initializeQueryClient(queryClient);

/**
 * @name defaultTheme
 * @description The default theme for the application
 */
const defaultTheme = import.meta.env.VITE_DEFAULT_THEME ?? 'dark';

/**
 * @name captchaSiteKey
 * @description The site key for the captcha
 */
const captchaSiteKey = import.meta.env.VITE_CAPTCHA_SITE_KEY;

/**
 * @name router
 * @description The router for the application
 */
const router = createBrowserRouter([
  {
    HydrateFallback: () => <GlobalLoader fullPage={true} />,
    ErrorBoundary: () => <GlobalErrorBoundary />,
    children: [
      ...createAuthRouter({
        Layout: (
          <AuthLayoutShell Logo={AppLogo}>
            <Outlet />
          </AuthLayoutShell>
        ),
      }),
      {
        Component: AppShell,
        path: '/',
        id: 'app-root',
        middleware: [
          async (args) => {
            const url = new URL(args.request.url);
            const pathname = url.pathname;
            const searchParams = new URLSearchParams();
            const client = getSupabaseBrowserClient();

            const sessionResponse = await client.auth.getSession();

            // if not authenticated, redirect to sign-in page
            if (sessionResponse.error || !sessionResponse.data?.session) {
              if (pathname !== '/') {
                searchParams.set('next', pathname);
              }

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              args.context.set(userContext, null as any);

              return;
            }

            // user exists and MFA is not required
            const user = sessionResponse.data.session.user;

            args.context.set(userContext, {
              id: user.id,
              email: user.email ?? 'unknown',
            });

            const requiresMfa =
              await checkRequiresMultiFactorAuthentication(client);

            // check if the user requires MFA
            if (requiresMfa) {
              const searchParams = new URLSearchParams({
                next: new URL(args.request.url).searchParams.get('next') ?? '',
                userId: user.id,
              });

              // redirect to MFA page if the user requires it
              throw redirect(`/auth/mfa?${searchParams.toString()}`, 301);
            }
          },
        ],
        loader: async (args) => {
          const goToSignIn = () => {
            const pathname = new URL(args.request.url).pathname;

            return redirect(`/auth/sign-in?next=${pathname}`, 301);
          };

          try {
            const user = args.context.get(userContext);

            if (!user) {
              return goToSignIn();
            }

            // Use the bridge loader for account data (with smart caching)
            const { account } = await accountBridgeLoader(args);

            return {
              user,
              account,
              preferences: account.preferences,
            };
          } catch (error) {
            console.error(error);

            const errorMessage =
              error instanceof Error ? error.message : 'Unknown error';

            throw new Error(errorMessage);
          }
        },
        children: [
          {
            path: '/resources',
            ...createDataExplorerRouter(),
          },
          createUsersExplorerRouter(),
          createStorageExplorerRouter(),
          createAuditLogsRouter(),
          createDashboardsRouter(),
          ...createSettingsRouter(),
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CaptchaProvider siteKey={captchaSiteKey}>
      <CaptchaTokenSetter siteKey={captchaSiteKey} />

      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme={defaultTheme} attribute="class">
          <I18nProvider resolver={i18nResolver}>
            <VersionUpdaterProvider>
              <RouterProvider router={router} />
              <VersionUpdater />
            </VersionUpdaterProvider>
            <Toaster position="top-center" richColors />
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </CaptchaProvider>
  </StrictMode>,
);
