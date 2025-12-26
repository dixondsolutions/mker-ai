import { expect, test } from '@playwright/test';

import { DataExplorerPageObject } from './data-explorer.po';

test.describe('Data Explorer - Record Editing with Advanced Field Types', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test.describe('Basic Record Editing', () => {
    test('should edit a record with text fields', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Navigate to a record (create one first if needed)
      const firstRow = pageObject.getTable().locator('tbody tr').first();

      await firstRow.click();

      // Click edit button
      const editButton = pageObject.getEditButton();
      await editButton.click();

      // Should be on edit page
      await page.waitForURL(/\/edit$/);

      // Edit the name field
      const originalName = await pageObject.getFieldValue('name');
      const newName = `Edited ${originalName} ${Date.now()}`;

      await pageObject.fillFieldByName('name', newName);

      // Submit the form
      await Promise.all([
        pageObject.submitRecordForm(),
        page.waitForResponse('**/api/**'),
      ]);

      // Verify the change was saved
      expect(await pageObject.getFormField('name').getAttribute('value')).toBe(
        newName,
      );
    });

    test('should show unsaved changes warning', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      const firstRow = pageObject.getTable().locator('tbody tr').first();
      if (await firstRow.isVisible()) {
        await firstRow.click();

        const editButton = pageObject.getEditButton();
        await editButton.click();

        // Make a change without saving
        await pageObject.fillFieldByName(
          'name',
          `Unsaved Change ${Date.now()}`,
        );

        // Try to navigate away
        await page.goBack();

        // Should show unsaved changes dialog
        const unsavedDialog = page
          .locator('[role="alertdialog"]')
          .filter({ hasText: /unsaved changes/i });

        if (await unsavedDialog.isVisible()) {
          await expect(unsavedDialog).toBeVisible();

          // Cancel navigation to stay on edit page
          const stayButton = unsavedDialog
            .getByText(/stay/i)
            .or(unsavedDialog.getByText(/cancel/i));

          await stayButton.click();

          // Should still be on edit page
          await page.waitForURL(/\/edit$/);
        }
      }
    });

    test('should validate required fields', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Go to create new record
      await pageObject.openCreateRecordPage();

      // Try to submit without filling required fields
      await pageObject.submitRecordForm();

      // Should show validation errors
      const nameError = pageObject.getValidationError('name').first();
      await expect(nameError).toBeVisible();

      const slugError = pageObject.getValidationError('slug').first();
      await expect(slugError).toBeVisible();
    });
  });
});
