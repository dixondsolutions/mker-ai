import { useLoaderData } from 'react-router';

import { useAccountPreferences } from '@kit/shared/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@kit/ui/card';
import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import { GeneralSettingsForm } from './general-settings-form';
import { MfaForm } from './mfa-form';

/**
 * General settings page
 * @returns The general settings page
 */
export function GeneralSettingsPage() {
  const data = useLoaderData<{
    mfa: {
      requiresMfa: boolean;
      userHasMFAEnabled: boolean;
      hasPermissionToUpdateMFA: boolean;
    };
  }>();

  const [preferences] = useAccountPreferences();

  return (
    <div className="space-y-6">
      <div>
        <Heading level={5}>
          <Trans i18nKey="settings:general.title" />
        </Heading>

        <p className="text-muted-foreground">
          <Trans i18nKey="settings:general.description" />
        </p>
      </div>

      <div className="flex max-w-xl flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:general.title" />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <GeneralSettingsForm
              timezone={preferences.timezone}
              language={preferences.language}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Trans i18nKey="settings:mfa.mfa" />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <MfaForm config={data.mfa} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
