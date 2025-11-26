'use client';

import { useState } from 'react';

import { createPortal } from 'react-dom';

import { cn } from '@kit/ui/utils';

export const IFrame: React.FC<
  React.IframeHTMLAttributes<unknown> & {
    setInnerRef?: (ref: HTMLIFrameElement | undefined) => void;
    style?: React.CSSProperties;
    className?: string;
  }
> = ({ children, setInnerRef, style = {}, className }) => {
  const [ref, setRef] = useState<HTMLIFrameElement | null>();
  const doc = ref?.contentWindow?.document as Document;
  const mountNode = doc?.body;

  return (
    <iframe
      className={cn(className)}
      style={{
        all: 'initial',
        position: 'fixed',
        width: '100%',
        height: '100%',
        border: 0,
        zIndex: 1000,
        ...(style ?? {}),
      }}
      ref={(ref) => {
        if (ref) {
          setRef(ref);

          if (setInnerRef) {
            setInnerRef(ref);
          }
        }
      }}
    >
      {mountNode ? createPortal(children, mountNode) : null}
    </iframe>
  );
};
