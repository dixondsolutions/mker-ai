'use client';

import { useState } from 'react';

import { cn } from '../lib/utils';
import { If } from './if';
import { LazyRender } from './lazy-render';
import { Spinner } from './spinner';

interface VideoProps {
  src: string;
  poster?: string;
  className?: string;
  width?: string;
  type?: string;
}

export function Video({ src, type, width, className, poster }: VideoProps) {
  const useType = type ?? 'video/mp4';
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <If condition={!loaded && !poster}>
        <div className="flex w-full flex-col items-center justify-center gap-y-4 rounded-2xl py-48">
          <Spinner />

          <p>Loading video...</p>
        </div>
      </If>

      <LazyRender threshold={0.25} rootMargin="500px 0px">
        <video
          poster={poster}
          className={cn(className, loaded ? 'my-6' : 'hidden')}
          width={width ?? `100%`}
          height="auto"
          playsInline
          autoPlay
          muted
          loop
          onLoadedData={() => setLoaded(true)}
        >
          <source src={src} type={useType} />
        </video>
      </LazyRender>
    </>
  );
}
