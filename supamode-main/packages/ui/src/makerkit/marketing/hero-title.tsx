import { forwardRef } from 'react';

import { Slot } from 'radix-ui';

import { cn } from '../../lib/utils';

export const HeroTitle = forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    asChild?: boolean;
  }
>(function HeroTitleComponent({ children, className, ...props }, ref) {
  const Comp = props.asChild ? Slot.Root : 'h1';

  return (
    <Comp
      ref={ref}
      className={cn(
        'hero-title flex flex-col gap-1.5 text-center font-sans text-4xl font-semibold tracking-tighter sm:text-6xl lg:max-w-5xl lg:text-7xl xl:text-[5.125rem] dark:text-white',
        className,
      )}
      {...props}
    >
      <Slot.Slottable>{children}</Slot.Slottable>
    </Comp>
  );
});
