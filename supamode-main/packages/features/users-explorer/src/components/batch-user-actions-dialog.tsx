import { useEffect } from 'react';

import { useFetcher } from 'react-router';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangleIcon } from 'lucide-react';
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
import { Trans } from '@kit/ui/trans';

type BatchDeleteUsersDialogProps = React.PropsWithChildren<{
  selectedUsers: Array<{ id: string; email: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}>;

export function BatchDeleteUsersDialog({
  selectedUsers,
  children,
  open,
  onOpenChange,
  onSuccess,
}: BatchDeleteUsersDialogProps) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';

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

  useEffect(() => {
    if (fetcher.data?.success) {
      onSuccess?.();
    }
  }, [fetcher.data, onSuccess]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}

      <AlertDialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(() => {
              fetcher.submit(
                {
                  intent: 'batch-delete',
                  payload: {
                    userIds: selectedUsers.map((user) => user.id),
                  },
                },
                {
                  method: 'POST',
                  encType: 'application/json',
                },
              );
            })}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5" />

                <Trans
                  i18nKey="usersExplorer:confirmations.batchDeleteTitle"
                  values={{ count: selectedUsers.length }}
                />
              </AlertDialogTitle>

              <AlertDialogDescription>
                <Trans
                  i18nKey="usersExplorer:confirmations.batchDeleteDescription"
                  values={{ count: selectedUsers.length }}
                />
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-4">
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium">
                  <Trans i18nKey="usersExplorer:confirmations.usersToDelete" />
                </p>

                <div className="bg-muted max-h-32 overflow-y-auto rounded p-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="text-muted-foreground text-sm"
                    >
                      {user.email}
                    </div>
                  ))}
                </div>
              </div>

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
                        <Trans
                          i18nKey="usersExplorer:confirmations.batchDeletingUsers"
                          values={{ count: selectedUsers.length }}
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
                  <Trans i18nKey="usersExplorer:actions.deletingUser" />
                ) : (
                  <Trans i18nKey="usersExplorer:common.delete" />
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type BatchBanUsersDialogProps = React.PropsWithChildren<{
  selectedUsers: Array<{ id: string; email: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}>;

export function BatchBanUsersDialog({
  selectedUsers,
  children,
  open,
  onOpenChange,
  onSuccess,
}: BatchBanUsersDialogProps) {
  const { t } = useTranslation();
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';

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

  useEffect(() => {
    if (fetcher.data?.success) {
      onSuccess?.();
    }
  }, [fetcher.data, onSuccess]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}

      <AlertDialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(() => {
              fetcher.submit(
                {
                  intent: 'batch-ban',
                  payload: {
                    userIds: selectedUsers.map((user) => user.id),
                  },
                },
                {
                  method: 'POST',
                  encType: 'application/json',
                },
              );
            })}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5" />
                <Trans
                  i18nKey="usersExplorer:confirmations.batchBanTitle"
                  values={{ count: selectedUsers.length }}
                />
              </AlertDialogTitle>

              <AlertDialogDescription>
                <Trans
                  i18nKey="usersExplorer:confirmations.batchBanDescription"
                  values={{ count: selectedUsers.length }}
                />
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-4">
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium">
                  <Trans i18nKey="usersExplorer:confirmations.usersToBan" />
                </p>
                <div className="bg-muted max-h-32 overflow-y-auto rounded p-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="text-muted-foreground text-sm"
                    >
                      {user.email}
                    </div>
                  ))}
                </div>
              </div>

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
                          i18nKey="usersExplorer:confirmations.batchBanningUsers"
                          values={{ count: selectedUsers.length }}
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

type BatchUnbanUsersDialogProps = React.PropsWithChildren<{
  selectedUsers: Array<{ id: string; email: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}>;

export function BatchUnbanUsersDialog({
  selectedUsers,
  children,
  open,
  onOpenChange,
  onSuccess,
}: BatchUnbanUsersDialogProps) {
  const fetcher = useFetcher<{ success: boolean }>();
  const isSubmitting = fetcher.state === 'submitting';

  useEffect(() => {
    if (fetcher.data?.success) {
      onSuccess?.();
    }
  }, [fetcher.data, onSuccess]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans
              i18nKey="usersExplorer:confirmations.batchUnbanTitle"
              values={{ count: selectedUsers.length }}
            />
          </AlertDialogTitle>

          <AlertDialogDescription>
            <Trans
              i18nKey="usersExplorer:confirmations.batchUnbanDescription"
              values={{ count: selectedUsers.length }}
            />
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <p className="mb-2 text-sm font-medium">
            <Trans i18nKey="usersExplorer:confirmations.usersToUnban" />
          </p>
          <div className="bg-muted max-h-32 overflow-y-auto rounded p-2">
            {selectedUsers.map((user) => (
              <div key={user.id} className="text-muted-foreground text-sm">
                {user.email}
              </div>
            ))}
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button variant="outline" disabled={isSubmitting}>
              <Trans i18nKey="usersExplorer:common.cancel" />
            </Button>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            <Button
              onClick={() => {
                fetcher.submit(
                  {
                    intent: 'batch-unban',
                    payload: {
                      userIds: selectedUsers.map((user) => user.id),
                    },
                  },
                  {
                    method: 'POST',
                    encType: 'application/json',
                  },
                );
              }}
              disabled={isSubmitting}
            >
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

type BatchResetPasswordDialogProps = React.PropsWithChildren<{
  selectedUsers: Array<{ id: string; email: string }>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}>;

export function BatchResetPasswordDialog({
  selectedUsers,
  children,
  open,
  onOpenChange,
  onSuccess,
}: BatchResetPasswordDialogProps) {
  const { t } = useTranslation();
  const fetcher = useFetcher<{ success: boolean }>();
  const isSubmitting = fetcher.state === 'submitting';

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

  useEffect(() => {
    if (fetcher.data?.success) {
      onSuccess?.();
    }
  }, [fetcher.data, onSuccess]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}

      <AlertDialogContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(() => {
              fetcher.submit(
                {
                  intent: 'batch-reset-password',
                  payload: {
                    userIds: selectedUsers.map((user) => user.id),
                  },
                },
                {
                  method: 'POST',
                  encType: 'application/json',
                },
              );
            })}
          >
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="h-5 w-5" />
                <Trans
                  i18nKey="usersExplorer:confirmations.batchResetTitle"
                  values={{ count: selectedUsers.length }}
                />
              </AlertDialogTitle>

              <AlertDialogDescription>
                <Trans
                  i18nKey="usersExplorer:confirmations.batchResetDescription"
                  values={{ count: selectedUsers.length }}
                />
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-4">
              <div className="mb-4">
                <p className="mb-2 text-sm font-medium">
                  <Trans i18nKey="usersExplorer:confirmations.usersToReset" />
                </p>
                <div className="bg-muted max-h-32 overflow-y-auto rounded p-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="text-muted-foreground text-sm"
                    >
                      {user.email}
                    </div>
                  ))}
                </div>
              </div>

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
                        i18nKey="usersExplorer:confirmations.batchResettingUsers"
                        values={{ count: selectedUsers.length }}
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
                {isSubmitting ? (
                  <Trans i18nKey="usersExplorer:actions.resettingPassword" />
                ) : (
                  <Trans i18nKey="usersExplorer:common.resetPassword" />
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </Form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
