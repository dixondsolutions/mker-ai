import { Form, Link, useLoaderData } from 'react-router';

import {
  MailIcon,
  ShieldCheck,
  ShieldMinus,
  ShieldUser,
  UserIcon,
} from 'lucide-react';

import { AuditLogsTable } from '@kit/audit-logs/audit-logs-table';
import { memberAuditLogsLoader } from '@kit/audit-logs/loaders';
import { userContext } from '@kit/supabase/provider';
import { Avatar, AvatarFallback, AvatarImage } from '@kit/ui/avatar';
import { Badge } from '@kit/ui/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@kit/ui/breadcrumb';
import { Button } from '@kit/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { CopyToClipboard } from '@kit/ui/copy-to-clipboard';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { Separator } from '@kit/ui/separator';
import { Trans } from '@kit/ui/trans';

import { memberDetailsLoader } from '../../../loaders';
import { EditAccountDialog } from './edit-account-dialog';
import { AssignRoleDialog } from './manage-roles-dialog';

type MemberDetailsLoaderData = Awaited<
  ReturnType<typeof memberDetailsLoader>
> & {
  currentUser: typeof userContext.defaultValue;
  logs: Awaited<ReturnType<typeof memberAuditLogsLoader>>;
};

export function MemberDetailsPage() {
  const data = useLoaderData() as MemberDetailsLoaderData;

  const { account, user, roles, access, currentUser, logs } = data;
  const canModifyDetails = currentUser?.id === account?.authUserId;

  // Extract metadata for display
  const metadata = (account?.metadata as Record<string, string>) || {};
  const displayName = metadata['display_name'] || (user.email as string) || '';
  const pictureUrl = metadata['picture_url'] || null;

  // Get first two letters for avatar fallback
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          <BreadcrumbItem>
            <Link className="hover:underline" to="/settings">
              <Trans i18nKey="settings:settings" />
            </Link>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>
            <Link className="hover:underline" to="/settings/members">
              <Trans i18nKey="settings:members" />
            </Link>
          </BreadcrumbItem>

          <BreadcrumbSeparator />

          <BreadcrumbItem>{displayName}</BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={pictureUrl || undefined} alt={displayName} />

            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>

          <div>
            <Heading level={5}>{displayName}</Heading>

            <div className="text-muted-foreground flex items-center">
              <MailIcon className="mr-2 h-4 w-4" />
              <span data-testid="member-details-email">
                {user.email as string}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <If condition={canModifyDetails || access.canActionAccount}>
            <EditAccountDialog account={account}>
              <Button
                data-testid="member-details-edit-member-button"
                variant="outline"
              >
                <UserIcon className="mr-2 h-4 w-4" />
                <Trans i18nKey="settings:member.edit" />
              </Button>
            </EditAccountDialog>
          </If>

          <If condition={access.canActionAccount}>
            <AssignRoleDialog roles={roles}>
              <Button
                disabled={!account.isActive}
                variant="outline"
                data-testid="member-details-change-role-button"
              >
                <ShieldUser className="mr-2 h-4 w-4" />
                <Trans i18nKey="settings:member.manageRoles" />
              </Button>
            </AssignRoleDialog>

            {account.isActive ? (
              <Form method="post">
                <input type="hidden" name="intent" value="deactivate" />

                <Button
                  data-testid="member-details-deactivate-button"
                  variant="destructive"
                  type="submit"
                >
                  <ShieldMinus className="mr-2 h-4 w-4" />

                  <span>
                    <Trans i18nKey="settings:member.deactivate" />
                  </span>
                </Button>
              </Form>
            ) : (
              <Form method="post">
                <input type="hidden" name="intent" value="activate" />

                <Button
                  data-testid="member-details-activate-button"
                  variant="default"
                  type="submit"
                >
                  <ShieldCheck className="mr-2 h-4 w-4" />

                  <span>
                    <Trans i18nKey="settings:member.activate" />
                  </span>
                </Button>
              </Form>
            )}
          </If>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:member.accountStatus" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="settings:member.accountStatusDescription" />
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Badge
              data-testid="member-details-account-status-badge"
              variant={account?.isActive ? 'success' : 'destructive'}
            >
              {account?.isActive ? (
                <Trans i18nKey="settings:member.active" />
              ) : (
                <Trans i18nKey="settings:member.inactive" />
              )}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:member.assignedRole" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="settings:member.assignedRoleDescription" />
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <If
                condition={roles[0]}
                fallback={
                  <span data-testid="member-details-assigned-role-badge">
                    -
                  </span>
                }
              >
                {(role) => (
                  <Badge variant={'info'}>
                    <Link
                      to={`/settings/permissions/roles/${role.id}`}
                      className="hover:underline"
                    >
                      <span data-testid="member-details-assigned-role-badge">
                        {role.name}
                      </span>
                    </Link>
                  </Badge>
                )}
              </If>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:member.accountId" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="settings:member.accountIdDescription" />
            </CardDescription>
          </CardHeader>

          <CardContent>
            <CopyToClipboard
              className="bg-muted/50 p-1 font-mono text-xs"
              value={account?.id}
            >
              <span data-testid="member-details-account-id-copy-to-clipboard">
                {account?.id}
              </span>
            </CopyToClipboard>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:member.authUserId" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="settings:member.authUserIdDescription" />
            </CardDescription>
          </CardHeader>

          <CardContent>
            <CopyToClipboard
              className="bg-muted/50 p-1 font-mono text-xs"
              value={account?.authUserId}
            >
              <span data-testid="member-details-auth-user-id-copy-to-clipboard">
                {account?.authUserId}
              </span>
            </CopyToClipboard>
          </CardContent>
        </Card>
      </div>

      {/* Audit logs section */}
      <div className="pt-4">
        <Separator className="mb-6" />

        <div className="mb-4 flex items-center justify-between">
          <Heading level={6}>
            <Trans i18nKey="settings:member.activityLogs" />
          </Heading>

          <Button variant="link" asChild>
            <Link
              to={`/logs?author=${account?.id}`}
              className="text-muted-foreground text-sm hover:underline"
            >
              <Trans i18nKey="settings:member.viewAllLogs" />
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:member.recentActivity" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="settings:member.recentActivityDescription" />
            </CardDescription>
          </CardHeader>

          <CardContent>
            {logs && logs.logs && logs.logs.length > 0 ? (
              <AuditLogsTable
                logs={logs.logs}
                pageSize={logs.pageSize}
                nextCursor={logs.nextCursor}
                hasMore={logs.hasMore}
              />
            ) : (
              <div className="text-muted-foreground py-6 text-center text-sm">
                <Trans i18nKey="settings:member.noActivityLogs" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
