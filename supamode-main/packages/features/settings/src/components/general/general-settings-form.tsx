import { useEffect } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAccountPreferences } from '@kit/shared/hooks';
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
import { LanguageSelector } from '@kit/ui/language-selector';
import { Trans } from '@kit/ui/trans';

import { TimezoneSelector } from './timezone-selector';

/**
 * General settings form
 * @param props - The props
 * @returns The general settings form
 */
export function GeneralSettingsForm(props: {
  timezone: string | undefined;
  language: string | undefined;
}) {
  const form = useForm({
    resolver: zodResolver(
      z.object({
        language: z.string().optional(),
        timezone: z.string().optional(),
      }),
    ),
    defaultValues: {
      language: props.language?.split('-')[0] ?? 'en',
      timezone: props.timezone,
    },
  });

  const [, setAccountPreferences] = useAccountPreferences();

  const fetcher = useFetcher<{
    success: boolean;
    data: {
      language: string;
      timezone: string;
    };
  }>();

  const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (fetcher.data?.success) {
      form.reset(fetcher.data.data);

      setAccountPreferences({
        language: fetcher.data.data.language,
        timezone: fetcher.data.data.timezone,
      });
    }
  }, [fetcher.data, form, setAccountPreferences]);

  return (
    <Form {...form}>
      <form
        data-testid="general-settings-form"
        className="flex flex-col space-y-4"
        onSubmit={form.handleSubmit((data) => {
          fetcher.submit(
            {
              intent: 'update-user-preferences',
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
          name="language"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="settings:general.language" />
                </FormLabel>

                <FormControl>
                  <LanguageSelector
                    onChange={field.onChange}
                    locale={field.value ?? ''}
                  />
                </FormControl>

                <FormDescription>
                  <Trans i18nKey="settings:general.languageDescription" />
                </FormDescription>
              </FormItem>
            );
          }}
        />

        <FormField
          name="timezone"
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey="settings:general.timezone" />
                </FormLabel>

                <FormControl>
                  <TimezoneSelector
                    onChange={field.onChange}
                    value={field.value ?? ''}
                  />
                </FormControl>

                <FormDescription>
                  <Trans i18nKey="settings:general.timezoneDescription" />
                </FormDescription>

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
      </form>
    </Form>
  );
}
