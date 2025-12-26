import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './src/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    // This will use local development DB by default
    url:
      process.env['DATABASE_URL'] ??
      'postgresql://postgres:postgres@127.0.0.1:54332/postgres',
  },
  schemaFilter: ['supamode'],
  verbose: true,
  strict: true,
});
