import { ReactNode } from 'react';

import { FieldPath, FieldValues, UseFormReturn } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../shadcn/form';
import { Input } from '../shadcn/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../shadcn/select';
import { Textarea } from '../shadcn/textarea';
import { If } from './if';

interface BaseFieldProps<TFieldValues extends FieldValues = FieldValues> {
  /**
   * Field name path
   */
  name: FieldPath<TFieldValues>;
  /**
   * Field label
   */
  label?: ReactNode;
  /**
   * Help text description
   */
  description?: ReactNode;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Custom CSS class for the field container
   */
  className?: string;
  /**
   * Custom CSS class for the field item
   */
  itemClassName?: string;
  /**
   * Custom CSS class for the label
   */
  labelClassName?: string;
  /**
   * Custom CSS class for the description
   */
  descriptionClassName?: string;
}

interface FormTextFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /**
   * Form instance from react-hook-form
   */
  form: UseFormReturn<TFieldValues>;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Input type
   */
  type?: 'text' | 'email' | 'password' | 'number' | 'url' | 'tel';
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Left icon element
   */
  leftIcon?: ReactNode;
  /**
   * Right icon element
   */
  rightIcon?: ReactNode;
  /**
   * Additional input props
   */
  inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}

interface FormSelectFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /**
   * Form instance from react-hook-form
   */
  form: UseFormReturn<TFieldValues>;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Select options
   */
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
    group?: string;
  }>;
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Additional select props
   */
  selectProps?: React.ComponentProps<typeof Select>;
}

interface FormTextareaFieldProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /**
   * Form instance from react-hook-form
   */
  form: UseFormReturn<TFieldValues>;
  /**
   * Placeholder text
   */
  placeholder?: string;
  /**
   * Number of rows
   */
  rows?: number;
  /**
   * Whether the field is disabled
   */
  disabled?: boolean;
  /**
   * Whether to show character count
   */
  showCharCount?: boolean;
  /**
   * Maximum character count
   */
  maxLength?: number;
  /**
   * Additional textarea props
   */
  textareaProps?: React.TextareaHTMLAttributes<HTMLTextAreaElement>;
}

export function FormTextField({
  form,
  name,
  label,
  description,
  placeholder,
  type = 'text',
  required,
  disabled,
  className,
}: FormTextFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <If condition={label}>
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          </If>

          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              {...field}
            />
          </FormControl>

          <If condition={description}>
            <FormDescription>{description}</FormDescription>
          </If>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function FormSelectField({
  form,
  name,
  label,
  description,
  placeholder,
  options,
  required,
  disabled,
  className,
}: FormSelectFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <If condition={label}>
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          </If>

          <Select
            onValueChange={field.onChange}
            defaultValue={field.value}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>

            <SelectContent>
              {options.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <If condition={description}>
            <FormDescription>{description}</FormDescription>
          </If>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function FormTextareaField({
  form,
  name,
  label,
  description,
  placeholder,
  rows = 3,
  required,
  disabled,
  className,
}: FormTextareaFieldProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <If condition={label}>
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          </If>

          <FormControl>
            <Textarea
              placeholder={placeholder}
              rows={rows}
              disabled={disabled}
              {...field}
            />
          </FormControl>

          <If condition={description}>
            <FormDescription>{description}</FormDescription>
          </If>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
