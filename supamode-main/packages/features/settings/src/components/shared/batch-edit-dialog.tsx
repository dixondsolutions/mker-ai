import { useCallback, useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Switch } from '@kit/ui/switch';
import { Trans } from '@kit/ui/trans';

export type BatchEditField = {
  key: string;
  label: string;
  description: string;
  defaultValue?: boolean;
};

type BatchEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  selectedCount: number;
  selectedItems: string[];
  fields: BatchEditField[];
  onSave: (values: Record<string, boolean>) => void;
  isSubmitting?: boolean;
};

export function BatchEditColumnsDialog({
  open,
  onOpenChange,
  title,
  description,
  selectedCount,
  selectedItems,
  fields,
  onSave,
  isSubmitting = false,
}: BatchEditDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <BatchEditDialogForm
          onSave={onSave}
          isSubmitting={isSubmitting}
          fields={fields}
          selectedCount={selectedCount}
          selectedItems={selectedItems}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function BatchEditDialogForm({
  fields,
  onSave,
  onOpenChange,
  isSubmitting,
  selectedCount,
  selectedItems,
}: {
  onOpenChange: (open: boolean) => void;
  fields: BatchEditField[];
  onSave: (values: Record<string, boolean>) => void;
  isSubmitting?: boolean;
  selectedCount: number;
  selectedItems: string[];
}) {
  const defaultValues = useMemo(() => {
    return fields.reduce(
      (acc, field) => {
        acc[field.key] = field.defaultValue ?? false;

        return acc;
      },
      {} as Record<string, boolean>,
    );
  }, [fields]);

  const BatchEditSchema = useMemo(() => {
    return z.object(
      fields.reduce(
        (acc, field) => {
          acc[field.key] = z.boolean();

          return acc;
        },
        {} as Record<string, z.ZodType<boolean>>,
      ),
    );
  }, [fields]);

  const form = useForm({
    resolver: zodResolver(BatchEditSchema),
    defaultValues,
  });

  const handleSubmit = useCallback(
    (values: z.infer<typeof BatchEditSchema>) => {
      onSave(values);
      onOpenChange(false);
    },
    [onSave, onOpenChange],
  );

  return (
    <div className="space-y-4">
      {/* Selected Items Summary */}
      <div className="bg-muted/50 rounded-lg border p-3">
        <p className="text-sm font-medium">
          <Trans
            i18nKey="settings:table.selectedItemsToModify"
            values={{ count: selectedCount }}
          />
        </p>

        <If condition={selectedItems.length <= 5}>
          <div className="mt-2 space-y-1">
            {selectedItems.map((item, index) => (
              <p key={index} className="text-muted-foreground truncate text-xs">
                {item}
              </p>
            ))}
          </div>
        </If>

        <If condition={selectedItems.length > 5}>
          <div className="mt-2 space-y-1">
            {selectedItems.slice(0, 3).map((item, index) => (
              <p key={index} className="text-muted-foreground truncate text-xs">
                {item}
              </p>
            ))}

            <p className="text-muted-foreground text-xs">
              <Trans
                i18nKey="settings:table.andXMore"
                values={{ count: selectedItems.length - 3 }}
              />
            </p>
          </div>
        </If>
      </div>

      {/* Boolean Fields Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-3">
            {fields.map((field) => (
              <FormField
                key={field.key}
                control={form.control}
                name={field.key}
                render={({ field: formField }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{field.label}</FormLabel>

                      <FormDescription className="text-xs">
                        {field.description}
                      </FormDescription>
                    </div>

                    <FormControl>
                      <Switch
                        checked={formField.value as boolean}
                        onCheckedChange={formField.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                <Trans i18nKey="common:cancel" />
              </Button>
            </DialogClose>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Trans i18nKey="common:saving" />
              ) : (
                <Trans i18nKey="common:saveChanges" />
              )}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </div>
  );
}
