import { forwardRef, useId, useState } from 'react';

import { Search, X } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button } from '../shadcn/button';
import { Input } from '../shadcn/input';

interface SearchInputProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'size'
  > {
  /**
   * Controlled value for the search input
   */
  value?: string;
  /**
   * Callback when the search value changes
   */
  onValueChange?: (value: string) => void;
  /**
   * Callback when the clear button is clicked
   */
  onClear?: () => void;
  /**
   * Placeholder text for the input
   */
  placeholder?: string;
  /**
   * CSS class for the input element
   */
  className?: string;
  /**
   * CSS class for the container element
   */
  containerClassName?: string;
  /**
   * Whether to show the clear button when there's content
   */
  showClearButton?: boolean;
  /**
   * Icon to show on the left (defaults to Search)
   */
  icon?: React.ReactNode;
  /**
   * Position of the icon
   */
  iconPosition?: 'left' | 'right';
  /**
   * Size variant
   */
  sizeVariant?: 'sm' | 'md' | 'lg';
  /**
   * Whether the input is loading
   */
  loading?: boolean;
}

const sizeVariants: Record<
  'sm' | 'md' | 'lg',
  {
    input: string;
    icon: string;
    padding: { left: string; right: string };
    iconPosition: { left: string; right: string };
    clearButton: string;
  }
> = {
  sm: {
    input: 'h-8 text-sm',
    icon: 'h-3.5 w-3.5',
    padding: { left: 'pl-8', right: 'pr-8' },
    iconPosition: { left: 'left-2.5', right: 'right-2.5' },
    clearButton: 'h-5 w-5 right-1.5',
  },
  md: {
    input: 'text-sm',
    icon: 'h-4 w-4',
    padding: { left: 'pl-10', right: 'pr-10' },
    iconPosition: { left: 'left-3', right: 'right-3' },
    clearButton: 'h-6 w-6 right-2',
  },
  lg: {
    input: 'h-12 text-base',
    icon: 'h-5 w-5',
    padding: { left: 'pl-12', right: 'pr-12' },
    iconPosition: { left: 'left-3.5', right: 'right-3.5' },
    clearButton: 'h-7 w-7 right-2.5',
  },
};

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onValueChange,
      onClear,
      placeholder = 'Search...',
      className,
      containerClassName,
      showClearButton = true,
      icon,
      defaultValue,
      iconPosition = 'left',
      sizeVariant = 'md',
      loading = false,
      'aria-label': ariaLabel,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState(
      defaultValue || value || '',
    );

    const currentValue = value !== undefined ? value : internalValue;
    const searchId = useId();

    const sizeConfig = sizeVariants[sizeVariant];

    const IconComponent = icon || (
      <Search className={cn('text-muted-foreground', sizeConfig.icon)} />
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;

      if (value === undefined) {
        setInternalValue(newValue);
      }

      onValueChange?.(newValue);
    };

    const handleClear = () => {
      if (value === undefined) {
        setInternalValue('');
      }

      onValueChange?.('');
      onClear?.();
    };

    const handleKeyDownHandler = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape' && currentValue && showClearButton) {
        e.preventDefault();
        handleClear();
      }

      onKeyDown?.(e);
    };

    return (
      <div className={cn('relative', containerClassName)}>
        {/* Icon */}
        <div
          className={cn(
            'pointer-events-none absolute top-1/2 flex -translate-y-1/2 items-center justify-center',
            iconPosition === 'left'
              ? sizeConfig.iconPosition.left
              : sizeConfig.iconPosition.right,
          )}
        >
          {loading ? (
            <div
              className={cn(
                'border-muted-foreground animate-spin rounded-full border-2 border-t-transparent',
                sizeConfig.icon,
              )}
            />
          ) : (
            IconComponent
          )}
        </div>

        <Input
          ref={ref}
          id={searchId}
          type="text"
          role="searchbox"
          placeholder={placeholder}
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDownHandler}
          aria-label={ariaLabel || placeholder || 'Search'}
          className={cn(
            sizeConfig.input,
            iconPosition === 'left'
              ? sizeConfig.padding.left
              : sizeConfig.padding.right,
            showClearButton && currentValue && iconPosition === 'right'
              ? sizeConfig.padding.left
              : '',
            showClearButton && currentValue && iconPosition === 'left'
              ? sizeConfig.padding.right
              : '',
            className,
          )}
          {...props}
        />

        {/* Clear Button */}
        {showClearButton && currentValue && !loading && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            aria-label="Clear search"
            className={cn(
              'absolute top-1/2 -translate-y-1/2 p-0 hover:bg-transparent',
              sizeConfig.clearButton,
              iconPosition === 'left' ? 'right-2' : 'left-2',
            )}
          >
            <X
              className={cn(
                'text-muted-foreground hover:text-foreground',
                sizeConfig.icon,
              )}
            />
          </Button>
        )}
      </div>
    );
  },
);

SearchInput.displayName = 'SearchInput';
