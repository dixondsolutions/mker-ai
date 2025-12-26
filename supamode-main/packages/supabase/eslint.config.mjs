import eslintConfigApps from '@kit/eslint-config/apps.js';
import eslintConfigBase from '@kit/eslint-config/base.js';

export default [
  ...eslintConfigBase,
  ...eslintConfigApps,
  {
    ignores: [
      './src/seed.ts',
      './src/database.types.ts',
      './src/.snaplet',
      './src/drizzle/schema.ts',
    ],
  },
];
