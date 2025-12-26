import React from 'react';

import { cn } from '../../lib/utils';
import { Heading } from '../../shadcn/heading';
import { HeroTitle } from './hero-title';

interface HeroProps {
  pill?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  cta?: React.ReactNode;
  image?: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function Hero({
  pill,
  title,
  subtitle,
  cta,
  image,
  className,
  animate = true,
}: HeroProps) {
  return (
    <div className={cn('mx-auto flex flex-col gap-30', className)}>
      <div
        style={{
          MozAnimationDuration: '100ms',
        }}
        className={cn(
          'mx-auto flex flex-1 flex-col items-center justify-center duration-1000 md:flex-row',
          {
            ['animate-in fade-in zoom-in-90 slide-in-from-top-36']: animate,
          },
        )}
      >
        <div className="2xl:gap-1.50 flex w-full flex-1 flex-col items-center gap-y-6 xl:gap-y-8">
          {pill && (
            <div
              className={cn({
                ['animate-in fade-in fill-mode-both delay-300 duration-700']:
                  animate,
              })}
            >
              {pill}
            </div>
          )}

          <div className="flex flex-col items-center gap-y-8">
            <HeroTitle>{title}</HeroTitle>

            {subtitle && (
              <div className="flex max-w-2xl flex-col gap-1.5">
                <Heading
                  level={3}
                  className="p-0 text-center font-sans text-base font-normal"
                >
                  {subtitle}
                </Heading>
              </div>
            )}
          </div>

          {cta && (
            <div
              className={cn({
                ['animate-in fade-in fill-mode-both delay-500 duration-1000']:
                  animate,
              })}
            >
              {cta}
            </div>
          )}
        </div>
      </div>

      {image && (
        <div
          className={cn('mx-auto flex max-w-[85rem] justify-center py-8', {
            ['animate-in fade-in zoom-in-95 slide-in-from-top-32 fill-mode-both delay-300 duration-1000']:
              animate,
          })}
        >
          {image}
        </div>
      )}
    </div>
  );
}
