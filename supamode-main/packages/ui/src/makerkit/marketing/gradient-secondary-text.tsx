import { forwardRef } from 'react';

import { Slot } from 'radix-ui';

import { cn } from '../../lib/utils';

export const GradientSecondaryText = forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement> & {
    asChild?: boolean;
  }
>(function GradientSecondaryTextComponent({ className, ...props }, ref) {
  const Comp = props.asChild ? Slot.Root : 'span';

  return (
    <Comp
      ref={ref}
      className={cn(
        'from-foreground/50 to-foreground bg-gradient-to-r bg-clip-text text-transparent',
        className,
      )}
      {...props}
    >
      <Slot.Slottable>{props.children}</Slot.Slottable>
    </Comp>
  );
});
