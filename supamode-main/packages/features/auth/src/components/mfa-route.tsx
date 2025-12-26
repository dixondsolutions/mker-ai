import { useSearchParams } from 'react-router';

import { Heading } from '@kit/ui/heading';
import { Trans } from '@kit/ui/trans';

import { MultiFactorChallengeContainer } from './multi-factor-challenge-container';

export function MultiFactorAuthenticationRoute() {
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');
  const userId = searchParams.get('userId')!;

  return (
    <div className={'flex w-full flex-col items-center gap-y-6'}>
      <Heading className={'font-semibold'} level={6}>
        <Trans i18nKey={'auth:verify'} />
      </Heading>

      <MultiFactorChallengeContainer
        paths={{
          redirectPath: next || '/',
        }}
        userId={userId}
      />
    </div>
  );
}
