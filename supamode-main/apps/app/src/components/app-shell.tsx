import { Outlet } from 'react-router';

import { AppSidebar } from '@kit/navigation/ui';
import { SidebarProvider } from '@kit/ui/shadcn-sidebar';

import { TopLoadingBarIndicator } from '../../../../packages/ui/src/makerkit/top-loading-bar-indicator.tsx';
import { AppLogo } from './app-logo.tsx';
import { GlobalRevalidator } from './global-revalidator.ts';
import { LanguageSetter } from './language-setter.tsx';
import { PersonalAccountDropdown } from './personal-account-dropdown.tsx';

export function AppShell() {
  return (
    <SidebarProvider defaultOpen={true}>
      <TopLoadingBarIndicator />

      <GlobalRevalidator />

      <LanguageSetter />

      <div className={'flex min-w-0 flex-1'}>
        <div className={'flex-1 bg-inherit'}>
          <AppSidebar
            Logo={AppLogo}
            PersonalAccountDropdown={PersonalAccountDropdown}
          />
        </div>

        <div
          className={
            'mx-auto flex w-full flex-col overflow-x-hidden bg-inherit'
          }
        >
          <div className={'bg-muted/30 flex flex-1 flex-col overflow-x-hidden'}>
            <Outlet />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
