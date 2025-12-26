import { test } from '@playwright/test';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { cwd } from 'node:process';

import { AuthPageObject } from '../auth/auth.po';

const rootAuthFile = join(cwd(), '.auth/root.json');
const readonlyAuthFile = join(cwd(), '.auth/readonly.json');
const signedOutAuthFile = join(cwd(), '.auth/signed-out.json');

test('setup db', async () => {
  await setupDb();
});

test('authenticate as root', async ({ page }) => {
  const auth = new AuthPageObject(page);

  await auth.loginAsRootUser();

  await page.context().storageState({ path: rootAuthFile });
});

test('authenticate as readonly user', async ({ page }) => {
  const auth = new AuthPageObject(page);

  await auth.loginAsReadonlyUser();

  await page.context().storageState({ path: readonlyAuthFile });
});

test('signOut', async ({ page }) => {
  await page.context().clearCookies();
  await page.context().storageState({ path: signedOutAuthFile });
});

/**
 * @name setupDb
 * @description Setup the database for the e2e tests
 * @returns A promise that resolves when the database is setup
 */
export async function setupDb() {
  const child = spawn('pnpm', ['--filter', '@kit/supabase', 'demo:setup'], {
    stdio: 'inherit',
  });

  // wait for the child process to exit
  await new Promise((resolve, reject) => {
    child.on('close', (code) => {
      console.log('Child process exited with code:', code);

      if (code !== 0) {
        reject(new Error('Failed to setup database'));
      }

      resolve(true);
    });
  });
}
