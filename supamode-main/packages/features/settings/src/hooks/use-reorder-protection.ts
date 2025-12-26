import { useCallback, useState } from 'react';

import { unstable_usePrompt } from 'react-router';

import { useTranslation } from 'react-i18next';

export function useReorderProtection() {
  const [isReordering, setIsReordering] = useState(false);
  const { t } = useTranslation();

  // Block navigation during reordering to ensure operations complete
  unstable_usePrompt({
    message: t('settings:table.reorderProtection'),
    when: isReordering,
  });

  const startReordering = useCallback(() => {
    setIsReordering(true);
  }, []);

  const finishReordering = useCallback(() => {
    // Add buffer time to ensure all async operations complete
    setTimeout(() => {
      setIsReordering(false);
    }, 500);
  }, []);

  return {
    isReordering,
    startReordering,
    finishReordering,
  };
}
