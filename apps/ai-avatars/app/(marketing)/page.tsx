import Image from 'next/image';
import Link from 'next/link';

import { ArrowRightIcon } from 'lucide-react';

import { PricingTable } from '@kit/billing-gateway/marketing';
import {
  CtaButton,
  GradientText,
  Hero,
  Pill,
  SecondaryHero,
} from '@kit/ui/marketing';
import { Trans } from '@kit/ui/trans';

import billingConfig from '~/config/billing.config';
import pathsConfig from '~/config/paths.config';
import { withI18n } from '~/lib/i18n/with-i18n';

function Home() {
  return (
    <div className={'mt-4 flex flex-col space-y-24 py-14'}>
      <div className={'container mx-auto'}>
        <Hero
          pill={
            <Pill label={'New'}>
              <span>Create AI Avatars for you and your family</span>
            </Pill>
          }
          title={
            <>
              <span>
                Generate{' '}
                <GradientText className={'from-primary to-primary/70'}>
                  AI Avatars
                </GradientText>
              </span>

              <span>for you and your family</span>
            </>
          }
          subtitle={
            <span>
              The AI Avatars app allows you to create AI avatars for you and
              your loved ones. Get started for free today.
            </span>
          }
          cta={<MainCallToActionButton />}
          image={
            <div
              className={'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4'}
            >
              <Image
                className={'rounded shadow'}
                src={'/images/avatars/avatar-0.webp'}
                alt={`Avatar 1`}
                width={800}
                height={600}
              />
              <Image
                className={'rounded shadow'}
                src={'/images/avatars/avatar-1.webp'}
                alt={`Avatar 2`}
                width={800}
                height={600}
              />
              <Image
                className={'rounded shadow'}
                src={'/images/avatars/avatar-2.webp'}
                alt={`Avatar 3`}
                width={800}
                height={600}
              />
              <Image
                className={'rounded shadow'}
                src={'/images/avatars/avatar-3.webp'}
                alt={`Avatar 4`}
                width={800}
                height={600}
              />
              <Image
                className={'rounded shadow'}
                src={'/images/avatars/avatar-4.webp'}
                alt={`Avatar 5`}
                width={800}
                height={600}
              />
              <Image
                className={'rounded shadow'}
                src={'/images/avatars/avatar-5.webp'}
                alt={`Avatar 6`}
                width={800}
                height={600}
              />
              <Image
                className={'rounded shadow'}
                src={'/images/avatars/avatar-6.webp'}
                alt={`Avatar 7`}
                width={800}
                height={600}
              />
              <Image
                className={'rounded shadow'}
                src={'/images/avatars/avatar-7.webp'}
                alt={`Avatar 8`}
                width={800}
                height={600}
              />
            </div>
          }
        />
      </div>

      <div className={'container mx-auto'}>
        <div
          className={
            'flex flex-col items-center justify-center space-y-16 py-16'
          }
        >
          <SecondaryHero
            pill={<Pill>Get started for free. No credit card required.</Pill>}
            heading="Fair pricing for all types of businesses"
            subheading="Get started on our free plan and upgrade when you are ready."
          />

          <div className={'w-full'}>
            <PricingTable
              config={billingConfig}
              paths={{
                signUp: pathsConfig.auth.signUp,
                return: pathsConfig.app.home,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default withI18n(Home);

function MainCallToActionButton() {
  return (
    <div className={'flex space-x-4'}>
      <CtaButton>
        <Link href={'/auth/sign-up'}>
          <span className={'flex items-center space-x-0.5'}>
            <span>
              <span>Generate your first AI Avatar</span>
            </span>

            <ArrowRightIcon
              className={
                'animate-in fade-in slide-in-from-left-8 h-4' +
                ' zoom-in fill-mode-both delay-1000 duration-1000'
              }
            />
          </span>
        </Link>
      </CtaButton>

      <CtaButton variant={'link'}>
        <Link href={'/contact'}>
          <Trans i18nKey={'common:contactUs'} />
        </Link>
      </CtaButton>
    </div>
  );
}
