import { useEffect, useState } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@kit/ui/alert-dialog';
import { Button } from '@kit/ui/button';
import { Checkbox } from '@kit/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters long' })
    .regex(/[A-Z]/, {
      message: 'Password must contain at least one uppercase letter',
    })
    .regex(/[a-z]/, {
      message: 'Password must contain at least one lowercase letter',
    })
    .regex(/\d/, { message: 'Password must contain at least one number' }),
  autoConfirm: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateUserDialog({ children }: React.PropsWithChildren) {
  const [open, onOpenChange] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="usersExplorer:create.title" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="usersExplorer:create.description" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <CreateUserForm onOpenChange={onOpenChange} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateUserForm({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      autoConfirm: false,
    },
  });

  const onSubmit = async (values: FormValues) => {
    const formData = new FormData();

    formData.append('intent', 'create-user');

    formData.append(
      'data',
      JSON.stringify({
        email: values.email,
        password: values.password,
        autoConfirm: values.autoConfirm,
      }),
    );

    return fetcher.submit(formData, { method: 'post' });
  };

  useEffect(() => {
    if (fetcher.data?.success) {
      onOpenChange(false);
    }
  }, [fetcher.data?.success, onOpenChange]);

  return (
    <Form {...form}>
      <form
        data-testid="create-user-dialog-form"
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-4 py-4"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="common:email" />
              </FormLabel>

              <FormControl>
                <Input
                  placeholder={t(
                    'usersExplorer:common.emailPlaceholder',
                    'user@example.com',
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="usersExplorer:common.password" />
              </FormLabel>

              <FormControl>
                <Input
                  placeholder={t('usersExplorer:create.passwordPlaceholder')}
                  type="password"
                  {...field}
                />
              </FormControl>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="autoConfirm"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>

                <FormLabel>
                  <Trans i18nKey="usersExplorer:create.autoConfirmDescription" />
                </FormLabel>
              </div>

              <FormMessage />
            </FormItem>
          )}
        />

        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel asChild>
            <Button variant="outline" type="button" disabled={isSubmitting}>
              <Trans i18nKey="usersExplorer:common.cancel" />
            </Button>
          </AlertDialogCancel>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Trans i18nKey="usersExplorer:create.creating" />
            ) : (
              <Trans i18nKey="usersExplorer:create.createButton" />
            )}
          </Button>
        </AlertDialogFooter>
      </form>
    </Form>
  );
}
