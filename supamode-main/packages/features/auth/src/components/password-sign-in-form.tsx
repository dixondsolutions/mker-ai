import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';

import { Button } from '@kit/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { PasswordSignInSchema } from '../schemas/password-sign-in.schema';
import { EmailInput } from './email-input';
import { PasswordInput } from './password-input';

export const PasswordSignInForm: React.FC<{
  onSubmit: (params: z.infer<typeof PasswordSignInSchema>) => unknown;
  loading: boolean;
}> = ({ onSubmit, loading }) => {
  const form = useForm<z.infer<typeof PasswordSignInSchema>>({
    resolver: zodResolver(PasswordSignInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Form {...form}>
      <form
        className={'flex w-full flex-col gap-y-4'}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="flex flex-col gap-y-2.5">
          <FormField
            control={form.control}
            name={'email'}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <EmailInput {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={'password'}
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <PasswordInput {...field} />
                </FormControl>

                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          data-testid="auth-submit-button"
          className={'group w-full'}
          type="submit"
          disabled={loading}
        >
          <If
            condition={loading}
            fallback={
              <>
                <Trans i18nKey={'auth:signInWithEmail'} />

                <ArrowRight
                  className={
                    'zoom-in animate-in slide-in-from-left-2 fill-mode-both h-4 delay-500 duration-500'
                  }
                />
              </>
            }
          >
            <Trans i18nKey={'auth:signingIn'} />
          </If>
        </Button>
      </form>
    </Form>
  );
};
