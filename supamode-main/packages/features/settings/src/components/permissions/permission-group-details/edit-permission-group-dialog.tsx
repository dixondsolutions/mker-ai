import { permissionGroupsInSupamode } from '@kit/supabase/schema';

import { PermissionGroupFormDialog } from '../dialogs/permission-group-form-dialog';

type PermissionGroup = typeof permissionGroupsInSupamode.$inferSelect;

interface EditPermissionGroupDialogProps {
  children: React.ReactNode;
  permissionGroup: PermissionGroup;
  onSuccess?: () => void;
}

export function EditPermissionGroupDialog({
  children,
  permissionGroup,
  onSuccess,
}: EditPermissionGroupDialogProps) {
  return (
    <PermissionGroupFormDialog
      mode="edit"
      permissionGroup={permissionGroup}
      onSuccess={onSuccess}
    >
      {children}
    </PermissionGroupFormDialog>
  );
}
