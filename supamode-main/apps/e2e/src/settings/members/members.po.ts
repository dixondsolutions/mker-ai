import { Page, expect } from '@playwright/test';

export class MembersPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/settings/members', {
      waitUntil: 'commit',
    });
  }

  // Page Header Elements
  getPageTitle() {
    return this.page.getByRole('heading', { level: 5 });
  }

  getPageDescription() {
    return this.page.locator('div.text-muted-foreground').first();
  }

  getSearchInput() {
    return this.page.getByTestId('members-search-input');
  }

  async searchMembers(searchTerm: string) {
    await this.getSearchInput().fill(searchTerm);

    await this.page.keyboard.press('Enter');
  }

  // Members Table
  getMembersTable() {
    return this.page.getByRole('table');
  }

  getMembersTableRows() {
    return this.getMembersTable().getByRole('row');
  }

  getMemberRow(memberName: string) {
    return this.getMembersTableRows().filter({ hasText: memberName });
  }

  getMemberActionsButton(memberName: string) {
    return this.getMemberRow(memberName).getByTestId('member-actions');
  }

  async clickMemberRow(memberName: string) {
    await this.getMemberRow(memberName).click();
  }

  async openMemberActions(memberName: string) {
    await this.getMemberActionsButton(memberName).click();
  }

  async viewMemberFromActions(memberName: string) {
    await this.openMemberActions(memberName);
    await this.page.getByRole('menuitem', { name: /view/i }).click();
  }

  // Utility methods
  async expectPageToLoad() {
    await expect(this.getPageTitle()).toBeVisible();
    await expect(this.getPageDescription()).toBeVisible();
    await expect(this.getMembersTable()).toBeVisible();
  }

  async expectMemberInTable(memberName: string) {
    await expect(this.getMemberRow(memberName)).toBeVisible();
  }

  async expectMemberNotInTable(memberName: string) {
    await expect(this.getMemberRow(memberName)).not.toBeVisible();
  }

  async expectTableToHaveMinimumRows(count: number) {
    const rows = await this.getMembersTableRows().all();
    expect(rows.length).toBeGreaterThanOrEqual(count + 1); // +1 for header row
  }

  async getMemberData(memberName: string) {
    const row = this.getMemberRow(memberName);
    const cells = row.getByRole('cell');

    return {
      displayName: await cells.nth(0).textContent(),
      role: await cells.nth(1).textContent(),
      joinedDate: await cells.nth(2).textContent(),
    };
  }
}

export class MemberDetailsPageObject {
  constructor(private readonly page: Page) {}

  async goto(memberId: string) {
    await this.page.goto(`/settings/members/${memberId}`);
  }

  // Page Header Elements
  getBreadcrumb() {
    return this.page.getByRole('navigation');
  }

  getPageTitle() {
    return this.page.getByRole('heading', { level: 5 });
  }

  getMemberAvatar() {
    return this.page
      .getByRole('img')
      .or(this.page.getByTestId('profile-avatar-fallback'));
  }

  getMemberEmail() {
    return this.page.getByTestId('member-details-email');
  }

  // Action Buttons
  getEditMemberButton() {
    return this.page.getByTestId('member-details-edit-member-button');
  }

  getChangeRoleButton() {
    return this.page.getByTestId('member-details-change-role-button');
  }

  getDeactivateButton() {
    return this.page.getByTestId('member-details-deactivate-button');
  }

  getActivateButton() {
    return this.page.getByTestId('member-details-activate-button');
  }

  // Member Details Cards
  getAccountStatusBadge() {
    return this.page.getByTestId('member-details-account-status-badge');
  }

  getAssignedRoleBadge() {
    return this.page.getByTestId('member-details-assigned-role-badge');
  }

  getAccountIdCopyToClipboard() {
    return this.page.getByTestId('member-details-account-id-copy-to-clipboard');
  }

  getAuthUserIdCopyToClipboard() {
    return this.page.getByTestId(
      'member-details-auth-user-id-copy-to-clipboard',
    );
  }

  // Activity Logs Section
  getActivityLogsSection() {
    return this.page
      .getByRole('heading', { name: /activity logs/i })
      .locator('..');
  }

  getViewAllLogsLink() {
    return this.page.getByRole('link', { name: /view all logs/i });
  }

  // Utility methods
  async expectPageToLoad() {
    await expect(this.getBreadcrumb()).toBeVisible();
    await expect(this.getPageTitle()).toBeVisible();
  }

  async expectMemberStatus(status: 'active' | 'inactive') {
    const badge = this.getAccountStatusBadge();
    await expect(badge).toBeVisible();

    if (status === 'active') {
      await expect(badge).toContainText(/active/i);
    } else {
      await expect(badge).toContainText(/inactive/i);
    }
  }

  async expectMemberRole(roleName: string) {
    await expect(this.getAssignedRoleBadge()).toContainText(roleName);
  }

  async expectActionButtonsVisible() {
    await expect(this.getEditMemberButton()).toBeVisible();
    await expect(this.getChangeRoleButton()).toBeVisible();
  }

  async expectActionButtonsHidden() {
    await expect(this.getEditMemberButton()).not.toBeVisible();
    await expect(this.getChangeRoleButton()).not.toBeVisible();
  }

  async activateIfDeactivated() {
    const statusBadge = this.getAccountStatusBadge();
    const initialStatus = await statusBadge.textContent();

    if (initialStatus?.toLowerCase().includes('inactive')) {
      await this.getActivateButton().click();
      await this.page.waitForResponse('**/api/**');
    }
  }
}

export class EditAccountDialogPageObject {
  constructor(private readonly page: Page) {}

  getDialog() {
    return this.page.getByRole('dialog');
  }

  getForm() {
    return this.page.getByTestId('member-details-edit-account-form');
  }

  getDisplayNameInput() {
    return this.page.getByTestId('member-details-display-name-input');
  }

  getEmailInput() {
    return this.page.getByTestId('member-details-email-input');
  }

  getSaveButton() {
    return this.getDialog().getByRole('button', { name: /save/i });
  }

  getCancelButton() {
    return this.getDialog().getByRole('button', { name: /cancel/i });
  }

  getSuccessAlert() {
    return this.getDialog().getByRole('alert');
  }

  async fillForm(data: { displayName?: string; email?: string }) {
    if (data.displayName !== undefined) {
      await this.getDisplayNameInput().fill(data.displayName);
    }

    if (data.email !== undefined) {
      await this.getEmailInput().fill(data.email);
    }
  }

  async saveForm() {
    await this.getSaveButton().click();
  }

  async cancelForm() {
    await this.getCancelButton().click();
  }

  async expectDialogOpen() {
    await expect(this.getDialog()).toBeVisible();
    await expect(this.getForm()).toBeVisible();
  }

  async expectDialogClosed() {
    await expect(this.getDialog()).not.toBeVisible();
  }

  async expectSaveButtonDisabled() {
    await expect(this.getSaveButton()).toBeDisabled();
  }

  async expectSaveButtonEnabled() {
    await expect(this.getSaveButton()).toBeEnabled();
  }

  async expectSuccessMessage() {
    await expect(this.getSuccessAlert()).toBeVisible();
  }
}

export class AssignRoleDialogPageObject {
  constructor(private readonly page: Page) {}

  getDialog() {
    return this.page.getByRole('dialog');
  }

  getSearchInput() {
    return this.page.getByTestId('assign-role-dialog-search-input');
  }

  getRoleOption(roleName: string) {
    return this.page
      .getByTestId(`assign-role-dialog-role`)
      .filter({ hasText: roleName });
  }

  getRoleOptions() {
    return this.page.locator("[data-testid='assign-role-dialog-role']");
  }

  getSaveChangesButton() {
    return this.page.getByTestId('assign-role-dialog-save-changes-button');
  }

  getCancelButton() {
    return this.getDialog().getByRole('button', { name: /cancel/i });
  }

  getCurrentRoleBadge() {
    return this.getDialog().getByTestId('member-details-assigned-role-badge');
  }

  getSelectedRoleBadge() {
    return this.getDialog()
      .getByText(/you will assign role/i)
      .locator('..')
      .getByRole('status');
  }

  async searchRoles(searchTerm: string) {
    await this.getSearchInput().fill(searchTerm);
  }

  async selectRole(roleName: string) {
    const roleOption = this.getRoleOption(roleName);
    await roleOption.click();
  }

  async saveChanges() {
    await this.getSaveChangesButton().click();
  }

  async cancel() {
    await this.getCancelButton().click();
  }

  async expectDialogOpen() {
    await expect(this.getDialog()).toBeVisible();
    await expect(this.getSearchInput()).toBeVisible();
  }

  async expectDialogClosed() {
    await expect(this.getDialog()).not.toBeVisible();
  }

  async expectRoleOption(roleName: string) {
    await expect(this.getRoleOption(roleName)).toBeVisible();
  }

  async expectRoleOptionNotVisible(roleName: string) {
    await expect(this.getRoleOption(roleName)).not.toBeVisible();
  }

  async expectSaveButtonDisabled() {
    await expect(this.getSaveChangesButton()).toBeDisabled();
  }

  async expectSaveButtonEnabled() {
    await expect(this.getSaveChangesButton()).toBeEnabled();
  }

  async expectCurrentRole(roleName: string) {
    const currentRoleBadge = this.page
      .locator("[data-is-assigned='true']")
      .filter({ hasText: roleName });

    await expect(currentRoleBadge).toBeVisible();
  }

  async expectSelectedRole(roleName: string) {
    await expect(this.getSelectedRoleBadge()).toContainText(roleName);
  }

  expectToaster() {
    return this.page.getByTestId('toaster');
  }
}
