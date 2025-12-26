import { useCallback, useMemo, useState } from 'react';

import { useSearchParams } from 'react-router';

export function useDashboardEditMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [localEditMode, setLocalEditMode] = useState(false);

  // Check if edit mode is enabled via URL params or local state
  const isEditing = searchParams.get('edit') === 'true' || localEditMode;

  const enableEditMode = useCallback(() => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('edit', 'true');
      return newParams;
    });

    setLocalEditMode(true);
  }, [setSearchParams]);

  const disableEditMode = useCallback(() => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('edit');
      return newParams;
    });

    setLocalEditMode(false);
  }, [setSearchParams]);

  const toggleEditMode = useCallback(() => {
    if (isEditing) {
      disableEditMode();
    } else {
      enableEditMode();
    }
  }, [isEditing, enableEditMode, disableEditMode]);

  return useMemo(
    () => ({
      isEditing,
      enableEditMode,
      disableEditMode,
      toggleEditMode,
    }),
    [isEditing, enableEditMode, disableEditMode, toggleEditMode],
  );
}
