import { PermissionGroupFormDialog } from './permission-group-form-dialog';

interface CreatePermissionGroupDialogProps {
  children: React.ReactNode;
}

export function CreatePermissionGroupDialog({
  children,
}: CreatePermissionGroupDialogProps) {
  return (
    <PermissionGroupFormDialog mode="create">
      {children}
    </PermissionGroupFormDialog>
  );
}
