import { expect, test } from '@playwright/test';

import { DataExplorerPageObject } from './data-explorer.po';

test.describe('Data Explorer - Inline Editing', () => {
  test.use({ storageState: '.auth/root.json' });

  let dataExplorer: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    dataExplorer = new DataExplorerPageObject(page);
  });

  test.describe('Edit Button Visibility', () => {
    test('should show edit button on cell hover for editable columns', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      // Wait for data to load and check if cells exist
      await page.waitForSelector('[data-testid^="cell-"]', { timeout: 10000 });

      // Find a cell with editable content (name column)
      const nameCell = page.getByTestId('cell-name').first();
      await expect(nameCell).toBeVisible({ timeout: 10000 });

      // Edit button should be hidden initially
      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      await expect(editButton).toHaveCSS('opacity', '0');

      // Hover over the cell
      await nameCell.hover();

      // Edit button should become visible
      await expect(editButton).toHaveCSS('opacity', '1');
    });

    test('should not show edit button for non-editable columns', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      // Wait for data to load
      await page.waitForSelector('[data-testid^="cell-"]', { timeout: 10000 });

      // Find a cell that should not be editable (like id)
      const idCell = page.getByTestId('cell-id').first();

      if (await idCell.isVisible()) {
        await idCell.hover();

        // Edit button should not exist for non-editable columns
        const editButton = idCell.locator(
          `[data-testid="edit-button"][data-test-column="id"]`,
        );

        await expect(editButton).not.toBeVisible();
      }
    });
  });

  test.describe('Inline Editor Opening', () => {
    test('should open inline editor when edit button is clicked', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      const nameCell = page.getByTestId('cell-name').first();
      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      await editButton.click();

      // Inline editor popover should appear
      const editorPopover = page.locator(
        `[data-testid="inline-editor-popover"][data-test-column="name"]`,
      );

      await expect(editorPopover).toBeVisible();

      // Editor form should be visible
      const editorForm = page.locator(
        `[data-testid="inline-editor-form"][data-test-column="name"]`,
      );

      await expect(editorForm).toBeVisible();

      // Save and cancel buttons should be visible
      const saveButton = page.locator(
        `[data-testid="inline-editor-save"][data-test-column="name"]`,
      );

      const cancelButton = page.locator(
        `[data-testid="inline-editor-cancel"][data-test-column="name"]`,
      );

      await expect(saveButton).toBeVisible();
      await expect(cancelButton).toBeVisible();
    });

    test('should prevent event propagation when clicking edit button', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      const nameCell = page.getByTestId('cell-name').first();
      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      // Click edit button should not navigate to record detail page
      await editButton.click();

      // Should still be on the table page, not the record detail page
      await expect(page).toHaveURL(/\/resources\/public\/categories$/);

      // Editor should be open
      const editorPopover = page.locator(
        `[data-testid="inline-editor-popover"][data-test-column="name"]`,
      );
      await expect(editorPopover).toBeVisible();
    });
  });

  test.describe('Inline Editor Functionality', () => {
    test('should save changes when save button is clicked', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      // Sort by ID to ensure stable ordering - click the ID header
      const idHeader = dataExplorer.getTableHeader('Id');
      await Promise.all([idHeader.click(), dataExplorer.waitForTableLoad()]);

      // Wait for data to load
      await page.waitForSelector('[data-testid^="cell-"]', { timeout: 10000 });

      const nameCell = page.getByTestId('cell-name').first();
      await expect(nameCell).toBeVisible({ timeout: 10000 });

      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      await expect(editButton).toBeEnabled();

      await editButton.click();

      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="name"]`,
      );

      await expect(editorContainer).toBeVisible();

      const input = editorContainer.locator('input').first();

      // Save should be enabled when form is dirty
      const saveButton = page.locator(
        `[data-testid="inline-editor-save"][data-test-column="name"]`,
      );

      // Clear and enter new value
      const newValue = `Updated Name ${Date.now()}`;

      // fill the input
      await input.fill(newValue);

      // wait for the save button to be enabled
      await expect(saveButton).toBeEnabled();

      // Click save button
      await saveButton.click();

      await expect(editorContainer).not.toBeVisible();

      // Cell should show updated value
      await expect(nameCell).toContainText(newValue);
    });

    test('should cancel changes when cancel button is clicked', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      // Sort by ID to ensure stable ordering - click the ID header
      const idHeader = dataExplorer.getTableHeader('Id');
      await idHeader.click();

      await dataExplorer.waitForTableLoad();

      // Wait for data to load
      await page.waitForSelector('[data-testid^="cell-"]');

      const nameCell = page.getByTestId('cell-name').first();
      await expect(nameCell).toBeVisible();

      const originalValue = (await nameCell.textContent()) || '';

      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      await expect(editButton).toBeEnabled();

      await editButton.click();

      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="name"]`,
      );

      const input = editorContainer.locator('input').first();

      // Enter new value but don't save
      await input.fill('This should be cancelled');

      const cancelButton = page.locator(
        `[data-testid="inline-editor-cancel"][data-test-column="name"]`,
      );

      await expect(cancelButton).toBeEnabled();

      await cancelButton.click();

      // Editor should close
      const editorPopover = page.locator(
        `[data-testid="inline-editor-popover"][data-test-column="name"]`,
      );

      await expect(editorPopover).not.toBeVisible();

      // Cell should still show original value
      await expect(
        page.getByText(originalValue, {
          exact: true,
        }),
      ).toBeVisible();
    });

    test('should disable save button when form is not dirty', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      const nameCell = page.getByTestId('cell-name').first();
      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );
      await editButton.click();

      // Save button should be disabled initially (form not dirty)
      const saveButton = page.locator(
        `[data-testid="inline-editor-save"][data-test-column="name"]`,
      );
      await expect(saveButton).toBeDisabled();

      // Make a change
      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="name"]`,
      );

      const input = editorContainer.locator('input').first();

      await input.fill('New value');

      // Save button should be enabled
      await expect(saveButton).toBeEnabled();

      // Revert the change
      await input.fill('');

      const originalValue = await nameCell.textContent();

      if (originalValue) {
        await input.fill(originalValue);
      }

      // Save button should be disabled again
      await expect(saveButton).toBeDisabled();
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for invalid input', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      const nameCell = page.getByTestId('cell-name').first();
      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      await editButton.click();

      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="name"]`,
      );

      const input = editorContainer.locator('input').first();

      // Clear required field
      await input.fill('');

      const saveButton = page.locator(
        `[data-testid="inline-editor-save"][data-test-column="name"]`,
      );

      await saveButton.click();

      // Should show validation error
      const errorMessage = page.locator('[role="alert"]');
      await expect(errorMessage).toBeVisible();
    });

    test('should prevent saving when form has validation errors', async ({
      page,
    }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      const nameCell = page.getByTestId('cell-name').first();
      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      await editButton.click();

      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="name"]`,
      );

      const input = editorContainer.locator('input').first();

      // Enter invalid data (empty string for required field)
      await input.fill('');

      const saveButton = page.locator(
        `[data-testid="inline-editor-save"][data-test-column="name"]`,
      );

      await saveButton.click();

      // Editor should remain open
      const editorPopover = page.locator(
        `[data-testid="inline-editor-popover"][data-test-column="name"]`,
      );

      await expect(editorPopover).toBeVisible();
    });
  });

  test.describe('Different Field Types', () => {
    test('should handle text field inline editing', async ({ page }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      // Sort by ID to ensure stable ordering - click the ID header
      const idHeader = dataExplorer.getTableHeader('Id');
      await idHeader.click();
      await dataExplorer.waitForTableLoad();

      // Wait for data to load
      await page.waitForSelector('[data-testid^="cell-"]', { timeout: 10000 });

      const descriptionCell = page.getByTestId('cell-description').first();

      await descriptionCell.hover();

      const editButton = descriptionCell.locator(
        `[data-testid="edit-button"][data-test-column="description"]`,
      );

      await editButton.click();

      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="description"]`,
      );

      const saveButton = page.locator(
        `[data-testid="inline-editor-save"][data-test-column="description"]`,
      );

      const textarea = editorContainer.locator('input').first();

      const newValue = `Updated description ${Date.now()}`;
      await textarea.fill(newValue);

      await expect(saveButton).toBeEnabled();

      await saveButton.click();

      // Cell should show updated value
      await expect(page.getByTestId('cell-description').first()).toContainText(
        newValue,
      );
    });

    test('should handle boolean field inline editing', async ({ page }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      // Sort by ID to ensure stable ordering - click the ID header
      const idHeader = dataExplorer.getTableHeader('Id');
      await idHeader.click();
      await dataExplorer.waitForTableLoad();

      // Wait for data to load
      await page.waitForSelector('[data-testid^="cell-"]', { timeout: 10000 });

      const activeCell = page.getByTestId('cell-is_active').first();

      const originalValue = await activeCell.textContent();

      await activeCell.hover();

      const editButton = activeCell.locator(
        `[data-testid="edit-button"][data-test-column="is_active"]`,
      );

      await editButton.click();

      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="is_active"]`,
      );

      await expect(editorContainer).toBeVisible();

      const toggle = editorContainer
        .locator('[data-testid="field-switch"]')
        .first();

      await expect(toggle).toBeVisible();

      // Toggle the switch
      await toggle.click();

      const saveButton = page.locator(
        `[data-testid="inline-editor-save"][data-test-column="is_active"]`,
      );

      await Promise.all([
        page.waitForResponse('**/api/**'),
        saveButton.click(),
      ]);

      await expect(editorContainer).not.toBeVisible();

      await expect(activeCell.textContent()).not.toBe(originalValue);
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should save form when Enter is pressed', async ({ page }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      // Sort by ID to ensure stable ordering - click the ID header
      const idHeader = dataExplorer.getTableHeader('Id');
      await idHeader.click();
      await dataExplorer.waitForTableLoad();

      const nameCell = page.getByTestId('cell-name').first();
      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      await editButton.click();

      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="name"]`,
      );

      const input = editorContainer.locator('input').first();

      const newValue = `Updated Name ${Date.now()}`;
      await input.fill(newValue);

      // Press Enter to save
      await Promise.all([
        page.waitForResponse('**/api/**'),
        input.press('Enter'),
      ]);

      // Editor should close
      const editorPopover = page.locator(
        `[data-testid="inline-editor-popover"][data-test-column="name"]`,
      );

      await expect(editorPopover).not.toBeVisible();

      // Cell should show updated value
      await expect(page.getByText(newValue)).toBeVisible();
    });

    test('should cancel form when Escape is pressed', async ({ page }) => {
      await dataExplorer.navigateToTable('public', 'categories');
      await dataExplorer.waitForTableLoad();

      const nameCell = page.getByTestId('cell-name').first();

      await nameCell.hover();

      const editButton = nameCell.locator(
        `[data-testid="edit-button"][data-test-column="name"]`,
      );

      await editButton.click();

      const editorContainer = page.locator(
        `[data-testid="inline-editor-container"][data-test-column="name"]`,
      );

      const input = editorContainer.locator('input').first();

      await input.fill('This should be cancelled');

      // Press Escape to cancel
      await input.press('Escape');

      // Editor should close
      const editorPopover = page.locator(
        `[data-testid="inline-editor-popover"][data-test-column="name"]`,
      );

      await expect(editorPopover).not.toBeVisible();
    });
  });
});
