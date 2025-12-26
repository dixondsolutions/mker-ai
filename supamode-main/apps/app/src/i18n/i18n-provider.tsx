import type { InitOptions, i18n } from 'i18next';

import { getI18nSettings } from './i18n.settings.ts';

let i18nInstance: i18n;

/**
 * Resolver
 * @description The resolver for the i18n instance.
 */
type Resolver = (
  lang: string,
  namespace: string,
) => Promise<Record<string, string>>;

/**
 * Default language
 * @description The default language to use if no language is provided.
 */
const defaultLanguage = import.meta.env.VITE_LOCALE ?? 'en';

/**
 * I18n provider
 * @param props - The props
 * @returns The i18n provider
 */
export function I18nProvider({
  children,
  resolver,
  language = defaultLanguage,
}: React.PropsWithChildren<{
  resolver: Resolver;
  language?: string;
}>) {
  const settings = getI18nSettings(language);

  useI18nClient(settings, resolver);

  return children;
}

/**
 * @name useI18nClient
 * @description A hook that initializes the i18n client.
 * @param settings
 * @param resolver
 */
function useI18nClient(settings: InitOptions, resolver: Resolver) {
  if (
    !i18nInstance ||
    i18nInstance.language !== settings.lng ||
    i18nInstance.options.ns?.length !== settings.ns?.length
  ) {
    throw loadI18nInstance(settings, resolver);
  }

  return i18nInstance;
}

/**
 * Load the i18n instance
 * @param settings - The settings
 * @param resolver - The resolver
 */
async function loadI18nInstance(settings: InitOptions, resolver: Resolver) {
  const { initializeI18nClient } = await import('./i18n-client');

  i18nInstance = await initializeI18nClient(settings, resolver);
}
