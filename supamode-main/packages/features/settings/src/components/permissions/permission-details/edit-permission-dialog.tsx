import { permissionsInSupamode } from '@kit/supabase/schema';

import { PermissionFormDialog } from '../dialogs/permission-form-dialog';

type Permission = typeof permissionsInSupamode.$inferSelect;

interface EditPermissionDialogProps {
  children: React.ReactNode;
  permission: Permission;
  onSuccess: () => void;
}

export function EditPermissionDialog({
  children,
  permission,
  onSuccess,
}: EditPermissionDialogProps) {
  return (
    <PermissionFormDialog
      mode="edit"
      permission={permission}
      onSuccess={onSuccess}
    >
      {children}
    </PermissionFormDialog>
  );
}
