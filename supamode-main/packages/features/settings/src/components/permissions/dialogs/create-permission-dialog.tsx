import { useCallback } from 'react';

import { useNavigate } from 'react-router';

import { PermissionFormDialog } from './permission-form-dialog';

export function CreatePermissionDialog({ children }: React.PropsWithChildren) {
  const navigate = useNavigate();

  const onSuccess = useCallback(
    (permissionId: string) => {
      navigate(`/settings/permissions/${permissionId}`);
    },
    [navigate],
  );

  return (
    <PermissionFormDialog mode="create" onSuccess={onSuccess}>
      {children}
    </PermissionFormDialog>
  );
}
