import { ReactNode, forwardRef } from 'react';

import { Link } from 'react-router';

import { MoreHorizontal } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from '../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu';

export interface TableActionMenuItem {
  /**
   * Display label for the menu item
   */
  label: ReactNode;
  /**
   * Click handler for the menu item
   */
  onClick?: () => void;
  /**
   * Optional href for navigation
   */
  href?: string;
  /**
   * Icon to display before the label
   */
  icon?: ReactNode;
  /**
   * Visual variant of the menu item
   */
  variant?: 'default' | 'destructive';
  /**
   * Whether the item is disabled
   */
  disabled?: boolean;
  /**
   * Whether to render a separator after this item
   */
  separator?: boolean;
  /**
   * Optional shortcut text
   */
  shortcut?: string;
  /**
   * Custom class name for the menu item
   */
  className?: string;
}

interface TableActionMenuProps {
  /**
   * Array of menu items to display
   */
  items: TableActionMenuItem[];
  /**
   * Custom trigger component (defaults to 3-dot menu button)
   */
  trigger?: ReactNode;
  /**
   * CSS class for the trigger button
   */
  triggerClassName?: string;
  /**
   * CSS class for the dropdown content
   */
  contentClassName?: string;
  /**
   * Alignment of the dropdown relative to trigger
   */
  align?: 'start' | 'center' | 'end';
  /**
   * Side of the trigger to show the dropdown
   */
  side?: 'top' | 'right' | 'bottom' | 'left';
  /**
   * Whether the dropdown should be modal
   */
  modal?: boolean;
  /**
   * Callback when dropdown open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Whether the dropdown is open (controlled)
   */
  open?: boolean;
  /**
   * Test ID for the menu
   */
  'data-testid'?: string;
}

const DefaultTrigger = forwardRef<
  HTMLButtonElement,
  {
    className?: string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  }
>(({ className, onClick, ...props }, ref) => (
  <Button
    ref={ref}
    size="icon"
    variant="outline"
    className={cn('h-8 w-8 p-0 shadow-none', className)}
    onClick={(e) => {
      e.preventDefault();
      e.stopPropagation();
      onClick?.(e);
    }}
    {...props}
  >
    <span className="sr-only">Open menu</span>
    <MoreHorizontal className="h-4 w-4" />
  </Button>
));
DefaultTrigger.displayName = 'DefaultTrigger';

export function TableActionMenu({
  items,
  trigger,
  triggerClassName,
  contentClassName,
  align = 'end',
  side = 'bottom',
  modal = false,
  onOpenChange,
  open,
  'data-testid': testId,
}: TableActionMenuProps) {
  if (!items.length) {
    return null;
  }

  const triggerComponent = trigger || (
    <DefaultTrigger className={triggerClassName} data-testid={testId} />
  );

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange} modal={modal}>
      <DropdownMenuTrigger asChild>{triggerComponent}</DropdownMenuTrigger>

      <DropdownMenuContent
        align={align}
        side={side}
        className={cn('min-w-[8rem]', contentClassName)}
      >
        {items.map((item, index) => {
          const key = `action-${index}`;

          if (item.separator) {
            return <DropdownMenuSeparator key={key} />;
          }

          const menuItem = (
            <DropdownMenuItem
              key={key}
              onClick={item.onClick}
              disabled={item.disabled}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 text-sm',
                item.variant === 'destructive' &&
                  'text-destructive focus:text-destructive focus:bg-destructive/10',
                item.className,
              )}
            >
              {item.icon && (
                <span className="flex h-4 w-4 items-center justify-center">
                  {item.icon}
                </span>
              )}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-muted-foreground text-xs">
                  {item.shortcut}
                </span>
              )}
            </DropdownMenuItem>
          );

          if (item.href) {
            return (
              <Link key={key} to={item.href} className="block">
                {menuItem}
              </Link>
            );
          }

          return menuItem;
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compound components for more complex use cases
TableActionMenu.Trigger = DefaultTrigger;

TableActionMenu.Item = function TableActionMenuItem({
  children,
  icon,
  shortcut,
  variant,
  className,
  ...props
}: {
  children: ReactNode;
  icon?: ReactNode;
  shortcut?: string;
  variant?: 'default' | 'destructive';
  className?: string;
} & React.ComponentProps<typeof DropdownMenuItem>) {
  return (
    <DropdownMenuItem
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 text-sm',
        variant === 'destructive' &&
          'text-destructive focus:text-destructive focus:bg-destructive/10',
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      )}
      <span className="flex-1">{children}</span>
      {shortcut && (
        <span className="text-muted-foreground text-xs">{shortcut}</span>
      )}
    </DropdownMenuItem>
  );
};

TableActionMenu.Separator = DropdownMenuSeparator;
