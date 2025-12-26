import { getI18n } from 'react-i18next';
import { ZodTypeAny, z } from 'zod';

import { ColumnMetadata, PostgresDataType } from '@kit/types';

import { stripTypeCast } from './strip-type-cast';

/** --- PostgreSQL type lists (one source of truth) --- */
const pgNumberTypes = [
  'integer',
  'bigint',
  'smallint',
  'serial',
  'bigserial',
  'float',
  'real',
  'double precision',
  'numeric',
  'decimal',
];

const pgDateTypes = [
  'date',
  'timestamp',
  'timestamp with time zone',
  'timestamptz',
];

const pgTimeTypes = ['time', 'time with time zone', 'interval'];
const pgUuidTypes = ['uuid'];
const pgNetworkTypes = ['inet', 'cidr'];
const pgJsonTypes = ['json', 'jsonb'];

/** --- TypeKey resolver --- */
function getTypeKey(field: ColumnMetadata): string {
  const uiType = field.ui_config?.ui_data_type?.toLowerCase() || '';
  const pgType = field.ui_config?.data_type?.toLowerCase() || '';

  if (uiType === 'email') return 'email';
  if (uiType === 'color') return 'color';
  if (uiType === 'url') return 'url';
  if (uiType === 'address') return 'address';
  if (['image', 'file', 'audio', 'video'].includes(uiType)) return 'file';
  if (uiType === 'switch' || pgType === 'boolean') return 'boolean';
  if (pgUuidTypes.includes(pgType)) return 'uuid';
  if (pgNetworkTypes.includes(pgType)) return 'network';
  if (pgDateTypes.includes(pgType)) return 'date';
  if (pgTimeTypes.includes(pgType)) return 'time';
  if (pgType.endsWith('[]')) return 'array';
  if (pgJsonTypes.includes(pgType)) return 'json';
  if (field.ui_config?.is_enum && field.ui_config.enum_values) return 'enum';
  if (uiType === 'number' || pgNumberTypes.includes(pgType)) return 'number';

  return 'string';
}

/** --- Builder signature --- */
type SchemaBuilder = (
  field: ColumnMetadata,
  opts: { isRelation: boolean },
) => ZodTypeAny;

/** --- Individual builders --- */
const buildEmailSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z
    .string({ error: t('dataExplorer:errors.required') })
    .email(t('dataExplorer:errors.invalid_email'));
};

const buildColorSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z
    .string({ error: t('dataExplorer:errors.required') })
    .regex(/^#[0-9A-Fa-f]{6}$/, {
      message: t('dataExplorer:errors.invalid_color'),
    });
};

const buildUrlSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z
    .string({ error: t('dataExplorer:errors.required') })
    .url(t('dataExplorer:errors.invalid_url'));
};

const buildBooleanSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z.boolean({ error: t('dataExplorer:errors.required') });
};

const buildUuidSchema: SchemaBuilder = (_, { isRelation }) => {
  const t = getI18n().t;

  const msg = isRelation
    ? t('dataExplorer:errors.invalid_relation')
    : t('dataExplorer:errors.invalid_uuid');

  return z.string({ error: msg }).uuid(msg);
};

const buildNetworkSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z.string({ error: t('dataExplorer:errors.required') }).refine(
    (val) => {
      if (val === '') return true;

      // IPv4 validation
      const ipv4Regex =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (ipv4Regex.test(val)) return true;

      // IPv6 validation - handle various formats including compressed notation
      const ipv6Patterns = [
        /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, // Full form
        /^::1$/, // Loopback
        /^::$/, // All zeros
        /^(?:[0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4})*$/, // Compressed
        /^(?:[0-9a-fA-F]{1,4}:)*::(?:[0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/, // Compressed middle
      ];

      return ipv6Patterns.some((pattern) => pattern.test(val));
    },
    {
      message: t('dataExplorer:errors.invalid_ip'),
    },
  );
};

const buildTimeSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z
    .string({ error: t('dataExplorer:errors.required') })
    .regex(
      /^([01]?\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/,
      t('dataExplorer:errors.invalid_time'),
    );
};

const buildDateSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z.string({ error: t('dataExplorer:errors.required') }).refine(
    (val) => {
      if (val === '') return true;
      return !Number.isNaN(new Date(val).getTime());
    },
    {
      message: t('dataExplorer:errors.invalid_date'),
    },
  );
};

const buildNumberSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  // z.coerce will turn strings → numbers, but fail on invalid.
  return z.coerce.number({
    error: t('dataExplorer:errors.required'),
  });
};

const buildJsonSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z.unknown().refine(
    (val) => {
      if (val === '') return true;
      try {
        JSON.parse(JSON.stringify(val));
        return true;
      } catch {
        return false;
      }
    },
    {
      message: t('dataExplorer:errors.invalid_json'),
    },
  );
};

const buildEnumSchema: SchemaBuilder = (field) => {
  const t = getI18n().t;
  const vals = field.ui_config!.enum_values as [string, ...string[]];

  return z.enum(vals, {
    error: t('dataExplorer:errors.invalid_enum'),
  });
};

const buildAddressSchema: SchemaBuilder = () => {
  return z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
  });
};

const buildFileSchema: SchemaBuilder = () => {
  const t = getI18n().t;

  return z.string({ error: t('dataExplorer:errors.required') });
};

const buildStringSchema: SchemaBuilder = (field, { isRelation }) => {
  const t = getI18n().t;

  const err = isRelation
    ? t('dataExplorer:errors.invalid_relation')
    : t('dataExplorer:errors.required');

  let s = z.string({ error: err });

  if (field.is_required) {
    s = s.min(1, { message: err });
  }

  const maxLength = field.ui_config?.max_length;

  if (maxLength) {
    s = s.max(maxLength, {
      message: t('dataExplorer:errors.maxLength', { maxLength }),
    });
  }

  return s;
};

const buildArraySchema: SchemaBuilder = (field, opts) => {
  const pgType = field.ui_config?.data_type?.toLowerCase() || '';
  const baseType = pgType.slice(0, -2) as PostgresDataType;

  // reuse scalar builders based on baseType
  const fakeField: ColumnMetadata = {
    ...field,
    ui_config: {
      ...field.ui_config!,
      data_type: baseType,
      ui_data_type: '',
      is_enum: false,
      enum_values: undefined,
    },
  };

  const elementBuilder = builders[getTypeKey(fakeField)] ?? buildStringSchema;
  const elementSchema = elementBuilder(fakeField, opts);

  return z.array(elementSchema);
};

/** --- Registry of all builders --- */
const builders: Record<string, SchemaBuilder> = {
  email: buildEmailSchema,
  color: buildColorSchema,
  url: buildUrlSchema,
  boolean: buildBooleanSchema,
  uuid: buildUuidSchema,
  network: buildNetworkSchema,
  time: buildTimeSchema,
  date: buildDateSchema,
  number: buildNumberSchema,
  json: buildJsonSchema,
  enum: buildEnumSchema,
  address: buildAddressSchema,
  file: buildFileSchema,
  array: buildArraySchema,
  string: buildStringSchema,
};

/**
 * Applies defaults + nullability in one place.
 *
 * @param schema - The raw Zod schema
 * @param field - The field metadata
 * @returns The processed Zod schema
 */
function withDefaults(
  schema: ZodTypeAny,
  field: ColumnMetadata,
  key: string,
): ZodTypeAny {
  const rawDef = field.default_value?.trim() ?? '';
  const hasDef = rawDef !== '';
  // dynamic defaults (UUID fns, NOW(), sequences, etc.) should *not* be
  // applied client-side; treat them as “always undefined” so the server
  // will fill them in.
  const isDynamicDefault =
    /^[a-z_]\w*\(.*\)$/i.test(rawDef) ||
    rawDef.toLowerCase().startsWith('nextval');

  // If it’s a *static* default, parse it into a real JS value:
  const staticDefault =
    hasDef && !isDynamicDefault
      ? parseStaticDefault(stripTypeCast(rawDef))
      : undefined;

  // The one preprocess that does:
  //  • blank → (staticDefault || undefined)
  //  • string→boolean for switches
  //  • string→number for numbers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let s: any = z.preprocess((val) => {
    // 1) blank DOM inputs
    if (val === '' || val == null) {
      if (staticDefault !== undefined) {
        return staticDefault;
      }

      return undefined; // server will fill dynamic default
    }

    // 2) boolean coercion
    if (key === 'boolean' && typeof val === 'string') {
      if (val === 'true' || val === 'on') {
        return true;
      }

      if (val === 'false') {
        return false;
      }
    }

    // 3) number coercion
    if (key === 'number' && typeof val === 'string') {
      const num = Number(val);
      if (!Number.isNaN(num)) {
        return num;
      }
    }

    return val;
  }, schema);

  // 4) If the column is *not* required (or had a server default),
  //    mark it optional so `undefined` never triggers a “required” error.
  if (!field.is_required || isDynamicDefault) {
    s = s.nullish();
  }

  return s;
}

function parseStaticDefault(raw: string): unknown {
  const lit = raw.trim();

  // string literal:   'foo'
  const strMatch = lit.match(/^'(.*)'$/);
  if (strMatch) {
    return strMatch[1];
  }

  // boolean literal
  if (lit === 'true') {
    return true;
  }

  if (lit === 'false') {
    return false;
  }

  // numeric literal
  const n = Number(lit);
  if (!Number.isNaN(n)) {
    return n;
  }

  // JSON / array literal
  try {
    return JSON.parse(lit);
  } catch {
    return lit;
  }
}

/**
 * The main entrypoint: picks a builder, then layers on defaults/nullability.
 */
export function createFieldSchema(
  field: ColumnMetadata,
  isRelation = false,
): ZodTypeAny {
  const key = getTypeKey(field);
  const builder = builders[key] ?? buildStringSchema;
  const rawSchema = builder(field, { isRelation });

  return withDefaults(rawSchema, field, key);
}
