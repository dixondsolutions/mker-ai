#!/usr/bin/env node
import chalk from 'chalk';
import { Command } from 'commander';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { createSeed } from './create-seed';

const DEFAULT_OUTPUT_PATH =
  '../../apps/app/supabase/seeds/02-supamode-seed.sql';

const program = new Command();

program
  .name('supamode')
  .description('Supamode CLI - Manage your Supabase admin system')
  .version('1.0.0');

program
  .command('generate-seed')
  .description('Generate SQL from seed data')
  .option('-t, --template <file>', 'Seed file template')
  .option('-o, --output <file>', 'Output SQL file', DEFAULT_OUTPUT_PATH)
  .option('-a, --root-account <id>', 'Account ID')
  .action(async (options) => {
    try {
      const template = options.template ?? 'solo';
      console.log(`Generating seed from ${template}...`);

      await createSeedCommand({
        template,
        output: options.output ?? DEFAULT_OUTPUT_PATH,
        rootAccountId: options.rootAccount,
      });
    } catch (error) {
      console.error(chalk.red('Error generating SQL:'));
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();

async function createSeedCommand(options: {
  template: string;
  output: string | undefined;
  rootAccountId: string | undefined;
}) {
  const seed = await createSeed(options.template, {
    rootAccountId: options.rootAccountId,
  });

  const sql = seed.generateSql();

  if (options.output) {
    const outputPath = resolve(options.output);
    const output = sql.join('\n\n');

    writeFileSync(outputPath, output);

    console.log(chalk.green(`✓ SQL generated at ${outputPath}`));
  }
}
