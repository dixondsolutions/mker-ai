import { expect, test } from '@playwright/test';

import { GeneralSettingsPageObject } from './general-settings.po';

// Example locales and timezones for testing
const TEST_LOCALE = 'en';
const timezones = Intl.supportedValuesOf('timeZone');

test.describe('General Settings Form', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: GeneralSettingsPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new GeneralSettingsPageObject(page);

    await pageObject.goto();
  });

  test('should load with initial values', async () => {
    await expect(pageObject.getLanguageSelectorTrigger()).toBeVisible();
    await expect(pageObject.getTimezoneSelectorTrigger()).toBeVisible();

    await pageObject.selectLanguage(TEST_LOCALE);

    await expect(pageObject.getLanguageSelectorTrigger()).toBeVisible();
  });

  test('should submit the form', async ({ page }) => {
    // the form is not dirty yet
    await expect(pageObject.getSubmitButton()).toBeDisabled();

    const randomTimezone =
      timezones[Math.floor(Math.random() * timezones.length)];

    await pageObject.selectLanguage(TEST_LOCALE);
    await pageObject.selectTimezone(randomTimezone!);

    await expect(pageObject.getSubmitButton()).toBeEnabled();

    // submit the form and wait for the response
    await Promise.all([
      pageObject.submit(),
      page.waitForResponse(
        (response) => {
          return (
            response.url().includes('api/v1/account/preferences') &&
            response.status() === 200
          );
        },
        {
          timeout: 1000,
        },
      ),
    ]);

    // on refresh, the form should be populated with the saved values
    await page.reload();

    await expect(pageObject.getLanguageSelectorTrigger()).toContainText(
      'English',
    );

    await expect(pageObject.getTimezoneSelectorTrigger()).toContainText(
      randomTimezone!,
    );
  });
});
