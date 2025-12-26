import { ReactNode, createContext, useContext, useState } from 'react';

import { cn } from '../lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../shadcn/dialog';
import { If } from './if';

interface FormDialogContextValue {
  onClose: () => void;
  isOpen: boolean;
}

const FormDialogContext = createContext<FormDialogContextValue | null>(null);

export const useFormDialog = () => {
  const context = useContext(FormDialogContext);
  if (!context) {
    throw new Error('useFormDialog must be used within a FormDialog');
  }
  return context;
};

interface FormDialogProps {
  /**
   * Trigger element that opens the dialog
   */
  trigger?: ReactNode;
  /**
   * Dialog title
   */
  title: ReactNode;
  /**
   * Optional description text
   */
  description?: ReactNode;
  /**
   * Dialog content
   */
  children: ReactNode;
  /**
   * Controlled open state
   */
  open?: boolean;
  /**
   * Callback when open state changes
   */
  onOpenChange?: (open: boolean) => void;
  /**
   * Dialog size variant
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /**
   * Custom CSS class for the dialog content
   */
  className?: string;
  /**
   * Whether clicking outside closes the dialog
   */
  closeOnOverlayClick?: boolean;
  /**
   * Whether pressing Escape closes the dialog
   */
  closeOnEscape?: boolean;
  /**
   * Callback when dialog closes
   */
  onClose?: () => void;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};

export function FormDialog({
  trigger,
  title,
  description,
  children,
  open,
  onOpenChange,
  size = 'md',
  className,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  onClose,
}: FormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open !== undefined ? open : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      onClose?.();
    }
    if (onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const handleClose = () => {
    handleOpenChange(false);
  };

  const contextValue: FormDialogContextValue = {
    onClose: handleClose,
    isOpen,
  };

  return (
    <FormDialogContext.Provider value={contextValue}>
      <Dialog open={isOpen} onOpenChange={handleOpenChange} modal={true}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

        <DialogContent
          className={cn(sizeClasses[size], className)}
          onEscapeKeyDown={
            closeOnEscape ? undefined : (e) => e.preventDefault()
          }
          onPointerDownOutside={
            closeOnOverlayClick ? undefined : (e) => e.preventDefault()
          }
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>

            <If condition={description}>
              <DialogDescription>{description}</DialogDescription>
            </If>
          </DialogHeader>

          {children}
        </DialogContent>
      </Dialog>
    </FormDialogContext.Provider>
  );
}

// Compound components for better composition
FormDialog.Header = DialogHeader;
FormDialog.Title = DialogTitle;
FormDialog.Description = DialogDescription;
FormDialog.Trigger = DialogTrigger;
