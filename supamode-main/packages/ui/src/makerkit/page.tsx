import * as React from 'react';

import { cn } from '../lib/utils';
import { Heading } from '../shadcn/heading';
import { If } from './if';

export type PageLayoutStyle = 'sidebar' | 'header' | 'custom';

export function PageHeaderActions({
  children,
  className,
}: React.PropsWithChildren<{
  className?: string;
}>) {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      {children}
    </div>
  );
}

export function StickyPageHeader({
  children,
  className,
}: React.PropsWithChildren<{
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'bg-background/80 sticky top-0 z-20 backdrop-blur',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageLayout({
  children,
  className,
}: React.PropsWithChildren<{
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'flex h-screen max-h-screen flex-1 flex-col overflow-y-hidden',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageContent({
  children,
  className,
}: React.PropsWithChildren<{
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col space-y-4 overflow-y-hidden px-4 py-2.5',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  children,
  title,
  description,
  breadcrumbs,
  className,
}: React.PropsWithChildren<{
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  breadcrumbs?: React.ReactNode;
}>) {
  return (
    <div className={cn('space-y-4', className)}>
      <If condition={breadcrumbs}>
        <div>{breadcrumbs}</div>
      </If>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <If condition={title}>
            <Heading level={5}>{title}</Heading>
          </If>

          <If condition={description}>
            <Heading level={6} className={'text-muted-foreground font-normal'}>
              {description}
            </Heading>
          </If>
        </div>

        <If condition={children}>
          <div className="flex shrink-0 items-center gap-2">{children}</div>
        </If>
      </div>
    </div>
  );
}
