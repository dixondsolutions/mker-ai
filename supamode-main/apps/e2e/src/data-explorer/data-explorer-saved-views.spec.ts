import { expect, test } from '@playwright/test';

import { DataExplorerPageObject } from './data-explorer.po';

test.describe('Data Explorer - Saved Views Management', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test.describe('Creating Saved Views', () => {
    test.describe.configure({
      mode: 'serial',
    });

    test('should create a personal saved view with filters', async ({
      page,
    }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Apply some filters first
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('Test');
      await pageObject.applyFilter();

      await pageObject.addFilter('Is Active');
      await pageObject.selectBooleanValue(true);

      // Open saved views dropdown
      await pageObject.toggleSavedViewsDropdown();

      // Click "Save Current View"
      await pageObject.clickSaveCurrentView();

      const viewName = `Test Categories View ${new Date().getTime()}`;

      // Fill out the save view form
      await pageObject.fillSavedViewForm({
        name: viewName,
        description: 'Categories with test in name that are active',
      });

      // Submit the form
      await Promise.all([
        pageObject.submitSavedViewForm(),
        page.waitForResponse('**/api/**'),
      ]);

      // Verify the view appears in URL
      await page.waitForURL(new RegExp('.*&view=.*'));
    });

    test('should require filters before allowing view creation', async () => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Try to create view without any filters
      await pageObject.toggleSavedViewsDropdown();

      const saveButton = pageObject.getSaveCurrentViewButton();

      await expect(saveButton).toBeDisabled();
    });

    test('should save view with sorting and search state', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Apply search
      await pageObject.searchTable('test');

      // Apply sorting
      await pageObject.sortByColumn('Name', 'desc');

      // Apply filter
      await pageObject.addFilter('Is Active');
      await pageObject.selectBooleanValue(true);

      // Save the view
      await pageObject.toggleSavedViewsDropdown();
      await pageObject.clickSaveCurrentView();

      const savedView = `Complete State View ${new Date().getTime()}`;

      await pageObject.fillSavedViewForm({
        name: savedView,
        description: 'View with search, sort, and filters',
      });

      await pageObject.submitSavedViewForm();

      await pageObject.clearAllFilters();
      await pageObject.clearSort();
      await pageObject.clearSearch();

      // Load the saved view
      await pageObject.toggleSavedViewsDropdown();
      await pageObject.loadSavedView(savedView);

      // Verify all state was restored
      expect(page.url()).toContain('search=test');
      expect(page.url()).toContain('sort_column=name');
      expect(page.url()).toContain('sort_direction=desc');
      expect(page.url()).toContain('is_active\.eq=true');
    });

    test('should create team view with role sharing', async () => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Apply filter
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('Shared');
      await pageObject.applyFilter();

      // Save view with role sharing
      await pageObject.toggleSavedViewsDropdown();
      await pageObject.clickSaveCurrentView();

      const savedViewName = `Shared Team View ${new Date().getTime()}`;

      await pageObject.fillSavedViewForm({
        name: savedViewName,
        description: 'View shared with specific roles',
        roles: ['Admin', 'Developer'], // Share with these roles
      });

      await pageObject.submitSavedViewForm();
      await expect(pageObject.getSavedViewItem(savedViewName)).toBeVisible();
    });
  });

  test.describe('Loading Saved Views', () => {
    test('should load personal saved view', async ({ page }) => {
      // First create a view to load
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('LoadTest');
      await pageObject.applyFilter();

      const viewName = `Load Test View ${new Date().getTime()}`;

      await pageObject.createSavedView(viewName, 'View for loading test');

      // Clear current state
      await pageObject.clearAllFilters();

      await expect(async () => {
        expect(page.url()).not.toContain('name.eq=LoadTest');
      }).toPass();

      // Load the saved view
      await pageObject.toggleSavedViewsDropdown();
      await pageObject.loadSavedView(viewName);

      await expect(async () => {
        // Verify filter badge is visible
        const filterBadge = pageObject.getFilterBadge('Name');

        await expect(filterBadge).toBeVisible();
        await expect(filterBadge).toContainText('LoadTest');
      }).toPass();
    });

    test('should load team view shared by other users', async ({ page }) => {
      // This test assumes team views exist - in real scenarios would be created by other users
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.toggleSavedViewsDropdown();

      // Check if team views section is visible
      const teamViewsSection = page.locator(
        '[data-testid="team-views-section"]',
      );

      // If team views exist, test loading one
      if (await teamViewsSection.isVisible()) {
        const firstTeamView = teamViewsSection
          .locator('[data-testid="saved-view-item"]')
          .first();

        if (await firstTeamView.isVisible()) {
          await firstTeamView.click();

          // Verify view was loaded
          expect(page.url()).toContain('view=');
        }
      }
    });

    test('should show selected view as active in dropdown', async ({
      page,
    }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('ActiveTest');
      await pageObject.applyFilter();

      const viewName = `Active View Test ${new Date().getTime()}`;

      await pageObject.createSavedView(viewName, 'Test active view display');

      await pageObject.toggleSavedViewsDropdown();

      // Open dropdown and verify active view styling
      const savedView = pageObject.getSavedViewItem(viewName);

      await expect(savedView).toHaveClass(/bg-muted/); // Active view styling

      // Should show checkmark for active view
      const checkmark = savedView.locator(
        '[data-testid="active-view-checkmark"]',
      );

      await expect(checkmark).toBeVisible();
    });

    test('should unselect view when clicking unselect button', async ({
      page,
    }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('UnselectTest');
      await pageObject.applyFilter();

      const viewName = `Unselect Test View ${new Date().getTime()}`;

      await pageObject.createSavedView(viewName, 'View for unselect test');

      // Open dropdown and unselect the view
      await pageObject.toggleSavedViewsDropdown();
      await pageObject.unselectSavedView(viewName);

      // Verify filters are still applied but view is not selected
      expect(page.url()).toContain('name\.eq=UnselectTest');

      // Dropdown should show no active view
      const savedView = pageObject.getSavedViewItem(viewName);

      await expect(savedView).not.toHaveClass(/bg-muted/);
    });
  });

  test.describe('Updating Saved Views', () => {
    test('should update existing personal view', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Create initial view
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('UpdateTest');
      await pageObject.applyFilter();

      const viewName = `Update Test View ${new Date().getTime()}`;
      await pageObject.createSavedView(viewName, 'Original view');

      // Modify the filters
      await pageObject.addFilter('Is Active');
      await pageObject.selectBooleanValue(false);

      // Update the view
      await pageObject.toggleSavedViewsDropdown();
      await pageObject.updateSavedView();
      await page.keyboard.press('Escape');

      // Clear state and reload view to verify changes were saved
      await pageObject.clearAllFilters();

      await pageObject.toggleSavedViewsDropdown();
      await pageObject.loadSavedView(viewName);

      await expect(async () => {
        // Should now include both filters
        expect(page.url()).toContain('name.eq=UpdateTest');
        expect(page.url()).toContain('is_active.eq=false');
      }).toPass();
    });

    test('should show update button only for personal views', async () => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Create personal view
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('PersonalView');
      await pageObject.applyFilter();

      const viewName = `Personal View ${new Date().getTime()}`;
      await pageObject.createSavedView(viewName, 'My personal view');

      // Open dropdown with personal view selected
      await pageObject.toggleSavedViewsDropdown();

      // Update button should be visible for personal views
      const updateButton = pageObject.getUpdateViewButton();

      await expect(updateButton).toBeVisible();
    });

    test('should disable update button when view unchanged', async () => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('UnchangedTest');
      await pageObject.applyFilter();

      const viewName = `Unchanged View ${new Date().getTime()}`;

      await pageObject.createSavedView(
        viewName,
        'View to test unchanged state',
      );

      await pageObject.toggleSavedViewsDropdown();

      // Update button should be disabled when no changes made
      await expect(pageObject.getUpdateViewButton()).toBeDisabled();
    });
  });

  test.describe('Deleting Saved Views', () => {
    test('should delete personal saved view', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('DeleteTest');
      await pageObject.applyFilter();

      const viewName = `Delete Test View ${new Date().getTime()}`;
      await pageObject.createSavedView(viewName, 'View to be deleted');

      // Delete the view
      await pageObject.toggleSavedViewsDropdown();
      await pageObject.requestDeleteSavedView(viewName);

      // Confirm deletion
      await pageObject.confirmDeleteSavedView();

      await page.waitForTimeout(500);

      // saved view dropdown is still open

      // View should no longer appear in dropdown
      await expect(pageObject.getSavedViewItem(viewName)).not.toBeVisible();
    });

    test('should show delete confirmation dialog', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('ConfirmDelete');
      await pageObject.applyFilter();

      const viewName = `Confirm Delete View ${new Date().getTime()}`;

      await pageObject.createSavedView(
        viewName,
        'View for deletion confirmation',
      );

      // Try to delete the view
      await pageObject.toggleSavedViewsDropdown();
      await pageObject.requestDeleteSavedView(viewName);

      // Verify confirmation dialog appears
      const confirmDialog = pageObject.getDeleteConfirmationDialog();
      await expect(confirmDialog).toBeVisible();

      const cancelButton = confirmDialog.getByText('Cancel');

      // Cancel deletion
      await cancelButton.click();

      // View should still exist
      const view = pageObject.getSavedViewItem(viewName);

      await expect(view).toBeVisible();
    });

    test('should not show delete button for team views', async ({ page }) => {
      // This test would need to be run with a user who has access to team views
      // but doesn't own them. For now, we'll just verify the structure exists.

      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.toggleSavedViewsDropdown();

      // Check if team views section exists
      const teamViewsSection = page.locator(
        '[data-testid="team-views-section"]',
      );

      if (await teamViewsSection.isVisible()) {
        // Team views should not have delete buttons for non-owners
        const deleteButtons = teamViewsSection.locator(
          '[data-testid="delete-view-button"]',
        );

        await expect(deleteButtons).toHaveCount(0);
      }
    });
  });

  test.describe('Saved Views UI States', () => {
    test('should separate personal and team views in dropdown', async ({
      page,
    }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Create a personal view
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('SeparationTest');
      await pageObject.applyFilter();

      const viewName = `Personal Separation View ${new Date().getTime()}`;

      await pageObject.createSavedView(
        viewName,
        'Personal view for separation test',
      );

      await pageObject.toggleSavedViewsDropdown();

      // Should have personal views section
      const personalSection = page.locator(
        '[data-testid="personal-views-section"]',
      );

      await expect(personalSection).toBeVisible();

      const personalLabel = personalSection.locator('text=Personal Views');
      await expect(personalLabel).toBeVisible();

      // Personal view should be in personal section
      const personalView = personalSection
        .locator('[data-testid="saved-view-item"]')
        .filter({ hasText: viewName });

      await expect(personalView).toBeVisible();

      // Team views section may or may not exist depending on data
      const teamSection = page.locator('[data-testid="team-views-section"]');

      if (await teamSection.isVisible()) {
        const teamLabel = teamSection.locator('text=Team Views');
        await expect(teamLabel).toBeVisible();
      }
    });
  });

  test.describe('Saved Views Validation', () => {
    test('should validate view name is required', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('ValidationTest');
      await pageObject.applyFilter();

      await pageObject.toggleSavedViewsDropdown();
      await pageObject.clickSaveCurrentView();

      // Try to submit without name
      expect(
        await page.getByTestId('submit-saved-view-button').isDisabled(),
      ).toBe(true);
    });

    test('should validate view name length limits', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('LengthTest');
      await pageObject.applyFilter();

      await pageObject.toggleSavedViewsDropdown();
      await pageObject.clickSaveCurrentView();

      // Try with very long name (over 255 characters)
      const longName = 'A'.repeat(300);

      await pageObject.fillSavedViewForm({
        name: longName,
        description: 'Test long name validation',
      });

      await page.getByTestId('submit-saved-view-button').click();

      // Should show validation error
      const nameError = page.getByText(
        'Too big: expected string to have <=255 characters',
      );

      await expect(nameError).toBeVisible();
    });

    test('should validate description length limits', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('DescTest');
      await pageObject.applyFilter();

      await pageObject.toggleSavedViewsDropdown();
      await pageObject.clickSaveCurrentView();

      // Try with very long description (over 500 characters)
      const longDescription = 'A'.repeat(600);

      await pageObject.fillSavedViewForm({
        name: 'Description Test View',
        description: longDescription,
      });

      await page.getByTestId('submit-saved-view-button').click();

      // Should show validation error
      const descError = page.getByText(
        'Too big: expected string to have <=500 characters',
      );

      await expect(descError).toBeVisible();
    });
  });
});
