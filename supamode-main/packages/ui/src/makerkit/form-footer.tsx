import { ReactNode, forwardRef } from 'react';

import { cn } from '../lib/utils';
import { Button } from '../shadcn/button';
import { DialogFooter } from '../shadcn/dialog';

interface FormFooterProps {
  /**
   * Label for the submit button
   */
  submitLabel?: ReactNode;
  /**
   * Label for the cancel button
   */
  cancelLabel?: ReactNode;
  /**
   * Callback when cancel button is clicked
   */
  onCancel?: () => void;
  /**
   * Whether the form is currently submitting
   */
  isSubmitting?: boolean;
  /**
   * Whether the submit button should be disabled
   */
  disabled?: boolean;
  /**
   * Visual variant for the submit button
   */
  submitVariant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  /**
   * Additional action buttons to show before cancel/submit
   */
  additionalActions?: ReactNode;
  /**
   * Custom CSS class for the footer container
   */
  className?: string;
  /**
   * Layout arrangement of the buttons
   */
  layout?: 'default' | 'reverse' | 'center' | 'space-between';
  /**
   * Whether to show the cancel button
   */
  showCancel?: boolean;
  /**
   * Whether to show the submit button
   */
  showSubmit?: boolean;
  /**
   * Custom submit button component
   */
  submitButton?: ReactNode;
  /**
   * Custom cancel button component
   */
  cancelButton?: ReactNode;
  /**
   * Loading text to show when submitting
   */
  loadingText?: string;
}

const layoutClasses = {
  default: 'justify-end',
  reverse: 'justify-end flex-row-reverse',
  center: 'justify-center',
  'space-between': 'justify-between',
};

export function FormFooter({
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  onCancel,
  isSubmitting = false,
  disabled = false,
  submitVariant = 'default',
  additionalActions,
  className,
  layout = 'default',
  showCancel = true,
  showSubmit = true,
  submitButton,
  cancelButton,
  loadingText = 'Saving...',
}: FormFooterProps) {
  const defaultSubmitButton = (
    <Button
      type="submit"
      variant={submitVariant}
      disabled={disabled || isSubmitting}
    >
      {isSubmitting ? loadingText : submitLabel}
    </Button>
  );

  const defaultCancelButton = (
    <Button
      type="button"
      variant="outline"
      onClick={onCancel}
      disabled={isSubmitting}
    >
      {cancelLabel}
    </Button>
  );

  return (
    <DialogFooter className={cn('gap-2', layoutClasses[layout], className)}>
      {layout === 'space-between' && additionalActions && (
        <div className="flex items-center gap-2">{additionalActions}</div>
      )}

      {layout !== 'space-between' && additionalActions}

      {layout === 'reverse' ? (
        <>
          {showSubmit && (submitButton || defaultSubmitButton)}
          {showCancel && onCancel && (cancelButton || defaultCancelButton)}
        </>
      ) : (
        <>
          {showCancel && onCancel && (cancelButton || defaultCancelButton)}
          {showSubmit && (submitButton || defaultSubmitButton)}
        </>
      )}
    </DialogFooter>
  );
}

// Compound components for more control
FormFooter.SubmitButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ children, ...props }, ref) => (
  <Button ref={ref} type="submit" {...props}>
    {children}
  </Button>
));
FormFooter.SubmitButton.displayName = 'FormFooter.SubmitButton';

FormFooter.CancelButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ children, variant = 'outline', ...props }, ref) => (
  <Button ref={ref} type="button" variant={variant} {...props}>
    {children}
  </Button>
));
FormFooter.CancelButton.displayName = 'FormFooter.CancelButton';
