import { expect, test } from '@playwright/test';

test.describe('auth', () => {
  test.use({ storageState: '.auth/signed-out.json' });

  // signing in test are already tested in auth.setup.ts
  // so we can skip them here

  test('Non authed users should be redirected to the sign in page', async ({
    page,
  }) => {
    await page.goto('/');

    await page.waitForURL('/auth/sign-in?next=/');

    await page.goto('/settings/general');

    await expect(page).toHaveURL('/auth/sign-in?next=/settings/general');
  });

  test('Non authed users should be redirected when accessing settings/resources', async ({
    page,
  }) => {
    await page.goto('/settings/resources');

    await page.waitForURL('/auth/sign-in?next=/settings/resources');

    await expect(page).toHaveURL('/auth/sign-in?next=/settings/resources');
  });

  test('Non authed users should be redirected when accessing specific resource pages', async ({
    page,
  }) => {
    await page.goto('/settings/resources/public/users');

    await page.waitForURL(
      '/auth/sign-in?next=/settings/resources/public/users',
    );

    await expect(page).toHaveURL(
      '/auth/sign-in?next=/settings/resources/public/users',
    );
  });

  test('Non authed users should be redirected when accessing other protected settings routes', async ({
    page,
  }) => {
    const protectedRoutes = [
      '/settings/members',
      '/settings/permissions',
      '/settings/authentication',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(`/auth/sign-in?next=${route}`);
      await expect(page).toHaveURL(`/auth/sign-in?next=${route}`);
    }
  });
});
