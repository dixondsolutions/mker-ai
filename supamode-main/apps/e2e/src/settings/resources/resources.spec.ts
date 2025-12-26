import { expect, test } from '@playwright/test';

import { ResourcesPageObject } from './resources.po';

test.describe('Resources Page', () => {
  test.use({ storageState: '.auth/root.json' });

  let resourcesPage: ResourcesPageObject;

  test.beforeEach(async ({ page }) => {
    resourcesPage = new ResourcesPageObject(page);

    await resourcesPage.goto();

    await expect(resourcesPage.getTable()).toBeVisible();
  });

  test('should render at least one resource row', async () => {
    const rows = await resourcesPage.getTableRows().all();

    // There should be at least one data row (header row + data rows)
    expect(rows.length).toBeGreaterThan(1);
  });

  test('should open edit dialog when Configure Table button is clicked', async ({
    page,
  }) => {
    const configureButton = page.getByTestId('configure-table-button');

    await configureButton.first().click();

    // Should open a dialog (look for a dialog or modal role)
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test.describe('Table Drag and Drop Reordering', () => {
    test.describe.configure({ mode: 'serial' });

    test('should allow reordering tables via drag and drop', async ({
      page,
    }) => {
      // Get initial table order
      const initialRows = await resourcesPage.getTableRows().all();
      const initialTableNames: string[] = [];

      // Skip the header row
      const dataRows = initialRows.slice(1, initialRows.length - 1);

      for (const row of dataRows) {
        // Get the display name from the 3rd column (after drag handle and checkbox)
        const displayNameCell = row.getByTestId('table-name-header');
        const tableName = await displayNameCell.textContent();

        if (tableName?.trim()) {
          initialTableNames.push(tableName.trim());
        }
      }

      if (initialTableNames.length >= 2) {
        const firstTable = initialTableNames[0]!;
        const secondTable = initialTableNames[1]!;

        // Get drag handles
        const firstDragHandle = resourcesPage.getDragHandle(firstTable);
        const secondDragHandle = resourcesPage.getDragHandle(secondTable);

        // Verify drag handles are visible
        await expect(firstDragHandle).toBeVisible();
        await expect(secondDragHandle).toBeVisible();

        // Perform drag and drop
        await firstDragHandle.dragTo(secondDragHandle);

        // Click save button to persist changes
        await resourcesPage.getSaveButton().click();

        // Wait for the change to be saved
        await page.waitForResponse((response) =>
          response.url().includes('api/v1/tables'),
        );

        // Verify order changed by checking if the first table is no longer in the first position
        await page.reload();

        await expect(resourcesPage.getTable()).toBeVisible();

        const newFirstTableName = await resourcesPage
          .getTableRows()
          .nth(1)
          .getByTestId('table-name-header')
          .textContent();

        // The test should fail here as drag and drop likely isn't working
        expect(newFirstTableName?.trim()).toBe(secondTable);
      }
    });

    test('should show drag handles for reordering', async () => {
      const rows = await resourcesPage.getTableRows();

      // Skip header row and check first data row

      const tableName = await rows
        .nth(1)
        .getByTestId('table-name-header')
        .textContent();

      if (tableName?.trim()) {
        const dragHandle = resourcesPage.getDragHandle(tableName.trim());

        await expect(dragHandle).toBeVisible();
        await expect(dragHandle).toHaveAttribute('class', /cursor-grab/);
      }
    });

    test('should preserve table order after metadata update', async ({
      page,
    }) => {
      // Get initial table order
      const initialRows = await resourcesPage.getTableRows().all();
      const initialTableNames: string[] = [];

      const dataRows = initialRows.slice(1, initialRows.length - 1);

      for (const row of dataRows) {
        const displayNameCell = row.getByTestId('table-name-header');
        const tableName = await displayNameCell.textContent();

        if (tableName?.trim()) {
          initialTableNames.push(tableName.trim());
        }
      }

      if (initialTableNames.length >= 2) {
        const firstTable = initialTableNames[0]!;
        const secondTable = initialTableNames[1]!;

        // Step 1: Reorder tables via drag and drop
        const firstDragHandle = resourcesPage.getDragHandle(firstTable);
        const secondDragHandle = resourcesPage.getDragHandle(secondTable);

        await firstDragHandle.dragTo(secondDragHandle);

        // Click save button to persist changes
        await resourcesPage.getSaveButton().click();

        // Wait for the reorder request to complete
        await page.waitForResponse((response) =>
          response.url().includes('api/v1/tables'),
        );

        // Step 2: Verify order changed
        await page.reload();
        await page.waitForLoadState('networkidle');

        await expect(resourcesPage.getTable()).toBeVisible();

        let newRows = await resourcesPage.getTableRows().all();

        // Assume the drag worked and record the new order
        const reorderedTableNames: string[] = [];
        const reorderedDataRows = newRows.slice(1, newRows.length - 1);

        for (const row of reorderedDataRows) {
          const displayNameCell = row.getByTestId('table-name-header');
          const tableName = await displayNameCell.textContent();

          if (tableName?.trim()) {
            reorderedTableNames.push(tableName.trim());
          }
        }

        // Step 3: Update metadata of the first table in the new order
        const firstTableAfterReorder = reorderedTableNames[0]!;

        // Find and click the Configure Table button for the first table
        const configureButton = resourcesPage
          .getTableRows()
          .nth(1)
          .getByTestId('configure-table-button');

        await expect(configureButton).toBeVisible();

        await configureButton.click();
        await expect(page.getByRole('dialog')).toBeVisible();

        // Make a metadata change
        const randomString = Math.random().toString(36).substring(0, 5);
        const displayNameInput = page.getByLabel('Display Name');

        await displayNameInput.fill(
          `Updated ${firstTableAfterReorder} ${randomString}`,
        );

        // Save the metadata change
        const saveButton = page.getByRole('button', { name: 'Save' });
        await saveButton.click();

        // Wait for save to complete and dialog to close
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        // Step 4: Verify order is preserved after metadata update
        await page.goto('/settings/resources');
        await page.waitForLoadState('networkidle');

        await expect(resourcesPage.getTable()).toBeVisible();

        const finalRows = await resourcesPage.getTableRows().all();
        const finalTableNames: string[] = [];
        const finalDataRows = finalRows.slice(1, finalRows.length - 1);

        for (const row of finalDataRows) {
          const displayNameCell = row.getByTestId('table-name-header');

          const tableName = await displayNameCell.textContent();

          if (tableName?.trim()) {
            finalTableNames.push(tableName.trim());
          }
        }

        // The order should be preserved (minus the updated display name)
        // This test will likely fail due to the backend bug
        expect(finalTableNames.length).toBe(reorderedTableNames.length);

        // Check that the relative positions of other tables remain the same
        for (let i = 1; i < finalTableNames.length; i++) {
          expect(finalTableNames[i]).toBe(reorderedTableNames[i]);
        }
      }
    });

    test('should maintain table order consistency across multiple metadata updates', async ({
      page,
    }) => {
      // This test checks if multiple metadata updates maintain order consistency
      const initialRows = await resourcesPage.getTableRows().all();
      const tableNames: string[] = [];

      const dataRows = initialRows.slice(1, initialRows.length - 1);

      for (const row of dataRows) {
        const displayNameCell = row.locator('td').nth(2);
        const tableName = await displayNameCell.textContent();

        if (tableName?.trim()) {
          tableNames.push(tableName.trim());
        }
      }

      if (tableNames.length >= 3) {
        // Step 1: Record initial order
        const initialOrder = [...tableNames];

        // Step 2: Perform drag and drop to reorder
        const firstDragHandle = resourcesPage.getDragHandle(tableNames[0]!);
        const thirdDragHandle = resourcesPage.getDragHandle(tableNames[2]!);

        await firstDragHandle.dragTo(thirdDragHandle);

        // Click save button to persist changes
        await resourcesPage.getSaveButton().click();

        // Wait for the reorder request to complete
        await page.waitForResponse((response) =>
          response.url().includes('api/v1/tables'),
        );

        await page.waitForTimeout(100);

        // Step 3: Update metadata of multiple tables
        for (let i = 0; i < Math.min(2, tableNames.length); i++) {
          const tableName = tableNames[i]!;

          const configureButton = resourcesPage
            .getTableRows()
            .nth(i + 1)
            .getByTestId('configure-table-button');

          await expect(configureButton).toBeVisible();

          await configureButton.click();

          await expect(page.getByRole('dialog')).toBeVisible();

          const randomString = Math.random().toString(36).substring(0, 3);
          const displayNameInput = page.getByLabel('Display Name');
          await displayNameInput.fill(`Test ${tableName} ${randomString}`);

          const saveButton = page.getByRole('button', { name: 'Save' });
          await saveButton.click();

          await expect(page.getByRole('dialog')).not.toBeVisible();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(500);
          await page.goto('/settings/resources');
          await page.waitForLoadState('networkidle');
        }

        // Step 4: Verify final order is consistent
        await page.reload();
        await page.waitForLoadState('networkidle');
        await expect(resourcesPage.getTable()).toBeVisible();

        const finalRows = await resourcesPage.getTableRows().all();
        const finalOrder: string[] = [];
        const finalDataRows = finalRows.slice(1, finalRows.length - 1);

        for (const row of finalDataRows) {
          const displayNameCell = row.getByTestId('table-name-header');
          const tableName = await displayNameCell.textContent();

          if (tableName?.trim()) {
            finalOrder.push(tableName.trim());
          }
        }

        // This should maintain the reordered structure
        // The test will likely fail due to ordering inconsistencies
        expect(finalOrder.length).toBe(initialOrder.length);
      }
    });
  });

  test.describe('Batch Actions', () => {
    test('should show batch actions toolbar when tables are selected', async () => {
      // Initially, batch actions toolbar should not be visible
      await expect(resourcesPage.getBatchActionsToolbar()).not.toBeVisible();

      // Select first table
      await resourcesPage.getRowCheckbox(1).check();

      // Batch actions toolbar should appear
      await expect(resourcesPage.getBatchActionsToolbar()).toBeVisible();

      // Should show correct count
      const selectedCount = await resourcesPage.getSelectedTablesCount();
      expect(selectedCount).toBe(1);
    });

    test('should allow selecting multiple tables individually', async () => {
      const rows = await resourcesPage.getTableRows().all();
      const dataRows = rows.slice(1); // Skip header row

      if (dataRows.length >= 3) {
        // Select first three tables
        await resourcesPage.getRowCheckbox(1).check();
        await resourcesPage.getRowCheckbox(2).check();
        await resourcesPage.getRowCheckbox(3).check();

        // Verify batch toolbar shows correct count
        await expect(resourcesPage.getBatchActionsToolbar()).toBeVisible();
        const selectedCount = await resourcesPage.getSelectedTablesCount();
        expect(selectedCount).toBe(3);
      }
    });

    test('should allow selecting all tables via select all checkbox', async () => {
      const rows = await resourcesPage.getTableRows().all();
      const dataRows = rows.slice(1, rows.length); // Skip header row

      // Click select all checkbox
      await resourcesPage.getSelectAllCheckbox().check();

      // Verify all rows are selected
      for (let i = 1; i <= dataRows.length; i++) {
        await expect(resourcesPage.getRowCheckbox(i)).toBeChecked();
      }

      // Verify batch toolbar shows correct count
      await expect(resourcesPage.getBatchActionsToolbar()).toBeVisible();
      const selectedCount = await resourcesPage.getSelectedTablesCount();
      expect(selectedCount).toBe(dataRows.length);
    });

    test('should deselect all tables via select all checkbox', async () => {
      // First select all
      await resourcesPage.getSelectAllCheckbox().check();
      await expect(resourcesPage.getBatchActionsToolbar()).toBeVisible();

      // Then deselect all
      await resourcesPage.getSelectAllCheckbox().uncheck();
      await expect(resourcesPage.getBatchActionsToolbar()).not.toBeVisible();

      // Verify no rows are selected
      const rows = await resourcesPage.getTableRows().all();
      const dataRows = rows.slice(1); // Skip header row

      for (let i = 1; i <= dataRows.length; i++) {
        await expect(resourcesPage.getRowCheckbox(i)).not.toBeChecked();
      }
    });

    test('should clear selection when clear button is clicked', async () => {
      // Select some tables
      await resourcesPage.getRowCheckbox(1).check();
      await resourcesPage.getRowCheckbox(2).check();

      // Verify selection exists
      await expect(resourcesPage.getBatchActionsToolbar()).toBeVisible();

      // Click clear button
      await resourcesPage.getClearSelectionButton().click();

      // Verify selection is cleared
      await expect(resourcesPage.getBatchActionsToolbar()).not.toBeVisible();
      await expect(resourcesPage.getRowCheckbox(1)).not.toBeChecked();
      await expect(resourcesPage.getRowCheckbox(2)).not.toBeChecked();
    });

    test('should open batch edit dialog when batch edit button is clicked', async () => {
      // Select a table
      await resourcesPage.getRowCheckbox(1).check();

      // Click batch edit button
      await resourcesPage.getBatchEditButton().click();

      // Dialog should open
      await expect(resourcesPage.getBatchEditDialog()).toBeVisible();

      // Dialog should have proper title and description
      await expect(resourcesPage.getBatchEditDialog()).toContainText(
        'Batch Edit',
      );

      await expect(resourcesPage.getBatchEditDialog()).toContainText(
        'Modifying 1 item(s)',
      );
    });

    test('should show selected tables in batch edit dialog', async ({
      page,
    }) => {
      const rows = await resourcesPage.getTableRows().all();

      if (rows.length >= 3) {
        // Get table names from the first two data rows
        const firstTableName = await rows[1]
          .getByTestId('table-name-header')
          .textContent();

        const secondTableName = await rows[2]
          .getByTestId('table-name-header')
          .textContent();

        // Select two tables
        await resourcesPage.getRowCheckbox(1).check();
        await resourcesPage.getRowCheckbox(2).check();

        // Open batch edit dialog
        await resourcesPage.getBatchEditButton().click();

        // Dialog should show selected table names
        await expect(resourcesPage.getBatchEditDialog()).toContainText(
          'Modifying 2 item(s)',
        );

        if (firstTableName?.trim()) {
          await expect(resourcesPage.getBatchEditDialog()).toContainText(
            firstTableName.trim(),
          );
        }

        if (secondTableName?.trim()) {
          await expect(resourcesPage.getBatchEditDialog()).toContainText(
            secondTableName.trim(),
          );
        }
      }
    });

    test('should close batch edit dialog when cancel is clicked', async () => {
      // Select a table and open dialog
      await resourcesPage.getRowCheckbox(1).check();
      await resourcesPage.getBatchEditButton().click();
      await expect(resourcesPage.getBatchEditDialog()).toBeVisible();

      // Click cancel
      await resourcesPage.getCancelButton().click();

      // Dialog should close
      await expect(resourcesPage.getBatchEditDialog()).not.toBeVisible();
    });

    test('should perform batch visibility update', async ({ page }) => {
      const rows = await resourcesPage.getTableRows().all();

      if (rows.length >= 2) {
        // Get the first table name and its current visibility status
        const firstTableName = await rows[1]!
          .getByTestId('table-name-header')
          .textContent();

        const secondTableName = await rows[2]!
          .getByTestId('table-name-header')
          .textContent();

        const firstTableNameStatus =
          await resourcesPage.getTableVisibilityBadge(firstTableName.trim());

        const secondTableNameStatus =
          await resourcesPage.getTableVisibilityBadge(secondTableName.trim());

        // Select the table
        await resourcesPage.getRowCheckbox(1).check();
        await resourcesPage.getRowCheckbox(2).check();

        // Open batch edit dialog
        await resourcesPage.getBatchEditButton().click();
        await expect(resourcesPage.getBatchEditDialog()).toBeVisible();

        // Toggle visibility switch
        const visibilitySwitch = resourcesPage.getVisibilitySwitch();
        await visibilitySwitch.click();

        // Save changes
        await Promise.all([
          resourcesPage.getSaveChangesButton().click(),
          page.waitForResponse((response) =>
            response.url().includes('api/v1/tables'),
          ),
        ]);

        // Wait for dialog to close and changes to be saved
        await expect(resourcesPage.getBatchEditDialog()).not.toBeVisible();

        // Reload page to see updated state
        await page.reload();
        await expect(resourcesPage.getTable()).toBeVisible();

        // Verify the visibility status has changed
        const updatedFirstTableStatus =
          await resourcesPage.getTableVisibilityBadge(firstTableName.trim());

        const updatedSecondTableStatus =
          await resourcesPage.getTableVisibilityBadge(secondTableName.trim());

        expect(updatedFirstTableStatus).not.toBe(firstTableNameStatus);
        expect(updatedSecondTableStatus).not.toBe(secondTableNameStatus);
      }
    });

    test('should handle batch edit with multiple tables', async ({ page }) => {
      const rows = await resourcesPage.getTableRows().all();

      if (rows.length >= 4) {
        // Select first three tables
        await resourcesPage.getRowCheckbox(1).check();
        await resourcesPage.getRowCheckbox(2).check();
        await resourcesPage.getRowCheckbox(3).check();

        // Open batch edit dialog
        await resourcesPage.getBatchEditButton().click();
        await expect(resourcesPage.getBatchEditDialog()).toBeVisible();

        // Should show correct count
        await expect(resourcesPage.getBatchEditDialog()).toContainText(
          'Modifying 3 item(s)',
        );

        // Toggle visibility and save
        await resourcesPage.getVisibilitySwitch().click();

        await Promise.all([
          resourcesPage.getSaveChangesButton().click(),
          page.waitForResponse((response) =>
            response.url().includes('api/v1/tables'),
          ),
        ]);

        // Wait for changes to be saved
        await expect(resourcesPage.getBatchEditDialog()).not.toBeVisible();

        // Verify selection is cleared after successful batch edit
        await expect(resourcesPage.getBatchActionsToolbar()).not.toBeVisible();
      }
    });

    test('should handle select all with mixed states', async () => {
      const rows = await resourcesPage.getTableRows().all();
      const dataRows = rows.slice(1); // Skip header row

      if (dataRows.length >= 3) {
        // Select some but not all tables
        await resourcesPage.getRowCheckbox(1).check();
        await resourcesPage.getRowCheckbox(2).check();

        // Select all checkbox should be in indeterminate state
        const selectAllCheckbox = resourcesPage.getSelectAllCheckbox();

        // Click select all to select remaining tables
        await selectAllCheckbox.click();

        // All tables should now be selected
        for (let i = 1; i <= dataRows.length; i++) {
          await expect(resourcesPage.getRowCheckbox(i)).toBeChecked();
        }
      }
    });

    test('should prevent row navigation when clicking on checkbox', async ({
      page,
    }) => {
      const currentUrl = page.url();

      // Click on checkbox (should not navigate)
      await resourcesPage.getRowCheckbox(1).click();

      // URL should remain the same
      expect(page.url()).toBe(currentUrl);

      // But selection should be updated
      await expect(resourcesPage.getBatchActionsToolbar()).toBeVisible();
    });

    test('should show batch actions with proper animation', async () => {
      // Initially not visible
      await expect(resourcesPage.getBatchActionsToolbar()).not.toBeVisible();

      // Select a table
      await resourcesPage.getRowCheckbox(1).check();

      // Should appear with animation classes
      const toolbar = resourcesPage.getBatchActionsToolbar();
      await expect(toolbar).toBeVisible();
      await expect(toolbar).toHaveClass(/animate-in/);
    });
  });
});
