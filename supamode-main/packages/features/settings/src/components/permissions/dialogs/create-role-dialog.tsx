import { useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
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
  DialogTrigger,
} from '@kit/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

interface CreateRoleDialogProps {
  children: React.ReactNode;
  maxRank: number;
}

export function CreateRoleDialog({ children, maxRank }: CreateRoleDialogProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const fetcher = useFetcher<{
    success: boolean;
  }>();

  const isSubmitting = fetcher.state === 'submitting';

  const FormSchema = z.object({
    name: z
      .string()
      .min(1, { message: t('settings:errors.nameRequired') })
      .max(50, { message: t('settings:errors.nameLength') }),
    description: z.string().min(1).max(500).nullish().default(''),
    rank: z.coerce
      .number()
      .min(0, {
        message: t('settings:errors.rankMin'),
      })
      .max(maxRank, {
        message: t('settings:errors.rankMax', {
          max: maxRank,
        }),
      }),
  });

  const form = useForm({
    resolver: zodResolver(FormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      rank: undefined,
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:roles.create" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:roles.createRoleDescription" />
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            data-testid="create-role-form"
            className="space-y-4"
            onSubmit={form.handleSubmit((data) => {
              return fetcher.submit(
                {
                  intent: 'create-role',
                  data: JSON.stringify(data),
                },
                {
                  method: 'POST',
                },
              );
            })}
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="settings:roles.name" />
                  </FormLabel>

                  <FormControl>
                    <Input
                      placeholder="Example: Admin"
                      {...field}
                      data-testid="create-role-name-input"
                    />
                  </FormControl>

                  <FormDescription>
                    <Trans i18nKey="settings:roles.nameDescription" />
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="settings:roles.description" />
                  </FormLabel>

                  <FormControl>
                    <Textarea
                      placeholder={t('settings:roles.descriptionPlaceholder')}
                      {...field}
                      value={field.value || ''}
                      data-testid="create-role-description-textarea"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rank"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="settings:roles.rank" />
                  </FormLabel>

                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      value={field.value as string | number | undefined}
                      data-testid="create-role-rank-input"
                    />
                  </FormControl>

                  <FormDescription>
                    <Trans
                      i18nKey="settings:roles.rankDescription"
                      values={{ maxRank }}
                    />
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  <Trans i18nKey="common:cancel" />
                </Button>
              </DialogClose>

              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isDirty}
              >
                {isSubmitting ? (
                  <Trans i18nKey="common:creating" />
                ) : (
                  <Trans i18nKey="settings:roles.create" />
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
