import { forwardRef } from 'react';

import { Slot } from 'radix-ui';

import { cn } from '../../lib/utils';
import { GradientSecondaryText } from './gradient-secondary-text';

export const Pill = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    label?: string;
    asChild?: boolean;
  }
>(function PillComponent({ className, asChild, ...props }, ref) {
  const Comp = asChild ? Slot.Root : 'h3';

  return (
    <Comp
      ref={ref}
      className={cn(
        'dark:border-primary/10 space-x-2.5 rounded-full border border-gray-100 px-2 py-2.5 text-center text-sm font-medium text-transparent',
        className,
      )}
      {...props}
    >
      {props.label && (
        <span
          className={
            'bg-primary text-primary-foreground rounded-2xl px-2.5 py-1.5 text-sm font-semibold'
          }
        >
          {props.label}
        </span>
      )}
      <Slot.Slottable>
        <GradientSecondaryText>{props.children}</GradientSecondaryText>
      </Slot.Slottable>
    </Comp>
  );
});
