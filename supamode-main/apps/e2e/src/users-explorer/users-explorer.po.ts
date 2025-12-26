import { Page } from '@playwright/test';

export class UsersExplorerPageObject {
  constructor(public readonly page: Page) {}

  async goto() {
    await this.page.goto('/users', {
      waitUntil: 'commit',
    });
  }

  async gotoUserDetails(userId: string) {
    await this.page.goto(`/users/${userId}`, {
      waitUntil: 'commit',
    });
  }

  // Search functionality
  getSearchInput() {
    return this.page.getByTestId('users-table-search-input');
  }

  async searchUsers(query: string) {
    await this.getSearchInput().fill(query);
    const action = this.getSearchInput().press('Enter');

    return Promise.all([action, this.page.waitForResponse('**/api/**')]);
  }

  getInviteUserMenuItem() {
    return this.page.getByRole('menuitem', { name: /invite user/i });
  }

  getCreateUserMenuItem() {
    return this.page.getByRole('menuitem', { name: /create user/i });
  }

  // Table elements
  getUsersTable() {
    return this.page.getByRole('table');
  }

  getUserRow(email: string) {
    return this.page.getByTestId('user-email').filter({ hasText: email });
  }

  getUserActionsButton(email: string) {
    return this.getUserRow(email).getByTestId('user-actions');
  }

  getViewDetailsMenuItem() {
    return this.page.getByRole('menuitem', { name: /view details/i });
  }

  // User details page elements
  getBanButton() {
    return this.page.getByTestId('ban-user-button');
  }

  getUnbanButton() {
    return this.page.getByTestId('unban-user-button');
  }

  getResetPasswordButton() {
    return this.page.getByTestId('reset-password-button');
  }

  getDeleteButton() {
    return this.page.getByTestId('delete-user-button');
  }

  getAdminAccessToggle() {
    return this.page.getByTestId('admin-access-toggle');
  }

  getAdminAccessButton() {
    return this.page.getByTestId('admin-access-button');
  }

  getGrantAdminAccessButton() {
    return this.page.getByTestId('grant-admin-access-button');
  }

  getRevokeAdminAccessButton() {
    return this.page.getByTestId('revoke-admin-access-button');
  }

  getManageMemberButton() {
    return this.page.getByTestId('manage-member-button');
  }

  // Dialog elements
  getDialog() {
    return this.page.getByRole('alertdialog');
  }

  getDialogTitle() {
    return this.getDialog().getByRole('heading');
  }

  getConfirmInput() {
    return this.getAlertDialog().getByRole('textbox');
  }

  getDialogCancelButton() {
    return this.getDialog().getByRole('button', { name: /cancel/i });
  }

  getDialogConfirmButton() {
    return this.getDialog().getByRole('button', {
      name: /delete|ban|reset|unban/i,
    });
  }

  getAlertDialog() {
    return this.page.getByRole('alertdialog');
  }

  getAlertDialogTitle() {
    return this.getAlertDialog().getByRole('heading');
  }

  getAlertDialogConfirmButton() {
    return this.getAlertDialog().getByRole('button', {
      name: /delete|ban|reset|unban|reset password/i,
    });
  }

  getAddUserButton() {
    return this.page.getByRole('button', { name: /add user/i });
  }

  // Invite user dialog
  getInviteEmailInput() {
    return this.page
      .getByTestId('invite-user-dialog-form')
      .getByRole('textbox', { name: /email/i });
  }

  getInviteSendButton() {
    return this.page
      .getByTestId('invite-user-dialog-form')
      .getByRole('button', { name: /send/i });
  }

  // Create user dialog
  getCreateEmailInput() {
    return this.page
      .getByTestId('create-user-dialog-form')
      .getByRole('textbox', { name: /email/i });
  }

  getCreatePasswordInput() {
    return this.page
      .getByTestId('create-user-dialog-form')
      .getByRole('textbox', { name: /password/i });
  }

  getCreateButton() {
    return this.page
      .getByTestId('create-user-dialog-form')
      .getByRole('button', { name: /create user/i });
  }

  // Breadcrumb navigation
  getBreadcrumb() {
    return this.page.getByRole('navigation');
  }

  // Helper methods
  async openAddUserMenu() {
    await this.getAddUserButton().click();
  }

  async openUserActionsMenu(email: string) {
    await this.getUserActionsButton(email).click();
  }

  async confirmAction(confirmText: string) {
    await this.getConfirmInput().fill(confirmText);
    await this.getAlertDialogConfirmButton().click();
  }

  async inviteUser(email: string) {
    await this.openAddUserMenu();
    await this.getInviteUserMenuItem().click();
    await this.getInviteEmailInput().fill(email);

    await Promise.all([
      this.getInviteSendButton().click(),
      this.page.waitForResponse('**/api/**'),
    ]);
  }

  async createUser(email: string, password: string) {
    await this.openAddUserMenu();
    await this.getCreateUserMenuItem().click();
    await this.getCreateEmailInput().fill(email);
    await this.getCreatePasswordInput().fill(password);

    await Promise.all([
      this.getCreateButton().click(),
      this.page.waitForResponse('**/api/**'),
    ]);

    await this.page.waitForTimeout(500);
  }

  async navigateToUserDetails(email: string) {
    // filter the user row by email and click it
    await this.searchUsers(email);

    await this.getUserRow(email).click();
  }

  async waitForTableLoad() {
    await this.getUsersTable().waitFor({ state: 'visible' });
  }

  async waitForDialogClose() {
    await this.getDialog().waitFor({ state: 'hidden' });
  }

  // Batch operations methods
  getUserCheckbox(index: number = 0) {
    return this.page
      .getByRole('row')
      .nth(index + 1)
      .locator('label')
      .getByRole('checkbox');
  }

  getUserRowByIndex(index: number) {
    return this.page.getByRole('row').nth(index + 1);
  }

  // Check if a user row has admin badge/indicator
  async isUserAdmin(index: number): Promise<boolean> {
    const userRow = this.getUserRowByIndex(index);

    const adminIndicators = [userRow.getByText('Admin User', { exact: false })];

    for (const indicator of adminIndicators) {
      if (await indicator.isVisible({ timeout: 100 }).catch(() => false)) {
        return true;
      }
    }

    return false;
  }

  // Get indices of non-admin users for batch operations
  async getNonAdminUserIndices(maxUsers: number = 10): Promise<number[]> {
    const nonAdminIndices: number[] = [];

    for (let i = 0; i < maxUsers; i++) {
      const userRow = this.getUserRow(i);

      // Check if user row exists
      if (!(await userRow.isVisible({ timeout: 500 }).catch(() => false))) {
        break;
      }

      // Skip if user is admin
      if (!(await this.isUserAdmin(i))) {
        nonAdminIndices.push(i);
      }
    }

    return nonAdminIndices;
  }

  getSelectAllCheckbox() {
    return this.page.getByRole('columnheader').getByRole('checkbox');
  }

  getBatchActionsToolbar() {
    return this.page.getByTestId('batch-actions-toolbar');
  }

  getBatchActionButton(action: string) {
    return this.getBatchActionsToolbar().getByRole('button', {
      name: new RegExp(action, 'i'),
    });
  }

  getClearSelectionButton() {
    return this.getBatchActionsToolbar().getByRole('button', {
      name: /clear/i,
    });
  }

  getSelectedCountText() {
    return this.getBatchActionsToolbar().locator('text=/\\d+ .* selected/');
  }

  // Batch action dialogs
  getBatchDeleteDialog() {
    return this.page
      .getByRole('alertdialog')
      .filter({ hasText: /delete.*users?/i });
  }

  getBatchBanDialog() {
    return this.page
      .getByRole('alertdialog')
      .filter({ hasText: /ban.*users?/i });
  }

  getBatchUnbanDialog() {
    return this.page
      .getByRole('alertdialog')
      .filter({ hasText: /unban.*users?/i });
  }

  getBatchResetPasswordDialog() {
    return this.page
      .getByRole('alertdialog')
      .filter({ hasText: /reset password.*users?/i });
  }

  getAdminAccessDialog() {
    return this.page
      .getByRole('alertdialog')
      .filter({ hasText: /admin access/i });
  }

  getGrantAdminAccessDialog() {
    return this.page
      .getByRole('alertdialog')
      .filter({ hasText: /grant admin access/i });
  }

  getRevokeAdminAccessDialog() {
    return this.page
      .getByRole('alertdialog')
      .filter({ hasText: /revoke admin access/i });
  }

  getBatchDialogConfirmInput() {
    return this.page.getByRole('alertdialog').getByRole('textbox');
  }

  getBatchDialogConfirmButton() {
    return this.page
      .getByRole('alertdialog')
      .getByRole('button', { name: /delete|ban|unban|reset password/i })
      .last();
  }

  // Helper methods for batch operations
  async selectUser(index: number) {
    await this.getUserCheckbox(index).check();
  }

  // Select a non-admin user safely
  async selectNonAdminUser(index: number): Promise<boolean> {
    if (await this.isUserAdmin(index)) {
      console.log(`Skipping user at index ${index} - user is admin`);
      return false;
    }

    await this.selectUser(index);
    return true;
  }

  async selectUsers(indices: number[]) {
    for (const index of indices) {
      await this.selectUser(index);
    }
  }

  // Select multiple non-admin users safely
  async selectNonAdminUsers(indices: number[]): Promise<number[]> {
    const selectedIndices: number[] = [];

    for (const index of indices) {
      if (await this.selectNonAdminUser(index)) {
        selectedIndices.push(index);
      }
    }

    return selectedIndices;
  }

  // Select first N non-admin users
  async selectFirstNonAdminUsers(count: number = 2): Promise<number[]> {
    const nonAdminIndices = await this.getNonAdminUserIndices(20); // Check first 20 users
    const indicesToSelect = nonAdminIndices.slice(0, count);

    return await this.selectNonAdminUsers(indicesToSelect);
  }

  async selectAllUsers() {
    await this.getSelectAllCheckbox().check();
  }

  // Select all non-admin users (safer for batch operations)
  async selectAllNonAdminUsers(): Promise<number[]> {
    const nonAdminIndices = await this.getNonAdminUserIndices(50); // Check first 50 users
    return await this.selectNonAdminUsers(nonAdminIndices);
  }

  async deselectAllUsers() {
    await this.getSelectAllCheckbox().uncheck();
  }

  async clearSelection() {
    await this.getClearSelectionButton().click();
  }

  async performBatchAction(actionName: string, confirmText?: string) {
    await this.getBatchActionButton(actionName).click();

    if (confirmText) {
      await this.getBatchDialogConfirmInput().fill(confirmText);
    }

    await Promise.all([
      this.getBatchDialogConfirmButton().click(),
      this.page.waitForResponse('**/api/**'),
    ]);
  }

  // Safer batch action that automatically selects non-admin users
  async performSafeBatchAction(
    actionName: string,
    userCount: number = 2,
    confirmText?: string,
  ): Promise<number[]> {
    // First, select non-admin users
    const selectedIndices = await this.selectFirstNonAdminUsers(userCount);

    if (selectedIndices.length === 0) {
      throw new Error('No non-admin users available for batch operation');
    }

    console.log(
      `Selected ${selectedIndices.length} non-admin users for ${actionName} action`,
    );

    // Wait for batch toolbar to appear
    await this.waitForBatchToolbarToAppear();

    // Perform the action
    await this.performBatchAction(actionName, confirmText);

    return selectedIndices;
  }

  async waitForBatchToolbarToAppear() {
    await this.getBatchActionsToolbar().waitFor({ state: 'visible' });
  }

  async waitForBatchToolbarToDisappear() {
    await this.getBatchActionsToolbar().waitFor({ state: 'hidden' });
  }

  // Helper methods with more reliable selectors
  getAutoConfirmCheckbox() {
    return this.page
      .getByTestId('create-user-dialog-form')
      .locator('input[type="checkbox"]')
      .last(); // The autoConfirm checkbox is the last checkbox in the form
  }

  async enableAutoConfirm() {
    await this.getAutoConfirmCheckbox().check();
  }

  async disableAutoConfirm() {
    await this.getAutoConfirmCheckbox().uncheck();
  }

  // More reliable batch dialog selectors
  getBatchDialogByTitle(titleText: string) {
    return this.page.getByRole('alertdialog').filter({ hasText: titleText });
  }

  getBatchDialogConfirmButtonByText(buttonText: string) {
    return this.page
      .getByRole('alertdialog')
      .getByRole('button')
      .filter({ hasText: new RegExp(buttonText, 'i') })
      .last();
  }

  // Admin access management helper methods
  async grantAdminAccess() {
    await this.getGrantAdminAccessButton().click();

    // Wait for confirmation dialog
    await this.getGrantAdminAccessDialog().waitFor({ state: 'visible' });

    // Check the confirmation checkbox (confirmMakeAdmin)
    const confirmCheckbox = this.getGrantAdminAccessDialog()
      .getByRole('checkbox')
      .first(); // The confirmMakeAdmin checkbox

    await confirmCheckbox.check();

    // Submit the form
    await this.getGrantAdminAccessDialog()
      .getByTestId('grant-admin-access-submit-button')
      .click();

    // Wait for API response and dialog to close
    await Promise.all([
      this.page.waitForResponse('**/admin-access'),
      this.getGrantAdminAccessDialog().waitFor({ state: 'hidden' }),
    ]);

    // Wait for the page to reload and show the updated status
    await this.page.waitForLoadState('networkidle');
  }

  async revokeAdminAccess() {
    await this.getRevokeAdminAccessButton().click();

    // Wait for confirmation dialog
    await this.getRevokeAdminAccessDialog().waitFor({ state: 'visible' });

    // Type the confirmation text
    const confirmInput = this.getRevokeAdminAccessDialog().getByRole('textbox');
    await confirmInput.fill('REMOVE');

    // Submit the form
    await this.getRevokeAdminAccessDialog()
      .getByTestId('revoke-admin-access-submit-button')
      .click();

    // Wait for API response and dialog to close
    await Promise.all([
      this.page.waitForResponse('**/admin-access'),
      this.getRevokeAdminAccessDialog().waitFor({ state: 'hidden' }),
    ]);

    // Wait for the page to reload and show the updated status
    await this.page.waitForLoadState('networkidle');

    // Wait for the grant button to become visible (indicating admin access was revoked)
    await this.getGrantAdminAccessButton().waitFor({
      state: 'visible',
      timeout: 5000,
    });
  }

  async toggleAdminAccess() {
    await this.getAdminAccessToggle().click();

    // Wait for API response
    await this.page.waitForResponse('**/admin-access');
  }

  async getAdminAccessStatus() {
    // Check if the toggle/button shows admin access is granted
    const toggle = this.getAdminAccessToggle();
    const grantButton = this.getGrantAdminAccessButton();
    const revokeButton = this.getRevokeAdminAccessButton();

    if (await toggle.isVisible()) {
      return await toggle.isChecked();
    } else if (await revokeButton.isVisible()) {
      return true; // Revoke button visible means admin access is granted
    } else if (await grantButton.isVisible()) {
      return false; // Grant button visible means admin access is not granted
    }

    return false; // Default to false if status cannot be determined
  }
}
