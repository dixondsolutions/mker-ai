import { NavLink, Outlet, useLocation } from 'react-router';

import { Heading } from '@kit/ui/heading';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@kit/ui/tabs';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

export function SettingsLayout() {
  const routeId = useRouteId();

  return (
    <div className="flex h-screen flex-1 flex-col gap-y-4 px-4 py-2.5">
      <div className={'flex flex-col'}>
        <Heading level={4}>
          <Trans i18nKey="settings:settings" />
        </Heading>

        <Heading level={6} className={'text-muted-foreground font-normal'}>
          <Trans i18nKey="settings:settingsDescription" />
        </Heading>
      </div>

      <Tabs value={routeId} className="flex w-full flex-1 flex-col items-start">
        <TabsList className="mb-2">
          <TabsTrigger value="/settings/general" asChild>
            <NavLink to="/settings/general" prefetch="intent">
              {({ isPending }) => (
                <span
                  className={cn(
                    isPending && 'opacity-50',
                    'transition-opacity',
                  )}
                >
                  <Trans i18nKey="settings:general.title" />
                </span>
              )}
            </NavLink>
          </TabsTrigger>

          <TabsTrigger value="/settings/authentication" asChild>
            <NavLink to="/settings/authentication" prefetch="intent">
              {({ isPending }) => (
                <span
                  className={cn(
                    isPending && 'opacity-50',
                    'transition-opacity',
                  )}
                >
                  <Trans i18nKey="settings:authentication.title" />
                </span>
              )}
            </NavLink>
          </TabsTrigger>

          <TabsTrigger value="/settings/resources" asChild>
            <NavLink to="/settings/resources" prefetch="intent">
              {({ isPending }) => (
                <span
                  className={cn(
                    isPending && 'opacity-50',
                    'transition-opacity',
                  )}
                >
                  <Trans i18nKey="settings:resources" />
                </span>
              )}
            </NavLink>
          </TabsTrigger>

          <TabsTrigger value="/settings/members" asChild>
            <NavLink to="/settings/members" prefetch="intent">
              {({ isPending }) => (
                <span
                  className={cn(
                    isPending && 'opacity-50',
                    'transition-opacity',
                  )}
                >
                  <Trans i18nKey="settings:members" />
                </span>
              )}
            </NavLink>
          </TabsTrigger>

          <TabsTrigger value="/settings/permissions" asChild>
            <NavLink to="/settings/permissions" prefetch="intent">
              {({ isPending }) => (
                <span
                  className={cn(
                    isPending && 'opacity-50',
                    'transition-opacity',
                  )}
                >
                  <Trans i18nKey="settings:permissions.title" />
                </span>
              )}
            </NavLink>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={routeId} className="flex w-full flex-1 flex-col">
          <Outlet />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function useRouteId() {
  const location = useLocation();

  return (
    '/' + location.pathname.split('/').filter(Boolean).slice(0, 2).join('/')
  );
}
