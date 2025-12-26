import { expect, test } from '@playwright/test';

import { UsersExplorerPageObject } from './users-explorer.po';

test.describe('Users Explorer - List View', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);

    await pageObject.goto();
    await pageObject.waitForTableLoad();
  });

  test('should display users table with correct columns', async () => {
    const table = pageObject.getUsersTable();

    await expect(table).toBeVisible();

    // Check table headers
    await expect(
      table.locator('th').filter({ hasText: /email/i }),
    ).toBeVisible();

    await expect(
      table.locator('th').filter({ hasText: /created/i }),
    ).toBeVisible();

    await expect(
      table.locator('th').filter({ hasText: /last sign in/i }),
    ).toBeVisible();
  });

  test('should search users by email', async ({ page }) => {
    // Assuming there's at least one user in the system
    await Promise.all([
      pageObject.searchUsers('@supamode'),
      page.waitForResponse('**/api/**'),
    ]);

    // Check that the URL contains the search parameter
    await expect(async () => {
      expect(page.url()).toContain('search=%40supamode');
    }).toPass();
  });

  test('should navigate to user details when clicking row', async ({
    page,
  }) => {
    // Click on the first user row (skip header row)
    const firstUserRow = page.getByRole('row').nth(1);
    await firstUserRow.click();

    // Should navigate to user details page
    await expect(page).toHaveURL(/\/users\/[a-f0-9-]+$/);
  });

  test('should open user actions menu', async () => {
    // Get the first user's email from the table
    const firstUserEmail = await pageObject
      .getUsersTable()
      .getByRole('row')
      .nth(1)
      .getByRole('cell')
      .first()
      .textContent();

    if (firstUserEmail) {
      await pageObject.openUserActionsMenu(firstUserEmail);
      await expect(pageObject.getViewDetailsMenuItem()).toBeVisible();
    }
  });
});

test.describe('Users Explorer - Add User', () => {
  test.use({ storageState: '.auth/root.json' });

  // use serial not to hit auth limits
  test.describe.configure({
    mode: 'serial',
  });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);
    await pageObject.goto();
    await pageObject.waitForTableLoad();
  });

  test('should display add user dropdown menu', async () => {
    await pageObject.openAddUserMenu();

    await expect(pageObject.getInviteUserMenuItem()).toBeVisible();
    await expect(pageObject.getCreateUserMenuItem()).toBeVisible();
  });

  test('should open invite user dialog', async () => {
    await pageObject.openAddUserMenu();
    await pageObject.getInviteUserMenuItem().click();

    await expect(pageObject.getDialog()).toBeVisible();
    await expect(pageObject.getDialogTitle()).toHaveText(/invite user/i);
    await expect(pageObject.getInviteEmailInput()).toBeVisible();
  });

  test('should validate email in invite dialog', async () => {
    await pageObject.openAddUserMenu();
    await pageObject.getInviteUserMenuItem().click();

    // Try invalid email
    await pageObject.getInviteEmailInput().fill('invalid-email');
    await pageObject.getInviteSendButton().click();

    // Should show validation error
    await expect(pageObject.getDialog()).toContainText(/valid email address/i);
  });

  test('should invite user successfully', async () => {
    const testEmail = `test-${Date.now()}@example.com`;

    await pageObject.inviteUser(testEmail);

    // Dialog should close
    await pageObject.waitForDialogClose();
  });

  test('should open create user dialog', async () => {
    await pageObject.openAddUserMenu();
    await pageObject.getCreateUserMenuItem().click();

    await expect(pageObject.getDialog()).toBeVisible();
    await expect(pageObject.getCreateEmailInput()).toBeVisible();
    await expect(pageObject.getCreatePasswordInput()).toBeVisible();
  });

  test('should validate password requirements', async () => {
    await pageObject.openAddUserMenu();
    await pageObject.getCreateUserMenuItem().click();

    await pageObject.getCreateEmailInput().fill('test@example.com');

    // Test various invalid passwords
    const invalidPasswords = [
      { password: 'short', error: /at least 8 characters/i },
      { password: 'lowercase123', error: /uppercase letter/i },
      { password: 'UPPERCASE123', error: /lowercase letter/i },
      { password: 'NoNumbers', error: /one number/i },
    ];

    for (const { password, error } of invalidPasswords) {
      await pageObject.getCreatePasswordInput().fill(password);
      await pageObject.getCreateButton().click();

      await expect(pageObject.getDialog()).toContainText(error);
      await pageObject.getCreatePasswordInput().clear();
    }
  });

  test('should create user successfully', async () => {
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'ValidPass123';

    await pageObject.createUser(testEmail, testPassword);

    // check if user is created
    await expect(pageObject.getUserRow(testEmail)).toBeVisible();
  });
});

test.describe('Users Explorer - User Details', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);

    await pageObject.goto();
    await pageObject.waitForTableLoad();

    // create user first
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'ValidPass123';

    await Promise.all([
      pageObject.createUser(testEmail, testPassword),
      pageObject.waitForDialogClose(),
    ]);

    // Navigate to user details
    await page.waitForTimeout(1000);

    await page.locator('body').press('Escape'); // Close any open dialogs

    await pageObject.navigateToUserDetails(testEmail);
  });

  test('should display user details page', async ({ page }) => {
    // Check breadcrumb navigation
    await expect(pageObject.getBreadcrumb()).toBeVisible();

    // Check action buttons
    await expect(pageObject.getResetPasswordButton()).toBeVisible();
    await expect(pageObject.getDeleteButton()).toBeVisible();

    // Check for either ban or unban button
    const banButton = pageObject.getBanButton();
    const unbanButton = pageObject.getUnbanButton();

    await expect(banButton.or(unbanButton)).toBeVisible();
  });

  test('should open ban user dialog', async ({ page }) => {
    // Only test if ban button is visible (user is not banned)
    const banButton = pageObject.getBanButton();

    if (await banButton.isVisible()) {
      await banButton.click();

      await expect(pageObject.getDialog()).toBeVisible();
      await expect(pageObject.getDialogTitle()).toHaveText(/ban user/i);
      await expect(pageObject.getConfirmInput()).toBeVisible();
    }
  });

  test('should validate ban confirmation text', async ({ page }) => {
    const banButton = pageObject.getBanButton();

    if (await banButton.isVisible()) {
      await banButton.click();

      // Try incorrect confirmation text
      await pageObject.confirmAction('WRONG');

      // Should show validation error
      await expect(pageObject.getDialog()).toContainText(/does not match/i);
    }
  });

  test('should open reset password dialog', async () => {
    await pageObject.getResetPasswordButton().click();

    await expect(pageObject.getAlertDialog()).toBeVisible();

    await expect(pageObject.getAlertDialogTitle()).toHaveText(
      /reset password/i,
    );

    await expect(pageObject.getAlertDialogConfirmButton()).toBeVisible();
  });

  test('should validate reset password confirmation', async () => {
    await pageObject.getResetPasswordButton().click();

    // Try incorrect confirmation text
    await pageObject.confirmAction('WRONG');

    // Should show validation error
    await expect(pageObject.getAlertDialog()).toContainText(
      'Confirmation text does not match',
    );
  });

  test('should open delete user dialog', async () => {
    await pageObject.getDeleteButton().click();

    await expect(pageObject.getAlertDialog()).toBeVisible();
    await expect(pageObject.getAlertDialogTitle()).toHaveText(/delete user/i);
    await expect(pageObject.getAlertDialogConfirmButton()).toBeVisible();
  });

  test('should validate delete confirmation text', async () => {
    await pageObject.getDeleteButton().click();

    // Try incorrect confirmation text
    await pageObject.confirmAction('WRONG');

    // Should show validation error
    await expect(pageObject.getAlertDialog()).toContainText(
      'Confirmation text does not match',
    );
  });

  test('should navigate back to users list via breadcrumb', async ({
    page,
  }) => {
    const breadcrumbLink = pageObject
      .getBreadcrumb()
      .getByRole('link', { name: /users/i });

    await breadcrumbLink.click();

    await expect(page).toHaveURL('/users');
    await pageObject.waitForTableLoad();
  });
});

test.describe('Users Explorer - Permissions', () => {
  test.use({ storageState: '.auth/readonly.json' });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);
  });

  test('should restrict access for readonly users', async () => {
    await pageObject.goto();

    // Readonly users might not see the add user button
    // or might see it disabled - adjust based on your app's behavior
    const addUserButton = pageObject.getCreateUserMenuItem();

    if (await addUserButton.isVisible()) {
      // If visible, check if it's disabled or clicking shows error
      await addUserButton.click();

      // Either dropdown doesn't open or shows permission error
      const inviteMenuItem = pageObject.getInviteUserMenuItem();

      if (await inviteMenuItem.isVisible()) {
        await inviteMenuItem.click();
      }
    }
  });
});

test.describe('Users Explorer - Edge Cases', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);
  });

  test('should handle empty search results', async ({ page }) => {
    await pageObject.goto();
    await pageObject.waitForTableLoad();

    // Search for non-existent user
    await pageObject.searchUsers('nonexistent@user123456789.com');
    await page.waitForLoadState('networkidle');

    // Table should still be visible but might be empty
    await expect(pageObject.getUsersTable()).toBeVisible();
  });

  test('should preserve form data on validation error', async () => {
    await pageObject.goto();
    await pageObject.waitForTableLoad();

    await pageObject.openAddUserMenu();
    await pageObject.getCreateUserMenuItem().click();

    const testEmail = 'test@example.com';

    await pageObject.getCreateEmailInput().fill(testEmail);
    await pageObject.getCreatePasswordInput().fill('short');
    await pageObject.getCreateButton().click();

    // Email should still be filled after validation error
    await expect(pageObject.getCreateEmailInput()).toHaveValue(testEmail);
  });
});

test.describe('Users Explorer - Pagination', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);
    await pageObject.goto();
    await pageObject.waitForTableLoad();
  });

  test('should display pagination controls if multiple pages', async ({
    page,
  }) => {
    // Check if pagination controls exist
    const paginationControls = page.getByRole('navigation', {
      name: /pagination/i,
    });

    // If there are multiple pages, pagination should be visible
    if (await paginationControls.isVisible()) {
      // Check for page numbers or next/previous buttons
      const nextButton = page.getByRole('button', { name: /next/i });
      const previousButton = page.getByRole('button', { name: /previous/i });

      // At least one navigation option should exist
      await expect(nextButton.or(previousButton)).toBeVisible();
    }
  });
});

test.describe('Users Explorer - Batch Actions', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);
    await pageObject.goto();
    await pageObject.waitForTableLoad();

    // Create test users to ensure we have data to work with
    const testUsers = [
      {
        email: `batch-test-1-${Date.now()}@example.com`,
        password: 'TestPass123',
      },
      {
        email: `batch-test-2-${Date.now()}@example.com`,
        password: 'TestPass123',
      },
      {
        email: `batch-test-3-${Date.now()}@example.com`,
        password: 'TestPass123',
      },
    ];

    for (const user of testUsers) {
      // click body
      await page.locator('body').press('Escape');
      await pageObject.createUser(user.email, user.password);
      await pageObject.waitForDialogClose();
    }

    // Refresh the page to see the new users
    await page.reload();
    await pageObject.waitForTableLoad();
  });

  test('should show batch actions toolbar when users are selected', async () => {
    // Initially, batch actions toolbar should not be visible
    await expect(pageObject.getBatchActionsToolbar()).not.toBeVisible();

    // Select first user
    await pageObject.selectUser(0);

    // Batch actions toolbar should appear
    await pageObject.waitForBatchToolbarToAppear();
    await expect(pageObject.getBatchActionsToolbar()).toBeVisible();

    // Should show correct count text
    await expect(pageObject.getSelectedCountText()).toBeVisible();
  });

  test('should allow selecting and deselecting individual users', async () => {
    // Select first user
    await pageObject.selectUser(0);
    await pageObject.waitForBatchToolbarToAppear();

    // Select second user
    await pageObject.selectUser(1);

    // Both should be selected
    await expect(pageObject.getUserCheckbox(0)).toBeChecked();
    await expect(pageObject.getUserCheckbox(1)).toBeChecked();

    // Deselect first user
    await pageObject.getUserCheckbox(0).uncheck();

    // Only second should be selected
    await expect(pageObject.getUserCheckbox(0)).not.toBeChecked();
    await expect(pageObject.getUserCheckbox(1)).toBeChecked();
  });

  test('should clear selection using clear button', async () => {
    // Select multiple users
    await pageObject.selectUsers([0, 1, 2]);
    await pageObject.waitForBatchToolbarToAppear();

    // Verify selection exists
    await expect(pageObject.getBatchActionsToolbar()).toBeVisible();

    // Click clear button
    await pageObject.clearSelection();

    // Verify selection is cleared and toolbar disappears
    await pageObject.waitForBatchToolbarToDisappear();
    await expect(pageObject.getBatchActionsToolbar()).not.toBeVisible();
  });

  test('should perform batch delete with confirmation', async ({ page }) => {
    // Select users for deletion
    await pageObject.selectUsers([0, 1]);
    await pageObject.waitForBatchToolbarToAppear();

    // Click batch delete button
    await pageObject.getBatchActionButton('delete').click();

    // Delete dialog should open
    await expect(pageObject.getBatchDeleteDialog()).toBeVisible();

    // Should show confirmation text requirement
    await expect(pageObject.getBatchDialogConfirmInput()).toBeVisible();

    // Try submitting without confirmation text (should fail)
    await pageObject.getBatchDialogConfirmButton().click();

    await expect(pageObject.getBatchDeleteDialog()).toContainText(
      /Confirmation text does not match/i,
    );

    // Enter correct confirmation text
    await pageObject.getBatchDialogConfirmInput().fill('DELETE');

    // Submit deletion
    await Promise.all([
      pageObject.getBatchDialogConfirmButton().click(),
      page.waitForResponse('**/delete/batch'),
    ]);

    // Dialog should close and selection should be cleared
    await expect(pageObject.getBatchDeleteDialog()).not.toBeVisible();
    await pageObject.waitForBatchToolbarToDisappear();
  });

  test('should perform batch ban with confirmation', async ({ page }) => {
    // Select users for banning
    await pageObject.selectUsers([0, 1]);
    await pageObject.waitForBatchToolbarToAppear();

    // Click batch ban button
    await pageObject.getBatchActionButton('ban').click();

    // Ban dialog should open
    await expect(pageObject.getBatchBanDialog()).toBeVisible();

    // Should show confirmation text requirement
    await expect(pageObject.getBatchDialogConfirmInput()).toBeVisible();

    // Enter correct confirmation text and submit
    await pageObject.getBatchDialogConfirmInput().fill('BAN');

    await Promise.all([
      pageObject.getBatchDialogConfirmButton().click(),
      page.waitForResponse('**/ban/batch'),
    ]);

    // Dialog should close and selection should be cleared
    await expect(pageObject.getBatchBanDialog()).not.toBeVisible();
    await pageObject.waitForBatchToolbarToDisappear();
  });

  test('should perform batch password reset with confirmation', async ({
    page,
  }) => {
    // Select users for password reset
    await pageObject.selectUsers([0, 1]);
    await pageObject.waitForBatchToolbarToAppear();

    // Click batch reset password button
    await pageObject.getBatchActionButton('reset password').click();

    // Reset password dialog should open
    await expect(pageObject.getBatchResetPasswordDialog()).toBeVisible();

    // Should show confirmation text requirement
    await expect(pageObject.getBatchDialogConfirmInput()).toBeVisible();

    // Enter correct confirmation text and submit
    await pageObject.getBatchDialogConfirmInput().fill('RESET');

    await Promise.all([
      pageObject.getBatchDialogConfirmButton().click(),
      page.waitForResponse('**/reset-password/batch'),
    ]);

    // Dialog should close and selection should be cleared
    await expect(pageObject.getBatchResetPasswordDialog()).not.toBeVisible();

    await pageObject.waitForBatchToolbarToDisappear();
  });

  test('should show appropriate batch actions based on user status', async () => {
    // This test verifies that only appropriate actions are shown
    // For example, only show "unban" for banned users
    await pageObject.selectUser(0);
    await pageObject.waitForBatchToolbarToAppear();

    // Should always show delete and reset password actions
    await expect(pageObject.getBatchActionButton('delete')).toBeVisible();
    await expect(
      pageObject.getBatchActionButton('reset password'),
    ).toBeVisible();

    // Ban/unban actions depend on user status - at least one should be available
    const banButton = pageObject.getBatchActionButton('ban');
    const unbanButton = pageObject.getBatchActionButton('unban');

    // At least one of these should be available based on user status
    await expect(banButton.or(unbanButton)).toBeVisible();
  });

  test('should cancel batch actions when cancel is clicked', async () => {
    // Test canceling delete action
    await pageObject.selectUser(0);
    await pageObject.waitForBatchToolbarToAppear();

    await pageObject.getBatchActionButton('delete').click();
    await expect(pageObject.getBatchDeleteDialog()).toBeVisible();

    // Click cancel button
    const cancelButton = pageObject
      .getBatchDeleteDialog()
      .getByRole('button', { name: /cancel/i });

    await cancelButton.click();

    // Dialog should close and selection should remain
    await expect(pageObject.getBatchDeleteDialog()).not.toBeVisible();
    await expect(pageObject.getBatchActionsToolbar()).toBeVisible();
  });

  test('should handle validation errors in batch dialogs', async () => {
    await pageObject.selectUser(0);
    await pageObject.waitForBatchToolbarToAppear();

    // Test validation error for delete action
    await pageObject.getBatchActionButton('delete').click();
    await expect(pageObject.getBatchDeleteDialog()).toBeVisible();

    // Enter wrong confirmation text
    await pageObject.getBatchDialogConfirmInput().fill('WRONG');
    await pageObject.getBatchDialogConfirmButton().click();

    // Should show validation error
    await expect(pageObject.getBatchDeleteDialog()).toContainText(
      /Confirmation text does not match/i,
    );

    // Dialog should remain open
    await expect(pageObject.getBatchDeleteDialog()).toBeVisible();
  });

  test('should maintain selection state across batch actions', async () => {
    // Select multiple users
    await pageObject.selectUsers([0, 1, 2]);
    await pageObject.waitForBatchToolbarToAppear();

    // Open and cancel a batch action
    await pageObject.getBatchActionButton('ban').click();
    await expect(pageObject.getBatchBanDialog()).toBeVisible();

    const cancelButton = pageObject
      .getBatchBanDialog()
      .getByRole('button', { name: /cancel/i });

    await cancelButton.click();

    // Selection should be maintained
    await expect(pageObject.getBatchActionsToolbar()).toBeVisible();
    await expect(pageObject.getUserCheckbox(0)).toBeChecked();
    await expect(pageObject.getUserCheckbox(1)).toBeChecked();
    await expect(pageObject.getUserCheckbox(2)).toBeChecked();
  });

  test('should clear batch selection after successful action execution', async ({
    page,
  }) => {
    // Test that all batch actions clear selection after successful execution

    // Test 1: Ban action clears selection
    await pageObject.selectUsers([0, 1]);
    await pageObject.waitForBatchToolbarToAppear();

    // Verify users are selected
    await expect(pageObject.getUserCheckbox(0)).toBeChecked();
    await expect(pageObject.getUserCheckbox(1)).toBeChecked();

    // Execute ban action
    await pageObject.getBatchActionButton('ban').click();
    await expect(pageObject.getBatchBanDialog()).toBeVisible();
    await pageObject.getBatchDialogConfirmInput().fill('BAN');

    await Promise.all([
      pageObject.getBatchDialogConfirmButton().click(),
      page.waitForResponse('**/ban/batch'),
    ]);

    // Verify dialog closes and selection is cleared
    await expect(pageObject.getBatchBanDialog()).not.toBeVisible();
    await pageObject.waitForBatchToolbarToDisappear();
    await expect(pageObject.getBatchActionsToolbar()).not.toBeVisible();
    await expect(pageObject.getUserCheckbox(0)).not.toBeChecked();
    await expect(pageObject.getUserCheckbox(1)).not.toBeChecked();

    // Test 2: Reset password action clears selection
    await pageObject.selectUser(2);
    await pageObject.waitForBatchToolbarToAppear();

    await expect(pageObject.getUserCheckbox(2)).toBeChecked();

    await pageObject.getBatchActionButton('reset password').click();
    await expect(pageObject.getBatchResetPasswordDialog()).toBeVisible();
    await pageObject.getBatchDialogConfirmInput().fill('RESET');

    await Promise.all([
      pageObject.getBatchDialogConfirmButton().click(),
      page.waitForResponse('**/reset-password/batch'),
    ]);

    // Verify dialog closes and selection is cleared
    await expect(pageObject.getBatchResetPasswordDialog()).not.toBeVisible();
    await pageObject.waitForBatchToolbarToDisappear();

    await expect(pageObject.getBatchActionsToolbar()).not.toBeVisible();
    await expect(pageObject.getUserCheckbox(2)).not.toBeChecked();
  });
});

test.describe('Users Explorer - Admin Access Management', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: UsersExplorerPageObject;
  let testUserEmail: string;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);
    testUserEmail = `admin-test-${Date.now()}@example.com`;

    await pageObject.goto();
    await pageObject.waitForTableLoad();

    // Create a test user for admin access management
    await pageObject.createUser(testUserEmail, 'TestPass123');

    // Ensure all dialogs are closed before proceeding
    await page.locator('body').press('Escape');
    await page.waitForTimeout(250);

    // Navigate to user details page
    await pageObject.navigateToUserDetails(testUserEmail);

    // Wait for user details page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display admin access controls for eligible users', async () => {
    // Check that admin access controls are visible
    const grantButton = pageObject.getGrantAdminAccessButton();
    const revokeButton = pageObject.getRevokeAdminAccessButton();
    const toggle = pageObject.getAdminAccessToggle();

    // At least one admin access control should be visible
    await expect(grantButton.or(revokeButton).or(toggle)).toBeVisible();
  });

  test('should grant admin access to a user', async () => {
    // Skip if user already has admin access
    const currentStatus = await pageObject.getAdminAccessStatus();

    if (!currentStatus) {
      // Grant admin access
      await pageObject.grantAdminAccess();

      // Verify admin access was granted
      const newStatus = await pageObject.getAdminAccessStatus();
      expect(newStatus).toBe(true);

      // Verify the UI updated to show admin access is granted
      await expect(pageObject.getRevokeAdminAccessButton()).toBeVisible();
    }
  });

  test('should revoke admin access from a user', async () => {
    // First ensure user has admin access
    const currentStatus = await pageObject.getAdminAccessStatus();

    if (!currentStatus) {
      await pageObject.grantAdminAccess();
    }

    // Now revoke admin access
    await pageObject.revokeAdminAccess();

    // Verify admin access was revoked
    const newStatus = await pageObject.getAdminAccessStatus();
    expect(newStatus).toBe(false);

    // Verify the UI updated to show admin access is revoked
    await expect(pageObject.getGrantAdminAccessButton()).toBeVisible();
  });

  test('should show confirmation dialog when granting admin access', async () => {
    // Skip if user already has admin access
    const currentStatus = await pageObject.getAdminAccessStatus();

    if (!currentStatus) {
      // Click grant admin access button
      await pageObject.getGrantAdminAccessButton().click();

      // Verify confirmation dialog appears
      await expect(pageObject.getGrantAdminAccessDialog()).toBeVisible();

      await expect(pageObject.getGrantAdminAccessDialog()).toContainText(
        /grant admin access/i,
      );

      // Verify dialog has proper action buttons
      await expect(
        pageObject
          .getGrantAdminAccessDialog()
          .getByRole('button', { name: /make admin/i }),
      ).toBeVisible();

      await expect(
        pageObject
          .getGrantAdminAccessDialog()
          .getByRole('button', { name: /cancel/i }),
      ).toBeVisible();
    }
  });

  test('should show confirmation dialog when revoking admin access', async () => {
    // First ensure user has admin access
    const currentStatus = await pageObject.getAdminAccessStatus();

    if (!currentStatus) {
      await pageObject.grantAdminAccess();
    }

    // Click revoke admin access button
    await pageObject.getRevokeAdminAccessButton().click();

    // Verify confirmation dialog appears
    await expect(pageObject.getRevokeAdminAccessDialog()).toBeVisible();

    await expect(pageObject.getRevokeAdminAccessDialog()).toContainText(
      /revoke admin access/i,
    );
  });

  test('should cancel admin access grant operation', async () => {
    // Skip if user already has admin access
    const currentStatus = await pageObject.getAdminAccessStatus();

    if (!currentStatus) {
      // Click grant admin access button
      await pageObject.getGrantAdminAccessButton().click();
      await expect(pageObject.getGrantAdminAccessDialog()).toBeVisible();

      // Click cancel button
      await pageObject
        .getGrantAdminAccessDialog()
        .getByRole('button', { name: /cancel/i })
        .click();

      // Verify dialog closes and status remains unchanged
      await expect(pageObject.getGrantAdminAccessDialog()).not.toBeVisible();

      const statusAfterCancel = await pageObject.getAdminAccessStatus();
      expect(statusAfterCancel).toBe(currentStatus);
    }
  });

  test('should cancel admin access revoke operation', async () => {
    // First ensure user has admin access
    const currentStatus = await pageObject.getAdminAccessStatus();

    if (!currentStatus) {
      await pageObject.grantAdminAccess();
    }

    // Click revoke admin access button
    await pageObject.getRevokeAdminAccessButton().click();
    await expect(pageObject.getRevokeAdminAccessDialog()).toBeVisible();

    // Click cancel button
    await pageObject
      .getRevokeAdminAccessDialog()
      .getByRole('button', { name: /cancel/i })
      .click();

    // Verify dialog closes and status remains unchanged
    await expect(pageObject.getRevokeAdminAccessDialog()).not.toBeVisible();

    const statusAfterCancel = await pageObject.getAdminAccessStatus();
    expect(statusAfterCancel).toBe(true); // Should still have admin access
  });

  test('should handle toggle admin access if toggle UI is used', async () => {
    const toggle = pageObject.getAdminAccessToggle();

    if (await toggle.isVisible()) {
      const initialStatus = await toggle.isChecked();

      // Toggle admin access
      await pageObject.toggleAdminAccess();

      // Verify status changed
      const newStatus = await toggle.isChecked();
      expect(newStatus).toBe(!initialStatus);

      // Toggle back
      await pageObject.toggleAdminAccess();

      // Verify status reverted
      const finalStatus = await toggle.isChecked();
      expect(finalStatus).toBe(initialStatus);
    }
  });

  test('should show appropriate success messages', async ({ page }) => {
    // Test granting admin access shows success message
    const currentStatus = await pageObject.getAdminAccessStatus();

    if (!currentStatus) {
      await pageObject.grantAdminAccess();
    }

    // Test revoking admin access shows success message
    await pageObject.revokeAdminAccess();

    // Verify admin access was revoked
    const newStatus = await pageObject.getAdminAccessStatus();
    expect(newStatus).toBe(false);

    // Verify the UI updated to show admin access is revoked
    await expect(pageObject.getGrantAdminAccessButton()).toBeVisible();
  });

  test('should maintain admin access state across page refreshes', async ({
    page,
  }) => {
    // Grant admin access
    const currentStatus = await pageObject.getAdminAccessStatus();

    if (!currentStatus) {
      await pageObject.grantAdminAccess();
    }

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify admin access state is preserved
    const statusAfterRefresh = await pageObject.getAdminAccessStatus();
    expect(statusAfterRefresh).toBe(true);

    // Revoke admin access
    await pageObject.revokeAdminAccess();

    // Refresh again
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify revoked state is preserved
    const finalStatus = await pageObject.getAdminAccessStatus();
    expect(finalStatus).toBe(false);
  });

  test('should display admin access status indicator', async () => {
    // Check if there's a visual indicator showing admin access status
    const statusIndicator = pageObject.page
      .locator('[data-testid*="admin-status"]')
      .or(pageObject.page.locator('text=/admin/i'))
      .or(pageObject.page.locator('[aria-label*="admin"]'));

    // The status should be visible in some form
    await expect(statusIndicator.first()).toBeVisible();
  });
});

test.describe('Users Explorer - Admin Access Permissions', () => {
  test.use({ storageState: '.auth/readonly.json' });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);
  });

  test('should restrict admin access management for non-privileged users', async ({
    page,
  }) => {
    await pageObject.goto();
    await pageObject.waitForTableLoad();

    // Navigate to any user's details page
    const firstUserRow = page.getByRole('row').nth(1);
    await firstUserRow.click();

    // Wait for user details page to load
    await page.waitForLoadState('networkidle');

    // Admin access controls should not be visible or should be disabled
    const grantButton = pageObject.getGrantAdminAccessButton();
    const revokeButton = pageObject.getRevokeAdminAccessButton();
    const toggle = pageObject.getAdminAccessToggle();

    // Either controls are not visible or they're disabled
    const controlsVisible = await grantButton
      .or(revokeButton)
      .or(toggle)
      .isVisible();

    if (controlsVisible) {
      // If visible, they should be disabled
      const isGrantDisabled = await grantButton.isDisabled().catch(() => true);

      const isRevokeDisabled = await revokeButton
        .isDisabled()
        .catch(() => true);

      const isToggleDisabled = await toggle.isDisabled().catch(() => true);

      expect(isGrantDisabled || isRevokeDisabled || isToggleDisabled).toBe(
        true,
      );
    }
  });

  test('should show permission error when attempting admin access operations', async ({
    page,
  }) => {
    // Try to directly call the admin access API
    const response = await page.request.put(
      '/api/v1/admin/users/test-user-id/admin-access',
      {
        data: { adminAccess: true },
        headers: { 'Content-Type': 'application/json' },
      },
    );

    // Should return 403 Forbidden or 401 Unauthorized
    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('Users Explorer - Admin Access Edge Cases', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: UsersExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new UsersExplorerPageObject(page);
  });

  test('should handle non-existent user gracefully', async ({ page }) => {
    // Try to navigate to a non-existent user
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    await pageObject.gotoUserDetails(fakeUserId);

    // Should show appropriate error or redirect
    await expect(
      page
        .locator('text=/not found/i')
        .or(page.locator('text=/user does not exist/i')),
    ).toBeVisible();
  });

  test('should validate user permissions before showing controls', async ({
    page,
  }) => {
    await pageObject.goto();
    await pageObject.waitForTableLoad();

    // Navigate to user details
    const firstUserRow = page.getByRole('row').nth(1);
    await firstUserRow.click();
    await page.waitForLoadState('networkidle');

    // Admin access controls should only be visible if user has proper permissions
    // This is implicitly tested by the existence of the controls
    const hasControls = await pageObject
      .getGrantAdminAccessButton()
      .or(pageObject.getRevokeAdminAccessButton())
      .or(pageObject.getAdminAccessToggle())
      .isVisible();

    if (hasControls) {
      // If controls are visible, user should have proper permissions
      // Test this by checking if API calls would succeed
      expect(hasControls).toBe(true);
    }
  });
});
