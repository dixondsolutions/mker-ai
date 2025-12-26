import { useNavigate, useRevalidator } from 'react-router';

import type { Provider } from '@supabase/supabase-js';

import { If } from '@kit/ui/if';
import { Separator } from '@kit/ui/separator';

import { MagicLinkAuthContainer } from './magic-link-auth-container';
import { OauthProviders } from './oauth-providers';
import { PasswordSignInContainer } from './password-sign-in-container';

export function SignInMethodsContainer(props: {
  inviteToken?: string;

  paths: {
    callback: string;
    home: string;
  };

  providers: {
    password: boolean;
    magicLink: boolean;
    oAuth: Provider[];
  };
}) {
  const revalidate = useRevalidator();
  const navigate = useNavigate();

  const redirectUrl =
    typeof document !== 'undefined'
      ? new URL(props.paths.home, window?.location.origin).toString()
      : '';

  return (
    <>
      <If condition={props.providers.password}>
        <PasswordSignInContainer
          onSignIn={() => {
            if (props.paths.home !== '/') {
              navigate(props.paths.home);
            } else {
              revalidate.revalidate();
            }
          }}
        />
      </If>

      <If condition={props.providers.magicLink}>
        <MagicLinkAuthContainer
          shouldCreateUser={false}
          redirectUrl={redirectUrl}
        />
      </If>

      <If condition={props.providers.oAuth.length}>
        <Separator />

        <OauthProviders
          enabledProviders={props.providers.oAuth}
          inviteToken={props.inviteToken}
          shouldCreateUser={false}
          paths={{
            callback: props.paths.callback,
            returnPath: props.paths.home,
          }}
        />
      </If>
    </>
  );
}
