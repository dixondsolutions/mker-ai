import { unstable_usePrompt } from 'react-router';

import { useTranslation } from 'react-i18next';

/**
 * Hook to block the form if it's currently submitting info
 * and prompt the user if they have unsaved changes when they try to leave the page
 * @param props - The props for the hook
 * @param props.hasUnsavedChanges - Whether the form has unsaved changes
 * @param props.isSubmitting - Whether the form is currently submitting
 * @param props.message - The message to display to the user
 * @returns The blocker function
 */
export function useFormBlocker(props: {
  hasUnsavedChanges: boolean;
  isSubmitting: boolean;
  message?: string;
}) {
  const { t } = useTranslation();

  const {
    hasUnsavedChanges,
    isSubmitting,
    message = t('common:promptUnsavedChanges'),
  } = props;

  // Prompt the user if they have unsaved changes when they try to leave the page
  unstable_usePrompt({
    message,
    when: ({ currentLocation, nextLocation }) =>
      (isSubmitting || hasUnsavedChanges) &&
      currentLocation.pathname !== nextLocation.pathname,
  });
}
