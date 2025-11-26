'use client';

import { UIMessage } from '@ai-sdk/react';

import { cn } from '@kit/ui/utils';

import { LoadingBubble } from './loading-bubble';

export function MessageContainer({
  message,
}: React.PropsWithChildren<{
  message: UIMessage;
}>) {
  const isUser = message.role === 'user';
  const textPart = message.parts?.find((part) => part.type === 'text');
  const content = textPart && 'text' in textPart ? textPart.text.trim() : '';

  return (
    <div
      className={cn('w-full rounded-md border p-4', {
        'bg-primary-50 dark:bg-primary-800 border-border': isUser,
        'border-transparent': !isUser,
      })}
    >
      <div className={'flex items-start space-x-4'}>
        <LoadingIndicator show={!content} />

        <MessageContentContainer show={!!content}>
          <div>
            <b>{isUser ? `You` : `Assistant`}: </b>
            {content}
          </div>
        </MessageContentContainer>
      </div>
    </div>
  );
}

function LoadingIndicator({
  show,
}: React.PropsWithChildren<{ show: boolean }>) {
  return show ? <LoadingBubble /> : null;
}

function MessageContentContainer({
  children,
  show,
}: React.PropsWithChildren<{
  show: boolean;
}>) {
  return show ? <div className={'text-sm text-current'}>{children}</div> : null;
}
