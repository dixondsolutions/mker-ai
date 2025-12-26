import { Link, useLoaderData } from 'react-router';

import {
  BanIcon,
  CalendarIcon,
  CheckCircle,
  ClockIcon,
  CopyIcon,
  DatabaseIcon,
  EyeIcon,
  GlobeIcon,
  KeyIcon,
  LinkIcon,
  MailIcon,
  PhoneIcon,
  SettingsIcon,
  ShieldIcon,
  ShieldOffIcon,
  TrashIcon,
  UnlockIcon,
  UserIcon,
  UsersIcon,
  XCircle,
} from 'lucide-react';

import { useDateFormatter } from '@kit/formatters/hooks';
import { Avatar, AvatarFallback } from '@kit/ui/avatar';
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
import { CodeBlock } from '@kit/ui/shiki';
import { Trans } from '@kit/ui/trans';

import { userDetailsLoader } from '../api/loaders/users-loader';
import { MakeAdminDialog, RemoveAdminDialog } from './admin-access-dialogs';
import {
  BanUserDialog,
  DeleteUserDialog,
  RemoveMfaFactorDialog,
  ResetPasswordDialog,
  SendMagicLinkDialog,
  UnbanUserDialog,
} from './user-actions-dialog';

type UserDetailsData = Awaited<ReturnType<typeof userDetailsLoader>>;

export function UserDetailsPage() {
  const { data } = useLoaderData() as UserDetailsData;
  const dateFormatter = useDateFormatter();

  const { user, permissions } = data;

  const displayName = user.email || '';
  const userInitials = displayName.charAt(0).toUpperCase();

  const isBanned =
    user.banned_until && new Date(user.banned_until) > new Date();

  const isAdminUser = user.app_metadata['supamode_access'] === 'true';
  const hasPhoneConfirmed = user.confirmed_at !== null;

  const hasUserMetadata =
    user.user_metadata && Object.keys(user.user_metadata).length > 0;

  const hasAppMetadata =
    user.app_metadata && Object.keys(user.app_metadata).length > 0;

  const identities = user.identities || [];
  const mfaFactors = user.mfa_factors || [];

  // Provider name mapping
  const getProviderDisplayName = (provider: string) => {
    const providerMap: Record<string, string> = {
      email: 'Email/Password',
      google: 'Google',
      github: 'GitHub',
      twitter: 'Twitter/X',
      facebook: 'Facebook',
      apple: 'Apple',
      azure: 'Microsoft/Azure',
      discord: 'Discord',
      gitlab: 'GitLab',
      bitbucket: 'Bitbucket',
      linkedin: 'LinkedIn',
      spotify: 'Spotify',
      slack: 'Slack',
      twitch: 'Twitch',
    };

    return providerMap[provider] || provider;
  };

  return (
    <>
      <div className="bg-background/60 sticky top-0 flex flex-col gap-y-4 border-b px-4 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <Breadcrumb>
            <BreadcrumbList className="text-sm">
              <BreadcrumbItem>
                <Link
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                  to="/users"
                >
                  <UsersIcon className="h-4 w-4" />
                  <Trans i18nKey="usersExplorer:users.title" />
                </Link>
              </BreadcrumbItem>

              <BreadcrumbSeparator />

              <BreadcrumbItem className="text-foreground font-medium">
                {displayName}
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-wrap gap-2">
            <If condition={!isAdminUser}>
              <If condition={permissions.can_update}>
                {!isBanned ? (
                  <BanUserDialog userEmail={user.email}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      data-testid="ban-user-button"
                    >
                      <BanIcon className="h-4 w-4" />
                      <Trans i18nKey="usersExplorer:common.ban" />
                    </Button>
                  </BanUserDialog>
                ) : (
                  <UnbanUserDialog userEmail={user.email}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      data-testid="unban-user-button"
                    >
                      <BanIcon className="h-4 w-4" />
                      <Trans i18nKey="usersExplorer:common.unban" />
                    </Button>
                  </UnbanUserDialog>
                )}

                <ResetPasswordDialog userEmail={user.email}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    data-testid="reset-password-button"
                  >
                    <UnlockIcon className="h-4 w-4" />
                    <Trans i18nKey="usersExplorer:common.resetPassword" />
                  </Button>
                </ResetPasswordDialog>

                <SendMagicLinkDialog userEmail={user.email}>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    data-testid="send-magic-link-button"
                  >
                    <LinkIcon className="h-4 w-4" />
                    <Trans i18nKey="usersExplorer:common.sendMagicLink" />
                  </Button>
                </SendMagicLinkDialog>
              </If>
            </If>

            <If condition={permissions.can_insert && !isAdminUser}>
              <MakeAdminDialog userEmail={user.email} userId={user.id}>
                <Button
                  size="sm"
                  variant="default"
                  className="gap-2"
                  data-testid="grant-admin-access-button"
                >
                  <ShieldIcon className="h-4 w-4" />
                  <Trans i18nKey="usersExplorer:common.makeAdmin" />
                </Button>
              </MakeAdminDialog>
            </If>

            <If condition={permissions.can_insert && isAdminUser}>
              <RemoveAdminDialog userEmail={user.email}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  data-testid="revoke-admin-access-button"
                >
                  <ShieldOffIcon className="h-4 w-4" />
                  <Trans i18nKey="usersExplorer:common.removeAdmin" />
                </Button>
              </RemoveAdminDialog>
            </If>

            <If condition={isAdminUser && user.account_id}>
              <Link to={`/settings/members/${user.account_id}`}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  data-testid="manage-member-button"
                >
                  <SettingsIcon className="h-4 w-4" />
                  <Trans i18nKey="usersExplorer:common.manageMember" />
                </Button>
              </Link>
            </If>

            <If condition={permissions.can_delete && !isAdminUser}>
              <DeleteUserDialog userEmail={user.email}>
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-2"
                  data-testid="delete-user-button"
                >
                  <TrashIcon className="h-4 w-4" />
                  <Trans i18nKey="usersExplorer:common.delete" />
                </Button>
              </DeleteUserDialog>
            </If>
          </div>
        </div>
      </div>

      <div className="bg-background/60 relative flex flex-col gap-4 overflow-y-auto px-4 pt-4 pb-8">
        <Card className="border-transparent bg-transparent">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="mb-0 flex items-center gap-3">
                    <Heading level={2} className="font-semibold">
                      {displayName}
                    </Heading>

                    <If condition={isAdminUser}>
                      <Badge
                        variant="outline"
                        className="text-primary border-primary/20 bg-primary/10"
                      >
                        <ShieldIcon className="mr-1 h-4 w-4" />
                        <Trans i18nKey="common:adminUser" />
                      </Badge>
                    </If>

                    <If condition={isBanned}>
                      <Badge variant="destructive">
                        <BanIcon className="mr-1 h-4 w-4" />
                        <Trans i18nKey="usersExplorer:common.banned" />
                      </Badge>
                    </If>
                  </div>

                  <div className="text-muted-foreground flex flex-col">
                    <div className="flex items-center gap-2">
                      <MailIcon className="h-4 w-4" />
                      <span className="text-base">{user.email}</span>
                    </div>

                    <If condition={user.phone}>
                      <div className="flex items-center gap-2">
                        <PhoneIcon className="h-4 w-4" />
                        <span className="text-base">{user.phone}</span>
                      </div>
                    </If>

                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span className="text-base">
                        <Trans
                          i18nKey="usersExplorer:userDetails.createdAt"
                          values={{
                            date: dateFormatter(
                              new Date(user.created_at),
                              'MMM d, yyyy, HH:mm:ss',
                            ),
                          }}
                        />{' '}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Authentication Info */}
          <Card className="bg-transparent">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <ShieldIcon className="text-primary h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    <Trans i18nKey="usersExplorer:userDetails.authInfo" />
                  </CardTitle>
                  <CardDescription>
                    <Trans i18nKey="usersExplorer:userDetails.authInfoDesc" />
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    <Trans i18nKey="usersExplorer:userDetails.emailVerification" />
                  </span>
                  <Badge
                    variant={user.email_confirmed_at ? 'default' : 'secondary'}
                    className={
                      user.email_confirmed_at
                        ? 'border-green-200 bg-green-100 text-green-800'
                        : ''
                    }
                  >
                    {user.email_confirmed_at ? (
                      <>
                        <CheckCircle className="mr-1 h-3 w-3" />
                        <Trans i18nKey="usersExplorer:userDetails.confirmed" />
                      </>
                    ) : (
                      <>
                        <XCircle className="mr-1 h-3 w-3" />
                        <Trans i18nKey="usersExplorer:userDetails.notConfirmed" />
                      </>
                    )}
                  </Badge>
                </div>

                <If condition={user.phone}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      <Trans i18nKey="usersExplorer:userDetails.phoneVerification" />
                    </span>
                    <Badge
                      variant={hasPhoneConfirmed ? 'default' : 'secondary'}
                      className={
                        hasPhoneConfirmed
                          ? 'border-green-200 bg-green-100 text-green-800'
                          : ''
                      }
                    >
                      {hasPhoneConfirmed ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          <Trans i18nKey="usersExplorer:userDetails.confirmed" />
                        </>
                      ) : (
                        <>
                          <XCircle className="mr-1 h-3 w-3" />
                          <Trans i18nKey="usersExplorer:userDetails.notConfirmed" />
                        </>
                      )}
                    </Badge>
                  </div>
                </If>

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    <Trans i18nKey="usersExplorer:userDetails.accountType" />
                  </span>

                  <Badge variant={user.is_anonymous ? 'outline' : 'default'}>
                    {user.is_anonymous ? (
                      <>
                        <EyeIcon className="mr-1 h-3 w-3" />
                        <Trans i18nKey="usersExplorer:userDetails.anonymous" />
                      </>
                    ) : (
                      <>
                        <UserIcon className="mr-1 h-3 w-3" />
                        <Trans i18nKey="usersExplorer:userDetails.identified" />
                      </>
                    )}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <label className="text-muted-foreground text-sm font-medium">
                    <Trans i18nKey="usersExplorer:userDetails.lastSignIn" />
                  </label>

                  <div className="mt-2 flex items-center gap-2">
                    <ClockIcon className="text-muted-foreground h-4 w-4" />

                    <span className="text-sm">
                      {user.last_sign_in_at ? (
                        dateFormatter(
                          new Date(user.last_sign_in_at),
                          'MMM d, yyyy HH:mm:ss',
                        )
                      ) : (
                        <Trans i18nKey="usersExplorer:common.never" />
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-muted-foreground text-sm font-medium">
                    <Trans i18nKey="usersExplorer:userDetails.audience" />
                  </label>

                  <div className="bg-muted/50 inline-block rounded px-2 py-1 font-mono text-xs">
                    {user.aud || 'authenticated'}
                  </div>
                </div>

                <If condition={isBanned}>
                  <div>
                    <label className="text-muted-foreground text-sm font-medium">
                      <Trans i18nKey="usersExplorer:userDetails.bannedUntil" />
                    </label>

                    <div className="mt-2">
                      <Badge variant="destructive">
                        {user.banned_until &&
                          dateFormatter(
                            new Date(user.banned_until),
                            'MMM d, yyyy, HH:mm:ss',
                          )}
                      </Badge>
                    </div>
                  </div>
                </If>
              </div>
            </CardContent>
          </Card>

          {/* User Identity */}
          <Card className="bg-transparent">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <UserIcon className="text-primary h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    <Trans i18nKey="usersExplorer:userDetails.userIdentity" />
                  </CardTitle>
                  <CardDescription>
                    <Trans i18nKey="usersExplorer:userDetails.userIdentityDesc" />
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div>
                <label className="text-muted-foreground text-sm font-medium">
                  <Trans i18nKey="usersExplorer:userDetails.userId" />
                </label>
                <CopyToClipboard
                  value={user.id}
                  className="bg-muted/50 mt-2 w-full rounded-lg px-4 py-3 font-mono text-sm break-all"
                >
                  {user.id}
                </CopyToClipboard>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-muted-foreground text-sm font-medium">
                    <Trans i18nKey="usersExplorer:userDetails.created" />
                  </label>
                  <div className="mt-2 text-sm font-medium">
                    {dateFormatter(
                      new Date(user.created_at),
                      'MMM d, yyyy, HH:mm:ss',
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-muted-foreground text-sm font-medium">
                    <Trans i18nKey="usersExplorer:userDetails.updated" />
                  </label>
                  <div className="mt-2 text-sm font-medium">
                    {dateFormatter(
                      new Date(user.updated_at),
                      'MMM d, yyyy, HH:mm:ss',
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Authentication Providers */}
        <If condition={identities.length > 0}>
          <Card className="bg-transparent">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <KeyIcon className="text-primary h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    <Trans i18nKey="usersExplorer:userDetails.authProviders" />
                  </CardTitle>

                  <CardDescription>
                    <Trans i18nKey="usersExplorer:userDetails.authProvidersDesc" />
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {identities.map(
                  (identity: {
                    id: string;
                    provider: string;
                    provider_id: string;
                    identity_data: Record<string, unknown>;
                    last_sign_in_at: string | null;
                    created_at: string;
                    updated_at: string;
                  }) => (
                    <div key={identity.id} className="rounded-lg border p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                          <KeyIcon className="text-primary h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {getProviderDisplayName(identity.provider)}
                          </div>

                          <div className="text-muted-foreground text-sm">
                            <Trans i18nKey="usersExplorer:common.connected" />{' '}
                            {dateFormatter(
                              new Date(identity.created_at),
                              'MMM d, yyyy, HH:mm:ss',
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {identity.provider}
                        </Badge>
                      </div>

                      <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            <Trans i18nKey="usersExplorer:userDetails.providerId" />
                          </span>
                          <CopyToClipboard
                            value={identity.provider_id}
                            className="bg-muted/50 max-w-32 truncate rounded px-2 py-1 font-mono text-xs"
                          >
                            {identity.provider_id}
                          </CopyToClipboard>
                        </div>

                        <If condition={identity.last_sign_in_at}>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">
                              <Trans i18nKey="usersExplorer:userDetails.lastUsed" />
                            </span>
                            <span className="text-xs">
                              {identity.last_sign_in_at &&
                                dateFormatter(
                                  new Date(identity.last_sign_in_at),
                                  'MMM d, yyyy, HH:mm:ss',
                                )}
                            </span>
                          </div>
                        </If>

                        <If
                          condition={
                            identity.identity_data &&
                            Object.keys(identity.identity_data).length > 0
                          }
                        >
                          <details className="mt-3">
                            <summary className="text-muted-foreground hover:text-foreground cursor-pointer text-xs">
                              <Trans i18nKey="usersExplorer:userDetails.viewProviderData" />
                            </summary>
                            <div className="mt-2 max-h-32 overflow-x-auto rounded border">
                              <CodeBlock lang="json">
                                {JSON.stringify(
                                  identity.identity_data,
                                  null,
                                  2,
                                )}
                              </CodeBlock>
                            </div>
                          </details>
                        </If>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </If>

        {/* MFA Factors */}
        <If condition={mfaFactors.length > 0}>
          <Card className="bg-transparent">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                  <ShieldIcon className="text-primary h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    <Trans i18nKey="usersExplorer:userDetails.mfaFactors" />
                  </CardTitle>
                  <CardDescription>
                    <Trans i18nKey="usersExplorer:userDetails.mfaFactorsDesc" />
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {mfaFactors.map(
                  (factor: {
                    id: string;
                    friendly_name?: string;
                    factor_type: string;
                    status: string;
                    created_at: string;
                    updated_at: string;
                  }) => (
                    <div
                      key={factor.id}
                      className="bg-card rounded-lg border p-4"
                    >
                      <div className="mb-4 flex items-center gap-3">
                        <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
                          <ShieldIcon className="text-primary h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">
                            {factor.friendly_name ||
                              `${factor.factor_type.toUpperCase()} Factor`}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            <Trans i18nKey="usersExplorer:common.added" />{' '}
                            {dateFormatter(
                              new Date(factor.created_at),
                              'MMM d, yyyy, HH:mm:ss',
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              factor.status === 'verified'
                                ? 'default'
                                : 'secondary'
                            }
                            className={
                              factor.status === 'verified'
                                ? 'border-green-200 bg-green-100 text-green-800'
                                : ''
                            }
                          >
                            {factor.status}
                          </Badge>
                          <If
                            condition={permissions.can_update && !isAdminUser}
                          >
                            <RemoveMfaFactorDialog
                              userEmail={user.email}
                              factorId={factor.id}
                              factorType={factor.factor_type}
                            >
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
                                data-testid={`remove-mfa-factor-${factor.id}`}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </RemoveMfaFactorDialog>
                          </If>
                        </div>
                      </div>

                      <div className="text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">
                            <Trans i18nKey="usersExplorer:userDetails.factorId" />
                          </span>
                          <CopyToClipboard
                            value={factor.id}
                            className="bg-muted/50 max-w-32 truncate rounded px-2 py-1 font-mono text-xs"
                          >
                            {factor.id}
                          </CopyToClipboard>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </If>

        {/* Metadata Section */}
        <If condition={hasUserMetadata || hasAppMetadata}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <If condition={hasUserMetadata}>
              <Card className="bg-transparent">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <DatabaseIcon className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        <Trans i18nKey="usersExplorer:userDetails.userMetadata" />
                      </CardTitle>
                      <CardDescription>
                        <Trans i18nKey="usersExplorer:userDetails.userMetadataDesc" />
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        {Object.keys(user.user_metadata).length}{' '}
                        <Trans i18nKey="usersExplorer:common.fields" />
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            JSON.stringify(user.user_metadata, null, 2),
                          )
                        }
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-x-auto rounded-lg border">
                      <CodeBlock lang="json">
                        {JSON.stringify(user.user_metadata, null, 2)}
                      </CodeBlock>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </If>

            <If condition={hasAppMetadata}>
              <Card className="bg-transparent">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                      <GlobeIcon className="text-primary h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        <Trans i18nKey="usersExplorer:userDetails.appMetadata" />
                      </CardTitle>
                      <CardDescription>
                        <Trans i18nKey="usersExplorer:userDetails.appMetadataDesc" />
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">
                        {Object.keys(user.app_metadata).length}{' '}
                        <Trans i18nKey="usersExplorer:common.fields" />
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() =>
                          navigator.clipboard.writeText(
                            JSON.stringify(user.app_metadata, null, 2),
                          )
                        }
                      >
                        <CopyIcon className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="max-h-64 overflow-x-auto rounded-lg border">
                      <CodeBlock lang="json">
                        {JSON.stringify(user.app_metadata, null, 2)}
                      </CodeBlock>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </If>
          </div>
        </If>
      </div>
    </>
  );
}
