import { useSearchParams } from 'react-router';

import { Provider } from '@supabase/supabase-js';

import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import { SignInMethodsContainer } from './sign-in-methods-container';

const ENABLE_PASSWORD = import.meta.env['VITE_AUTH_PASSWORD']
  ? import.meta.env['VITE_AUTH_PASSWORD'] === 'true'
  : true;

const ENABLE_MAGIC_LINK = import.meta.env['VITE_AUTH_MAGIC_LINK']
  ? import.meta.env['VITE_AUTH_MAGIC_LINK'] === 'true'
  : false;

const AUTH_OAUTH_PROVIDERS = import.meta.env['VITE_OAUTH_PROVIDERS'] ?? '';

export function SignInRoute() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  return (
    <div className={'flex w-full flex-col items-center gap-y-6'}>
      <Heading className={'font-semibold'} level={6}>
        <Trans i18nKey={'auth:signInHeading'} />
      </Heading>

      <SignInMethodsContainer
        paths={{
          callback: '/api/auth/callback',
          home: next ?? '/',
        }}
        providers={{
          password: ENABLE_PASSWORD,
          magicLink: ENABLE_MAGIC_LINK,
          oAuth: AUTH_OAUTH_PROVIDERS
            ? ((AUTH_OAUTH_PROVIDERS as string).split(',') as Provider[])
            : ([] as Provider[]),
        }}
      />
    </div>
  );
}
