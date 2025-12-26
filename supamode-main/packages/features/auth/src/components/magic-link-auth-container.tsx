import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { useCaptchaToken } from '@kit/captcha/client';
import { useSignInWithOtp } from '@kit/supabase/hooks/use-sign-in-with-otp';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { EmailInput } from './email-input';

export function MagicLinkAuthContainer({
  redirectUrl,
  shouldCreateUser,
}: {
  shouldCreateUser: boolean;
  redirectUrl: string;
}) {
  const { captchaToken, resetCaptchaToken } = useCaptchaToken();
  const signInWithOtpMutation = useSignInWithOtp();

  const form = useForm({
    resolver: zodResolver(
      z.object({
        email: z.email(),
      }),
    ),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = ({ email }: { email: string }) => {
    const url = new URL(redirectUrl);

    const emailRedirectTo = url.href;

    signInWithOtpMutation.mutate({
      email,
      options: {
        emailRedirectTo,
        captchaToken,
        shouldCreateUser,
      },
    });

    resetCaptchaToken();
  };

  if (signInWithOtpMutation.data) {
    return <SuccessAlert />;
  }

  return (
    <Form {...form}>
      <form className={'w-full'} onSubmit={form.handleSubmit(onSubmit)}>
        <If condition={signInWithOtpMutation.error}>
          <ErrorAlert />
        </If>

        <div className={'flex flex-col gap-y-4'}>
          <FormField
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey={'common:emailAddress'} />
                </FormLabel>

                <FormControl>
                  <EmailInput {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
            name={'email'}
          />

          <Button disabled={signInWithOtpMutation.isPending}>
            <If
              condition={signInWithOtpMutation.isPending}
              fallback={<Trans i18nKey={'auth:sendEmailLink'} />}
            >
              <Trans i18nKey={'auth:sendingEmailLink'} />
            </If>
          </Button>
        </div>
      </form>
    </Form>
  );
}

function SuccessAlert() {
  return (
    <Alert variant={'success'}>
      <CheckIcon className={'h-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:sendLinkSuccess'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'auth:sendLinkSuccessDescription'} />
      </AlertDescription>
    </Alert>
  );
}

function ErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <ExclamationTriangleIcon className={'h-4'} />

      <AlertTitle>
        <Trans i18nKey={'auth:errors.generic'} />
      </AlertTitle>

      <AlertDescription>
        <Trans i18nKey={'auth:errors.link'} />
      </AlertDescription>
    </Alert>
  );
}
