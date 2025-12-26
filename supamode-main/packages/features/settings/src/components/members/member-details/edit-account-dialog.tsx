import { useFetcher } from 'react-router';

import { CheckIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { accountsInSupamode } from '@kit/supabase/schema';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
} from '@kit/ui/form';
import { If } from '@kit/ui/if';
import { Input } from '@kit/ui/input';
import { Trans } from '@kit/ui/trans';

type Metadata = {
  display_name: string;
  email: string;
};

interface EditAccountDialogProps {
  account: typeof accountsInSupamode.$inferSelect & {
    metadata: unknown;
  };
}

export function EditAccountDialog({
  account,
  children,
}: React.PropsWithChildren<EditAccountDialogProps>) {
  const metadata = account.metadata as Metadata;

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:member.editAccount" />
          </DialogTitle>

          <DialogDescription>
            <Trans
              i18nKey="settings:member.editAccountDescription"
              values={{
                name: metadata.display_name || metadata.email || 'Account',
              }}
            />
          </DialogDescription>
        </DialogHeader>

        <EditAccountDialogForm account={account} />
      </DialogContent>
    </Dialog>
  );
}

function EditAccountDialogForm({
  account,
}: {
  account: EditAccountDialogProps['account'];
}) {
  const fetcher = useFetcher<{
    success: boolean;
  }>();

  const metadata = account.metadata as Metadata;

  const form = useForm({
    defaultValues: {
      displayName: metadata.display_name,
      email: metadata.email,
    },
  });

  const isDirty = form.formState.isDirty;
  const isSubmitting = fetcher.state === 'submitting';

  return (
    <Form {...form}>
      <form
        data-testid="member-details-edit-account-form"
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit((data) => {
          if (!isDirty || isSubmitting) {
            return;
          }

          fetcher.submit(
            {
              data: JSON.stringify(data),
              intent: 'update-account',
            },
            {
              method: 'post',
            },
          );
        })}
      >
        <If condition={fetcher.data?.success}>
          <Alert variant={'success'}>
            <CheckIcon className="h-4 w-4" />

            <AlertTitle>
              <Trans i18nKey="settings:member.accountUpdated" />
            </AlertTitle>

            <AlertDescription>
              <Trans i18nKey="settings:member.accountUpdatedDescription" />
            </AlertDescription>
          </Alert>
        </If>

        <FormField
          control={form.control}
          name="displayName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="settings:displayName" />
              </FormLabel>

              <FormControl>
                <Input
                  {...field}
                  data-testid="member-details-display-name-input"
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:member.displayNameDescription" />
              </FormDescription>
            </FormItem>
          )}
        />

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
                  {...field}
                  type="email"
                  data-testid="member-details-email-input"
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:member.emailDescription" />
              </FormDescription>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline" type="button">
              <Trans i18nKey="common:cancel" />
            </Button>
          </DialogClose>

          <Button disabled={!isDirty || isSubmitting} type="submit">
            {isSubmitting ? (
              <Trans i18nKey="common:saving" />
            ) : (
              <Trans i18nKey="common:save" />
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
