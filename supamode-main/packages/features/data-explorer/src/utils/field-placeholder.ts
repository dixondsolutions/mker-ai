import { getI18n } from 'react-i18next';

import { ColumnMetadata } from '@kit/types';

import { stripTypeCast } from './strip-type-cast';

export function getFieldPlaceholder(field: ColumnMetadata) {
  const { t } = getI18n();
  const rawDef = field.default_value ?? '';
  const def = rawDef.trim().toLowerCase();
  const name = field.display_name || field.name;

  const defaultPlaceholder = t('dataExplorer:record.placeholder.default', {
    name,
  });

  // No default or empty literal → “Enter {{name}}…”
  if (!def || def === "''") {
    return defaultPlaceholder;
  }

  // 1. Exact matches
  const exact: Record<string, string> = {
    null: 'dataExplorer:record.placeholder.null',
    true: 'dataExplorer:record.placeholder.true',
    false: 'dataExplorer:record.placeholder.false',
    '[]': 'dataExplorer:record.placeholder.array',
    "'{}'::json": 'dataExplorer:record.placeholder.json',
    "'{}'::jsonb": 'dataExplorer:record.placeholder.jsonb',
  };

  if (exact[def]) {
    return t(exact[def]);
  }

  // 2. UUID generators (both known fns and any fn on a uuid column)
  const uuidFns = [
    'gen_random_uuid()',
    'uuid_generate_v4()',
    'extensions.uuid_generate_v4()',
    'uuid_generate_v1()',
  ];

  const dataType = field.ui_config?.data_type;

  if (
    uuidFns.includes(def) ||
    (dataType === 'uuid' && /^[a-z_]\w*\(.*\)$/.test(def))
  ) {
    return t('dataExplorer:record.placeholder.uuid');
  }

  // 3. Sequences
  if (/^nextval\(.+\)$/.test(def)) {
    return t('dataExplorer:record.placeholder.sequence');
  }

  // 4. Timestamps & dates
  const tsFns = ['now()', 'current_timestamp', 'current_date', 'current_time'];

  if (
    tsFns.includes(def) ||
    dataType?.startsWith('timestamp') ||
    dataType === 'timestamp with time zone'
  ) {
    return t('dataExplorer:record.placeholder.now');
  }

  // 5. Casted literals (e.g. 'foo'::text[], '123'::int)
  const cast = def.match(/^'(.*)'::(\w+(\[\])?)$/);

  if (cast) {
    const [, , type = ''] = cast;

    if (type === 'json' || type === 'jsonb') {
      return t('dataExplorer:record.placeholder.json');
    }

    if (type.endsWith('[]')) {
      // pluralize base type: e.g. array of text
      const base = type.slice(0, -2);

      return t('dataExplorer:record.placeholder.arrayOf', { type: base });
    }
  }

  // 6. Any other function call → “Auto-generated value”
  if (/^[a-z_]\w*\(.*\)$/.test(def)) {
    return t('dataExplorer:record.placeholder.generated');
  }

  // 7. Fallback: strip any ::type and show raw literal
  return stripTypeCast(rawDef);
}
