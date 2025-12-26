import { ChevronDownIcon, MailIcon, UserPlusIcon } from 'lucide-react';

import { Button } from '@kit/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@kit/ui/dropdown-menu';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { CreateUserDialog } from './create-user-dialog';
import { InviteUserDialog } from './invite-user-dialog';

type UserManagementControlsProps = {
  permissions: {
    can_read: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_insert: boolean;
  };
};

export function UserManagementControls({
  permissions,
}: UserManagementControlsProps) {
  return (
    <>
      <If condition={permissions.can_insert}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Trans i18nKey="usersExplorer:actions.addUser" />
              <ChevronDownIcon className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <InviteUserDialog>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <MailIcon className="mr-2 h-4 w-4" />
                <Trans i18nKey="usersExplorer:actions.inviteUser" />
              </DropdownMenuItem>
            </InviteUserDialog>

            <CreateUserDialog>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                }}
              >
                <UserPlusIcon className="mr-2 h-4 w-4" />

                <Trans i18nKey="usersExplorer:actions.createUser" />
              </DropdownMenuItem>
            </CreateUserDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </If>
    </>
  );
}
