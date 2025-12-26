import { defineConfig } from 'tsup';

export default defineConfig((options) => {
  return {
    entryPoints: ['./app/vercel.ts'],
    outDir: 'api',
    minify: !options.watch,
    splitting: false,
  };
});
