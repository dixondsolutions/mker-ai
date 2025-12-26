import { useLoaderData } from 'react-router';

import { MultiFactorAuthFactorsList } from '@kit/auth/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@kit/ui/card';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

/**
 * Authentication settings page
 * @returns The authentication settings page
 */
export function AuthenticationSettingsPage() {
  const data = useLoaderData<{
    userId?: string;
  }>();

  return (
    <div className="space-y-6">
      <div>
        <Heading level={5}>
          <Trans i18nKey="settings:authentication.title" />
        </Heading>

        <p className="text-muted-foreground">
          <Trans i18nKey="settings:authentication.description" />
        </p>
      </div>

      <div className="flex max-w-2xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:authentication.mfaFactorsTitle" />
            </CardTitle>

            <CardDescription>
              <Trans i18nKey="settings:authentication.mfaFactorsDescription" />
            </CardDescription>
          </CardHeader>

          <CardContent>
            <If condition={data?.userId}>
              {(userId) => <MultiFactorAuthFactorsList userId={userId} />}
            </If>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
