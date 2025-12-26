import { useEffect } from 'react';

import { useRouteLoaderData } from 'react-router';

import { useTranslation } from 'react-i18next';

export function LanguageSetter() {
  const data = useRouteLoaderData('app-root');
  const { i18n } = useTranslation();

  useEffect(() => {
    // if the language is not the same as the resolved language, change the language.
    if (data?.preferences?.language !== i18n.resolvedLanguage) {
      // change the language
      i18n.changeLanguage(data.preferences.language);
    }
  }, [data?.preferences?.language, i18n]);

  return null;
}
