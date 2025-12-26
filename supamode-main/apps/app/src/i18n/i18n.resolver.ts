/**
 * Resolves the translation file for a given language and namespace.
 *
 */
export async function i18nResolver(language: string, namespace: string) {
  try {
    const data = await import(`./locales/${language}/${namespace}.json`);

    return data as Record<string, string>;
  } catch (error) {
    console.error(
      `Error loading translation file for ${language}/${namespace}:`,
      error,
    );

    return {};
  }
}
