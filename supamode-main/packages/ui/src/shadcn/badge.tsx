import * as React from 'react';

import { type VariantProps, cva } from 'class-variance-authority';

import { cn } from '../lib/utils';

const badgeVariants = cva(
  'focus:ring-ring inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border-transparent',
        secondary: 'bg-secondary text-secondary-foreground border-transparent',
        destructive:
          'text-destructive border-transparent bg-red-50 dark:bg-red-500/10',
        outline: 'text-foreground',
        success:
          'border-transparent bg-green-50 text-green-500 dark:bg-green-500/20',
        warning:
          'border-transparent bg-orange-50 text-orange-500 dark:bg-orange-500/20',
        info: 'border-transparent bg-blue-50 text-blue-500 dark:bg-blue-500/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

export const BADGE_VARIANTS: BadgeVariant[] = [
  'default',
  'secondary',
  'destructive',
  'outline',
  'success',
  'warning',
  'info',
];

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
