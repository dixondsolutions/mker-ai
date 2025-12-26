import { useCallback, useMemo, useState } from 'react';

import { useNavigate } from 'react-router';

import { useTranslation } from 'react-i18next';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@kit/ui/select';

/**
 * Language selector
 * @param props - The props
 * @returns The language selector
 */
export function LanguageSelector({
  locale,
  onChange,
}: {
  locale: string;
  onChange?: (locale: string) => unknown;
}) {
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const { options } = i18n;
  const currentLanguage = locale;

  const locales = useMemo(() => {
    return (options.supportedLngs as string[]).filter(
      (locale) => locale.toLowerCase() !== 'cimode',
    );
  }, [options.supportedLngs]);

  const languageNames = useMemo(() => {
    return new Intl.DisplayNames([currentLanguage], {
      type: 'language',
    });
  }, [currentLanguage]);

  const [value, setValue] = useState(i18n.language);

  const languageChanged = useCallback(
    async (locale: string) => {
      setValue(locale);

      if (onChange) {
        onChange(locale);
      }

      document.cookie = `lang=${locale}; path=/; max-age=31536000`;

      await i18n.changeLanguage(locale);

      // refresh cached translations
      return navigate('.', { replace: true });
    },
    [i18n, navigate, onChange],
  );

  return (
    <Select value={value} onValueChange={languageChanged}>
      <SelectTrigger data-testid="language-selector-trigger">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        {locales.map((locale) => {
          const label = languageNames.of(locale) ?? locale;

          return (
            <SelectItem
              value={locale}
              key={locale}
              data-testid={`language-selector-item-${locale}`}
            >
              <span className="capitalize">{label}</span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
