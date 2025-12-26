import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangleIcon, LinkIcon, ShieldOffIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import {
  AlertDialog,
  AlertDialogAction,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';
import { Trans } from '@kit/ui/trans';

type DeleteUserDialogProps = React.PropsWithChildren<{
  userEmail: string;
}>;

export function DeleteUserDialog({
  userEmail,
  children,
}: DeleteUserDialogProps) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const schema = z.object({
    confirmText: z.literal('DELETE', {
      error: t('usersExplorer:confirmations.confirmTextDoesNotMatch'),
    }),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      confirmText: '' as 'DELETE',
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    const formData = new FormData();
    formData.append('intent', 'delete-user');
    formData.append('confirmText', values.confirmText);

    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5" />

                <Trans i18nKey="usersExplorer:confirmations.deleteTitle" />
              </AlertDialogTitle>

              <AlertDialogDescription>
                <Trans
                  i18nKey="usersExplorer:confirmations.deleteDescription"
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
                      <Trans i18nKey="usersExplorer:confirmations.deletePrompt" />
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="off"
                        placeholder="DELETE"
                        {...field}
                      />
                    </FormControl>

                    <FormDescription>
                      <span className="text-destructive">
                        <Trans i18nKey="usersExplorer:confirmations.deletingUser" />
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
              >
                <Trans i18nKey="usersExplorer:common.delete" />
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type BanUserDialogProps = React.PropsWithChildren<{
  userEmail: string;
}>;

export function BanUserDialog({ userEmail, children }: BanUserDialogProps) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const schema = z.object({
    confirmText: z.literal('BAN', {
      error: t('usersExplorer:confirmations.confirmTextDoesNotMatch'),
    }),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      confirmText: '' as 'BAN',
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    const formData = new FormData();
    formData.append('intent', 'ban-user');
    formData.append('confirmText', values.confirmText);

    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5" />

                <Trans i18nKey="usersExplorer:confirmations.banTitle" />
              </AlertDialogTitle>

              <AlertDialogDescription>
                <Trans i18nKey="usersExplorer:confirmations.banDescription" />
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-4">
              <FormField
                control={form.control}
                name="confirmText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="usersExplorer:confirmations.banPrompt" />
                    </FormLabel>

                    <FormControl>
                      <Input autoComplete="off" placeholder="BAN" {...field} />
                    </FormControl>

                    <FormDescription>
                      <span className="text-destructive">
                        <Trans
                          i18nKey="usersExplorer:confirmations.banningUser"
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
              >
                {isSubmitting ? (
                  <Trans i18nKey="usersExplorer:common.banning" />
                ) : (
                  <Trans i18nKey="usersExplorer:common.ban" />
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type ResetPasswordDialogProps = React.PropsWithChildren<{
  userEmail: string;
}>;

export function ResetPasswordDialog({
  userEmail,
  children,
}: ResetPasswordDialogProps) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const schema = z.object({
    confirmText: z.literal('RESET', {
      error: t('usersExplorer:confirmations.confirmTextDoesNotMatch'),
    }),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      confirmText: '' as 'RESET',
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    const formData = new FormData();
    formData.append('intent', 'reset-password');
    formData.append('confirmText', values.confirmText);

    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5" />
                <Trans i18nKey="usersExplorer:confirmations.resetTitle" />
              </AlertDialogTitle>

              <AlertDialogDescription>
                <Trans i18nKey="usersExplorer:confirmations.resetDescription" />
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-4">
              <FormField
                control={form.control}
                name="confirmText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="usersExplorer:confirmations.resetPrompt" />
                    </FormLabel>

                    <FormControl>
                      <Input
                        autoComplete="off"
                        placeholder="RESET"
                        {...field}
                      />
                    </FormControl>

                    <FormDescription>
                      <Trans
                        i18nKey="usersExplorer:confirmations.resettingUser"
                        values={{ email: userEmail }}
                      />
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

              <Button type="submit" disabled={isSubmitting}>
                <Trans i18nKey="usersExplorer:common.resetPassword" />
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type UnbanUserDialogProps = React.PropsWithChildren<{
  userEmail: string;
}>;

export function UnbanUserDialog({ userEmail, children }: UnbanUserDialogProps) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const handleUnban = () => {
    const formData = new FormData();
    formData.append('intent', 'unban-user');

    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans i18nKey="usersExplorer:common.unban" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans
              i18nKey="usersExplorer:confirmations.unbanDescription"
              values={{ email: userEmail }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isSubmitting}>
              <Trans i18nKey="usersExplorer:common.cancel" />
            </Button>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            <Button onClick={handleUnban} disabled={isSubmitting}>
              {isSubmitting ? (
                <Trans i18nKey="usersExplorer:common.unbanning" />
              ) : (
                <Trans i18nKey="usersExplorer:common.unban" />
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type SendMagicLinkDialogProps = React.PropsWithChildren<{
  userEmail: string;
}>;

export function SendMagicLinkDialog({
  userEmail,
  children,
}: SendMagicLinkDialogProps) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const schema = z.object({
    type: z.enum(['signup', 'recovery', 'invite']),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'recovery',
    },
  });

  const onSubmit = (values: z.infer<typeof schema>) => {
    const formData = new FormData();
    formData.append('intent', 'send-magic-link');
    formData.append('type', values.type);

    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                <Trans i18nKey="usersExplorer:confirmations.sendMagicLinkTitle" />
              </AlertDialogTitle>

              <AlertDialogDescription>
                <Trans
                  i18nKey="usersExplorer:confirmations.sendMagicLinkDescription"
                  values={{ email: userEmail }}
                />
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans i18nKey="usersExplorer:confirmations.magicLinkType" />
                    </FormLabel>

                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="recovery">
                          <Trans i18nKey="usersExplorer:confirmations.recoveryLink" />
                        </SelectItem>
                        <SelectItem value="invite">
                          <Trans i18nKey="usersExplorer:confirmations.inviteLink" />
                        </SelectItem>
                        <SelectItem value="signup">
                          <Trans i18nKey="usersExplorer:confirmations.signupLink" />
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <FormDescription>
                      <Trans i18nKey="usersExplorer:confirmations.magicLinkTypeDescription" />
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

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Trans i18nKey="usersExplorer:common.sendingMagicLink" />
                ) : (
                  <Trans i18nKey="usersExplorer:common.sendMagicLink" />
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type RemoveMfaFactorDialogProps = React.PropsWithChildren<{
  userEmail: string;
  factorId: string;
  factorType: string;
}>;

export function RemoveMfaFactorDialog({
  userEmail,
  factorId,
  factorType,
  children,
}: RemoveMfaFactorDialogProps) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';

  const handleRemove = () => {
    const formData = new FormData();
    formData.append('intent', 'remove-mfa-factor');
    formData.append('factorId', factorId);

    fetcher.submit(formData, { method: 'POST' });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive flex items-center gap-2">
            <ShieldOffIcon className="h-5 w-5" />
            <Trans i18nKey="usersExplorer:confirmations.removeMfaTitle" />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans
              i18nKey="usersExplorer:confirmations.removeMfaDescription"
              values={{ email: userEmail, factorType }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isSubmitting}>
              <Trans i18nKey="usersExplorer:common.cancel" />
            </Button>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            <Button
              onClick={handleRemove}
              disabled={isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? (
                <Trans i18nKey="usersExplorer:common.removingMfaFactor" />
              ) : (
                <Trans i18nKey="usersExplorer:common.removeMfaFactor" />
              )}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
