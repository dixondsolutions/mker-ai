import { useId, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button } from '@kit/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { DialogFooter } from '@kit/ui/dialog';
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
import { toast } from '@kit/ui/sonner';
import { Textarea } from '@kit/ui/textarea';
import { Trans } from '@kit/ui/trans';

import { updateRoleAction } from '../../../actions/update-permissions-actions';
import { rolePermissionsLoader } from '../../../loaders';

interface EditRoleDialogProps {
  roleId: string;
  maxRank: number;
}

export function EditRoleDialog(
  props: React.PropsWithChildren<EditRoleDialogProps>,
) {
  const { roleId, maxRank } = props;
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{props.children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans i18nKey="settings:roles.edit" />
          </DialogTitle>

          <DialogDescription>
            <Trans i18nKey="settings:roles.editDescription" />
          </DialogDescription>
        </DialogHeader>

        <EditRoleDialogForm
          roleId={roleId}
          maxRank={maxRank}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditRoleDialogFormProps extends EditRoleDialogProps {
  onSuccess?: () => void;
  maxRank: number;
}

function EditRoleDialogForm(props: EditRoleDialogFormProps) {
  const { roleId, onSuccess, maxRank } = props;

  const formId = useId();
  const { t } = useTranslation();

  // Define the form schema based on the UpdateRoleSchema
  const formSchema = useMemo(() => {
    return z.object({
      name: z
        .string()
        .min(1, { message: t('settings:errors.nameRequired') })
        .max(50, { message: t('settings:errors.nameLength') }),
      description: z.string().min(1).max(500).optional(),
      rank: z.number().int().min(0).max(maxRank).optional(),
    });
  }, [maxRank, t]);

  type FormValues = z.infer<typeof formSchema>;

  // Fetch role data
  const { data: roleData } = useQuery({
    queryKey: ['role', roleId],
    queryFn: () => {
      return rolePermissionsLoader(roleId);
    },
  });

  const role = roleData?.roles?.[0];

  // Initialize form with role data
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: role?.name || '',
      description: role?.description || '',
      rank: role?.rank || 0,
    },
    values: {
      name: role?.name || '',
      description: role?.description || '',
      rank: role?.rank || 0,
    },
  });

  // Mutation for updating the role
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      return updateRoleAction({
        id: roleId,
        data: values,
      });
    },
    onSuccess: () => {
      toast.success(t('settings:roles.updatedSuccessfully'));

      // Close the dialog
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  return (
    <Form {...form}>
      <form
        data-testid="edit-role-dialog-form"
        id={formId}
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                <Trans i18nKey="common:name" />
              </FormLabel>

              <FormControl>
                <Input
                  placeholder={t('settings:roles.namePlaceholder')}
                  {...field}
                  data-testid="edit-role-dialog-name-input"
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
                <Trans i18nKey="common:description" />
              </FormLabel>

              <FormControl>
                <Textarea
                  placeholder={t('settings:roles.descriptionPlaceholder')}
                  {...field}
                  data-testid="edit-role-dialog-description-textarea"
                />
              </FormControl>

              <FormDescription>
                <Trans i18nKey="settings:roles.descriptionDescription" />
              </FormDescription>

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
                  min={0}
                  max={maxRank}
                  {...field}
                  onChange={(e) =>
                    field.onChange(parseInt(e.target.value) || 0)
                  }
                  data-testid="edit-role-dialog-rank-input"
                />
              </FormControl>

              <FormDescription>
                <Trans
                  i18nKey="settings:roles.assignedPermissionsDescription"
                  values={{ maxRank }}
                />
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button
            type="submit"
            form={formId}
            disabled={mutation.isPending || !form.formState.isDirty}
          >
            {mutation.isPending ? (
              <Trans i18nKey="common:saving" />
            ) : (
              <Trans i18nKey="common:saveChanges" />
            )}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
