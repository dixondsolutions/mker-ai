import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangleIcon, ShieldIcon } from 'lucide-react';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

type MakeAdminDialogProps = React.PropsWithChildren<{
  userEmail: string;
  userId: string;
}>;

export function MakeAdminDialog({
  userEmail,
  userId,
  children,
}: MakeAdminDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <MakeAdminDialogContent userEmail={userEmail} userId={userId} />
    </AlertDialog>
  );
}

function MakeAdminDialogContent({
  userEmail,
  userId,
}: {
  userEmail: string;
  userId: string;
}) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const schema = z.object({
    confirmMakeAdmin: z.boolean().refine((val) => val === true, {
      message: t('usersExplorer:confirmations.mustConfirmMakeAdmin'),
    }),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      confirmMakeAdmin: false,
    },
  });

  const onSubmit = () => {
    const formData = new FormData();
    formData.append('intent', 'make-admin');
    formData.append('userId', userId);

    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <AlertDialogContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary flex items-center gap-2">
              <ShieldIcon className="h-5 w-5" />
              <Trans i18nKey="usersExplorer:confirmations.makeAdminTitle" />
            </AlertDialogTitle>

            <AlertDialogDescription>
              <Trans
                i18nKey="usersExplorer:confirmations.makeAdminDescription"
                values={{ email: userEmail }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <FormField
              control={form.control}
              name="confirmMakeAdmin"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-y-0 space-x-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="mt-1 h-4 w-4 rounded border border-gray-300"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel className="text-sm font-medium">
                      <Trans i18nKey="usersExplorer:confirmations.confirmMakeAdmin" />
                    </FormLabel>
                    <FormDescription>
                      <Trans i18nKey="usersExplorer:confirmations.makeAdminWarning" />
                    </FormDescription>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isSubmitting}>
                <Trans i18nKey="usersExplorer:common.cancel" />
              </Button>
            </AlertDialogCancel>

            <Button
              type="submit"
              variant="default"
              disabled={isSubmitting}
              data-testid="grant-admin-access-submit-button"
            >
              {isSubmitting ? (
                <Trans i18nKey="usersExplorer:common.granting" />
              ) : (
                <Trans i18nKey="usersExplorer:common.makeAdmin" />
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </Form>
    </AlertDialogContent>
  );
}

type RemoveAdminDialogProps = React.PropsWithChildren<{
  userEmail: string;
}>;

export function RemoveAdminDialog({
  userEmail,
  children,
}: RemoveAdminDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <RemoveAdminDialogContent userEmail={userEmail} />
    </AlertDialog>
  );
}

function RemoveAdminDialogContent({ userEmail }: { userEmail: string }) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const schema = z.object({
    confirmText: z.literal('REMOVE', {
      error: t('usersExplorer:confirmations.confirmTextDoesNotMatch'),
    }),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      confirmText: '' as 'REMOVE',
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    const formData = new FormData();
    formData.append('intent', 'remove-admin');
    formData.append('confirmText', values.confirmText);

    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <AlertDialogContent>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5" />
              <Trans i18nKey="usersExplorer:confirmations.removeAdminTitle" />
            </AlertDialogTitle>

            <AlertDialogDescription>
              <Trans
                i18nKey="usersExplorer:confirmations.removeAdminDescription"
                values={{ email: userEmail }}
              />
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <FormField
              control={form.control}
              name="confirmText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    <Trans i18nKey="usersExplorer:confirmations.removeAdminPrompt" />
                  </FormLabel>

                  <FormControl>
                    <Input autoComplete="off" placeholder="REMOVE" {...field} />
                  </FormControl>

                  <FormDescription>
                    <span className="text-destructive">
                      <Trans
                        i18nKey="usersExplorer:confirmations.removingAdminAccess"
                        values={{ email: userEmail }}
                      />
                    </span>
                  </FormDescription>

                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" disabled={isSubmitting}>
                <Trans i18nKey="usersExplorer:common.cancel" />
              </Button>
            </AlertDialogCancel>

            <Button
              type="submit"
              variant="destructive"
              disabled={isSubmitting}
              data-testid="revoke-admin-access-submit-button"
            >
              {isSubmitting ? (
                <Trans i18nKey="usersExplorer:common.removing" />
              ) : (
                <Trans i18nKey="usersExplorer:common.removeAdmin" />
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </Form>
    </AlertDialogContent>
  );
}
