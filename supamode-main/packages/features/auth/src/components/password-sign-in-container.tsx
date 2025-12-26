import { useCallback } from 'react';

import type { User } from '@supabase/supabase-js';

import type { z } from 'zod';

import { useCaptchaToken } from '@kit/captcha/client';
import { useSignInWithEmailPassword } from '@kit/supabase/hooks/use-sign-in-with-email-password';

import type { PasswordSignInSchema } from '../schemas/password-sign-in.schema';
import { AuthErrorAlert } from './auth-error-alert';
import { PasswordSignInForm } from './password-sign-in-form';

export const PasswordSignInContainer: React.FC<{
  onSignIn?: (user: User) => unknown;
}> = ({ onSignIn }) => {
  const { captchaToken, resetCaptchaToken } = useCaptchaToken();
  const signInMutation = useSignInWithEmailPassword();
  const isLoading = signInMutation.isPending;

  const onSubmit = useCallback(
    async (credentials: z.infer<typeof PasswordSignInSchema>) => {
      try {
        const data = await signInMutation.mutateAsync({
          ...credentials,
          options: { captchaToken },
        });

        if (onSignIn) {
          const user = data?.user;

          if (user) {
            onSignIn(user);
          }
        }
      } catch {
        // wrong credentials, do nothing
      } finally {
        resetCaptchaToken();
      }
    },
    [captchaToken, onSignIn, resetCaptchaToken, signInMutation],
  );

  return (
    <>
      <AuthErrorAlert error={signInMutation.error} />

      <PasswordSignInForm onSubmit={onSubmit} loading={isLoading} />
    </>
  );
};
