import { useMemo } from 'react';

import { NavLink, useLocation } from 'react-router';

import {
  Database,
  ImageIcon,
  LayoutDashboardIcon,
  LogsIcon,
  SettingsIcon,
  Table,
  Table2Icon,
  UserIcon,
} from 'lucide-react';

import { useReadableResources } from '@kit/resources/hooks';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@kit/ui/shadcn-sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@kit/ui/tooltip';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

import { GlobalSearch } from './global-search';

// Icon mapping for navigation items
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  table: Table,
  database: Database,
  // Add more icons as needed
};

const USERS = {
  to: '/users',
  label: <Trans i18nKey={'common:routes.users'} />,
  icon: UserIcon,
  match: 'startsWith' as const,
};

const SETTINGS = {
  to: '/settings',
  label: <Trans i18nKey={'common:routes.settings'} />,
  icon: SettingsIcon,
  match: 'startsWith' as const,
};

const ASSETS = {
  to: '/assets',
  label: <Trans i18nKey={'common:routes.assets'} />,
  icon: ImageIcon,
  match: 'startsWith' as const,
};

const AUDIT_LOGS = {
  to: '/logs',
  label: <Trans i18nKey={'common:routes.auditLogs'} />,
  icon: LogsIcon,
  match: 'startsWith' as const,
};

const DASHBOARDS = {
  to: '/dashboards',
  label: <Trans i18nKey={'common:routes.dashboards'} />,
  icon: LayoutDashboardIcon,
  match: 'startsWith' as const,
};

interface SidebarItemProps {
  to: string;
  label: string | React.ReactNode;
  icon:
    | keyof typeof iconMap
    | React.ComponentType<{ className?: string }>
    | undefined;
  match: 'exact' | 'startsWith';
  minimized: boolean;
}

function SidebarItemText({
  children,
  isPending,
  minimized,
}: {
  children: React.ReactNode;
  isPending: boolean;
  minimized: boolean;
}) {
  return (
    <span
      className={cn('transition-all', {
        hidden: minimized,
        'opacity-50': isPending,
      })}
    >
      {children}
    </span>
  );
}

/**
 * @name AppSidebar
 * @param props
 * @constructor
 */
export function AppSidebar(props: {
  Logo: React.ComponentType<{ className?: string }>;
  PersonalAccountDropdown: React.ComponentType<{ className?: string }>;
}) {
  const { open } = useSidebar();
  const { pathname } = useLocation();
  const { data: navigation } = useReadableResources();

  if (!navigation || 'error' in navigation) {
    return null;
  }

  const currentResourcePathSegments = pathname.split('/');

  return (
    <Sidebar side={'left'} collapsible={'icon'}>
      <SidebarHeader className={'flex w-full'}>
        <div className={open ? 'mb-1 px-1 pt-0.5' : 'mb-1 pt-0.5'}>
          <props.Logo className={'max-w-full'} />
        </div>

        <GlobalSearch />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarItem
              to={DASHBOARDS.to}
              label={DASHBOARDS.label}
              icon={DASHBOARDS.icon}
              match={DASHBOARDS.match}
              minimized={!open}
            />

            <SidebarItem
              to={USERS.to}
              label={USERS.label}
              icon={USERS.icon}
              match={USERS.match}
              minimized={!open}
            />
          </SidebarMenu>

          {navigation.length > 0 && (
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                  <Table2Icon className={'text-muted-foreground h-4 w-4'} />
                  <Trans i18nKey="common:resources" />
                </SidebarMenuButton>
              </SidebarMenuItem>

              <SidebarMenuSub>
                {navigation
                  .filter((item) => item.metadata.isVisible)
                  .map((item) => {
                    const path = `/resources/${item.schemaName}/${item.tableName}`;

                    const isActive =
                      path === pathname ||
                      path.split('/').every((segment, index) => {
                        return segment === currentResourcePathSegments[index];
                      });

                    return (
                      <SidebarMenuSubItem key={path}>
                        <SidebarMenuSubButton
                          className="text-xs"
                          isActive={isActive}
                          asChild
                        >
                          <NavLink to={path} prefetch="intent">
                            {({ isPending }) => (
                              <span
                                className={cn(
                                  isPending && 'opacity-50',
                                  'transition-opacity',
                                )}
                              >
                                {item.displayName || item.tableName}
                              </span>
                            )}
                          </NavLink>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    );
                  })}
              </SidebarMenuSub>
            </SidebarMenu>
          )}

          <SidebarItem
            to={ASSETS.to}
            label={ASSETS.label}
            icon={ASSETS.icon}
            match={ASSETS.match}
            minimized={!open}
          />

          <SidebarItem
            to={AUDIT_LOGS.to}
            label={AUDIT_LOGS.label}
            icon={AUDIT_LOGS.icon}
            match={AUDIT_LOGS.match}
            minimized={!open}
          />

          <SidebarItem
            to={SETTINGS.to}
            label={SETTINGS.label}
            icon={SETTINGS.icon}
            match={SETTINGS.match}
            minimized={!open}
          />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <props.PersonalAccountDropdown />
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarItem({ to, label, icon, match, minimized }: SidebarItemProps) {
  const { pathname } = useLocation();

  const isActive =
    match === 'exact' ? pathname === to : pathname.startsWith(to);

  const IconComponent = useMemo(() => {
    if (typeof icon === 'string') {
      const mappedIcon = iconMap[icon];

      if (!mappedIcon) {
        console.warn(
          `Icon "${icon}" not found in iconMap, using default Table icon`,
        );

        return Table;
      }

      return mappedIcon;
    }
    return icon;
  }, [icon]);

  const useTooltip = !open;

  if (useTooltip) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <SidebarMenuButton isActive={isActive} asChild>
              <NavLink
                prefetch="intent"
                data-testid={`sidebar-item`}
                to={to}
                className={cn('flex items-center', {
                  'justify-center': minimized,
                })}
              >
                {({ isPending }) => (
                  <>
                    {IconComponent ? (
                      <IconComponent
                        className={cn('h-4 w-4', {
                          'opacity-50': isPending,
                        })}
                      />
                    ) : null}

                    <SidebarItemText
                      isPending={isPending}
                      minimized={minimized}
                    >
                      {label}
                    </SidebarItemText>
                  </>
                )}
              </NavLink>
            </SidebarMenuButton>
          </TooltipTrigger>

          <TooltipContent>{label}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <SidebarMenuButton
      isActive={isActive}
      asChild
      className={cn('active:bg-secondary', {})}
    >
      <NavLink
        to={to}
        prefetch="intent"
        className={cn('flex items-center text-sm', {
          'justify-center': minimized,
        })}
      >
        {({ isPending }) => (
          <>
            {IconComponent ? (
              <IconComponent className={'text-muted-foreground h-3.5 w-3.5'} />
            ) : null}

            <SidebarItemText isPending={isPending} minimized={minimized}>
              {label}
            </SidebarItemText>
          </>
        )}
      </NavLink>
    </SidebarMenuButton>
  );
}
