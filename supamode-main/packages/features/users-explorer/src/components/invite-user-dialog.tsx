import { useCallback, useEffect, useState } from 'react';

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
});

type FormValues = z.infer<typeof formSchema>;

export function InviteUserDialog({ children }: React.PropsWithChildren) {
  const [open, onOpenChange] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-[425px]">
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="usersExplorer:invite.title" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans i18nKey="usersExplorer:invite.description" />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <InviteUserForm onOpenChange={onOpenChange} />
      </AlertDialogContent>
    </AlertDialog>
  );
}

function InviteUserForm({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const fetcher = useFetcher<{ success: boolean }>();
  const isSubmitting = fetcher.state !== 'idle';

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = useCallback(
    async (values: FormValues) => {
      const formData = new FormData();

      formData.append('intent', 'invite-user');
      formData.append('email', values.email);

      fetcher.submit(formData, { method: 'post' });
    },
    [fetcher],
  );

  useEffect(() => {
    if (fetcher.data?.success) {
      onOpenChange(false);
    }
  }, [fetcher.data?.success, onOpenChange]);

  return (
    <Form {...form}>
      <form
        data-testid="invite-user-dialog-form"
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

        <AlertDialogFooter className="pt-4">
          <AlertDialogCancel asChild>
            <Button variant="outline" type="button" disabled={isSubmitting}>
              <Trans i18nKey="common:cancel" />
            </Button>
          </AlertDialogCancel>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Trans i18nKey="usersExplorer:invite.sending" />
            ) : (
              <Trans i18nKey="usersExplorer:invite.send" />
            )}
          </Button>
        </AlertDialogFooter>
      </form>
    </Form>
  );
}
