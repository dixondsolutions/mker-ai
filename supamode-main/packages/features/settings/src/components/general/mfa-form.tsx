import { Link, useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Switch } from '@kit/ui/switch';
import { Trans } from '@kit/ui/trans';

const MfaConfigurationSchema = z.object({
  requiresMfa: z.boolean(),
});

/**
 * MFA configuration form
 * @param props - The props
 * @returns The MFA configuration form
 */
export function MfaForm(props: {
  config: {
    requiresMfa: boolean;
    userHasMFAEnabled: boolean;
    hasPermissionToUpdateMFA: boolean;
  };
}) {
  const { requiresMfa, userHasMFAEnabled, hasPermissionToUpdateMFA } =
    props.config;

  const enabled = hasPermissionToUpdateMFA && userHasMFAEnabled;

  const form = useForm({
    resolver: zodResolver(MfaConfigurationSchema),
    defaultValues: {
      requiresMfa: requiresMfa,
    },
    disabled: !enabled,
  });

  const fetcher = useFetcher<{
    success: boolean;
    data: {
      requiresMfa: boolean;
    };
  }>();

  const isSubmitting = fetcher.state === 'submitting';

  return (
    <Form {...form}>
      <form
        data-testid="mfa-configuration-form"
        className="flex flex-col space-y-4"
        onSubmit={form.handleSubmit((data) => {
          fetcher.submit(
            {
              intent: 'update-mfa-configuration',
              data,
            },
            {
              method: 'POST',
              encType: 'application/json',
            },
          );
        })}
      >
        <FormField
          name="requiresMfa"
          render={({ field }) => {
            return (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    <Trans i18nKey="settings:mfa.title" />
                  </FormLabel>

                  <FormDescription>
                    <Trans i18nKey="settings:mfa.description" />
                  </FormDescription>
                </div>

                <FormControl>
                  <Switch
                    disabled={!enabled}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <div>
          <Button disabled={isSubmitting || !form.formState.isDirty}>
            {isSubmitting ? (
              <Trans i18nKey={'common:saving'} />
            ) : (
              <Trans i18nKey={'common:save'} />
            )}
          </Button>
        </div>

        <If condition={!userHasMFAEnabled}>
          <Alert variant="warning">
            <AlertTitle>
              <Trans i18nKey="settings:mfa.verifyYourAccount" />
            </AlertTitle>

            <AlertDescription>
              <Link to="/settings/authentication" className="underline">
                <Trans i18nKey="settings:mfa.verifyYourAccountLink" />
              </Link>
            </AlertDescription>
          </Alert>
        </If>
      </form>
    </Form>
  );
}
