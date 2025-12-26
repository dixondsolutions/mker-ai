import { useMemo } from 'react';

import { Link, useRouteLoaderData } from 'react-router';

import {
  BugIcon,
  ChevronsUpDown,
  ExternalLink,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  SettingsIcon,
} from 'lucide-react';

import { useSignOut } from '@kit/supabase/hooks/use-sign-out';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { If } from '@kit/ui/if';
import { SubMenuModeToggle } from '@kit/ui/mode-toggle';
import { ProfileAvatar } from '@kit/ui/profile-avatar';
import { Trans } from '@kit/ui/trans';
import { cn } from '@kit/ui/utils';

export function PersonalAccountDropdown({
  className,
  showProfileName = true,
  features,
}: {
  className?: string;
  showProfileName?: boolean;

  features?: {
    enableThemeToggle: boolean;
  };
}) {
  const { user, account } = useRouteLoaderData('app-root');
  const signOutRequested = useSignOut();

  const signedInAsLabel = useMemo(() => {
    const email = user?.email ?? undefined;
    const phone = user?.phone ?? undefined;

    return email ?? phone;
  }, [user]);

  const displayName = account.metadata.display_name ?? user?.email ?? '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open your profile menu"
        data-testid={'account-dropdown-trigger'}
        className={cn(
          'focus:outline-primary flex cursor-pointer items-center duration-500 group-data-[minimized=true]:px-0',
          className ?? '',
          {
            ['active:bg-secondary/80 items-center gap-x-4 rounded-md' +
            ' hover:bg-secondary/50 border border-dashed p-2 transition-colors']:
              showProfileName,
          },
        )}
      >
        <ProfileAvatar
          className={'rounded-md'}
          fallbackClassName={'rounded-md border'}
          displayName={displayName}
        />

        <If condition={showProfileName}>
          <div
            className={
              'flex w-full flex-col truncate text-left group-data-[minimized=true]:hidden'
            }
          >
            <span
              data-testid={'account-dropdown-display-name'}
              className={'truncate text-sm'}
            >
              {displayName}
            </span>

            <span
              data-testid={'account-dropdown-email'}
              className={'text-muted-foreground truncate text-xs'}
            >
              {signedInAsLabel}
            </span>
          </div>

          <ChevronsUpDown
            className={
              'text-muted-foreground mr-1 h-8 group-data-[minimized=true]:hidden'
            }
          />
        </If>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className={'xl:!min-w-[15rem]'}
        collisionPadding={10}
      >
        <DropdownMenuItem className={'!h-10 rounded-none'}>
          <div
            className={'flex flex-col justify-start truncate text-left text-xs'}
          >
            <div className={'text-muted-foreground'}>
              <Trans i18nKey={'common:signedInAs'} />
            </div>

            <div>
              <span className={'block truncate'}>{signedInAsLabel}</span>
            </div>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link className={'s-full flex items-center space-x-2'} to={'/'}>
            <LayoutDashboard className={'h-4'} />

            <span>
              <Trans i18nKey={'common:routes.dashboards'} />
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            className={'s-full flex items-center space-x-2'}
            to={'/settings'}
          >
            <SettingsIcon className={'h-4'} />

            <span>
              <Trans i18nKey={'common:routes.settings'} />
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <If condition={features?.enableThemeToggle ?? true}>
          <SubMenuModeToggle />

          <DropdownMenuSeparator />
        </If>

        <DropdownMenuItem asChild>
          <Link
            target="_blank"
            className={'s-full flex items-center space-x-2'}
            to={'https://makerkit.dev/docs/supamode'}
          >
            <HelpCircle className={'h-4'} />

            <span>
              <Trans i18nKey={'common:documentation'} />
            </span>

            <ExternalLink className={'h-4'} />
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            target="_blank"
            className={'s-full flex items-center space-x-2'}
            to={'https://github.com/makerkit/supamode/issues'}
          >
            <BugIcon className={'h-4'} />

            <span>
              <Trans i18nKey={'common:openBugReport'} />
            </span>

            <ExternalLink className={'h-4'} />
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          data-testid={'account-dropdown-sign-out'}
          role={'button'}
          className={'cursor-pointer'}
          onClick={() => {
            signOutRequested.mutate();
          }}
        >
          <span className={'flex w-full items-center space-x-2'}>
            <LogOut className={'h-4'} />

            <span>
              <Trans i18nKey={'auth:signOut'} />
            </span>
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
