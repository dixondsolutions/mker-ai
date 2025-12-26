import { Page, expect } from '@playwright/test';

export class PermissionsPageObject {
  constructor(private readonly page: Page) {}

  async goto(tab?: string) {
    const url = tab
      ? `/settings/permissions?tab=${tab}`
      : '/settings/permissions';

    await this.page.goto(url, {
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

  // Tab Navigation
  getTabs() {
    return this.page.getByTestId('permissions-page-tabs-list');
  }

  getRolesTab() {
    return this.page.getByRole('tab', { name: /roles$/i });
  }

  getPermissionsTab() {
    return this.page.getByRole('tab', { name: /^permissions/i });
  }

  getGroupsTab() {
    return this.page.getByRole('tab', { name: /groups/i });
  }

  async switchToTab(tabName: 'roles' | 'permissions' | 'groups') {
    switch (tabName) {
      case 'roles':
        await this.getRolesTab().click();
        break;

      case 'permissions':
        await this.getPermissionsTab().click();
        break;

      case 'groups':
        await this.getGroupsTab().click();
        break;
    }
  }

  // Create Buttons
  getCreateRoleButton() {
    return this.page.getByTestId('create-role-button');
  }

  getCreatePermissionButton() {
    return this.page.getByTestId('create-permission-button');
  }

  getCreatePermissionGroupButton() {
    return this.page.getByTestId('create-permission-group-button');
  }

  // Tables
  getRolesTable() {
    return this.page.getByTestId('roles-table');
  }

  getPermissionsTable() {
    return this.page.getByTestId('permissions-table');
  }

  getPermissionGroupsTable() {
    return this.page.getByTestId('permission-groups-table');
  }

  getTableRows(table: 'roles' | 'permissions' | 'groups') {
    switch (table) {
      case 'roles':
        return this.getRolesTable().getByRole('row');

      case 'permissions':
        return this.getPermissionsTable().getByRole('row');

      case 'groups':
        return this.getPermissionGroupsTable().getByRole('row');
    }
  }

  async clickTableRow(table: 'roles' | 'permissions' | 'groups', name: string) {
    const tableElement = this.getTableRows(table);
    await tableElement.filter({ hasText: name }).click();
  }

  // Utility methods
  async expectPageToLoad() {
    await expect(this.getPageTitle()).toBeVisible();
    await expect(this.getPageDescription()).toBeVisible();
    await expect(this.getTabs()).toBeVisible();
  }

  async expectTableToLoad(table: 'roles' | 'permissions' | 'groups') {
    switch (table) {
      case 'roles':
        await expect(this.getRolesTable()).toBeVisible();
        break;
      case 'permissions':
        await expect(this.getPermissionsTable()).toBeVisible();
        break;
      case 'groups':
        await expect(this.getPermissionGroupsTable()).toBeVisible();
        break;
    }
  }

  async expectCreateButtonVisible(type: 'role' | 'permission' | 'group') {
    switch (type) {
      case 'role':
        await expect(this.getCreateRoleButton()).toBeVisible();
        break;
      case 'permission':
        await expect(this.getCreatePermissionButton()).toBeVisible();
        break;
      case 'group':
        await expect(this.getCreatePermissionGroupButton()).toBeVisible();
        break;
    }
  }
}

export class CreateRoleDialogPageObject {
  constructor(private readonly page: Page) {}

  getDialog() {
    return this.page.getByRole('dialog');
  }

  getForm() {
    return this.page.getByTestId('create-role-form');
  }

  getNameInput() {
    return this.page.getByTestId('create-role-name-input');
  }

  getDescriptionTextarea() {
    return this.page.getByTestId('create-role-description-textarea');
  }

  getRankInput() {
    return this.page.getByTestId('create-role-rank-input');
  }

  getCreateButton() {
    return this.getDialog().getByRole('button', { name: /create/i });
  }

  getCancelButton() {
    return this.getDialog().getByRole('button', { name: /cancel/i });
  }

  async fillForm(data: { name: string; description?: string; rank?: number }) {
    await this.getNameInput().fill(data.name);

    if (data.description !== undefined) {
      await this.getDescriptionTextarea().fill(data.description);
    }

    if (data.rank !== undefined) {
      await this.getRankInput().fill(data.rank.toString());
    }
  }

  async submitForm() {
    await this.getCreateButton().click();
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
}

export class CreatePermissionDialogPageObject {
  constructor(private readonly page: Page) {}

  getDialog() {
    return this.page.getByRole('dialog');
  }

  getForm() {
    return this.page.getByTestId('permission-form');
  }

  getNameInput() {
    return this.page.getByTestId('permission-form-name-input');
  }

  getDescriptionTextarea() {
    return this.page.getByTestId('permission-form-description-textarea');
  }

  getPermissionTypeSelect() {
    return this.page.getByTestId(
      'permission-form-permission-type-select-trigger',
    );
  }

  getPermissionTypeOption(type: 'system' | 'data') {
    return this.page.getByTestId(
      `permission-form-permission-type-select-item-${type}`,
    );
  }

  getSystemResourceSelect() {
    return this.page.getByTestId(
      'permission-form-system-resource-select-trigger',
    );
  }

  getSystemResourceOption(resource: string) {
    return this.page.getByTestId(
      `permission-form-system-resource-select-item-${resource}`,
    );
  }

  getScopeSelect() {
    return this.page.getByTestId('permission-form-scope-select-trigger');
  }

  getScopeOption(scope: string) {
    return this.page.getByTestId(`permission-form-scope-select-item-${scope}`);
  }

  getSchemaNameInput() {
    return this.page.getByTestId('permission-form-schema-name-input');
  }

  getTableNameInput() {
    return this.page.getByTestId('permission-form-table-name-input');
  }

  getStorageBucketNameInput() {
    return this.page.getByTestId('permission-form-storage-bucket-name-input');
  }

  getStoragePathInput() {
    return this.page.getByTestId('permission-form-storage-path-input');
  }

  getColumnNameInput() {
    return this.page.getByTestId('permission-form-column-name-input');
  }

  getActionSelect() {
    return this.page.getByTestId('permission-form-action-select-trigger');
  }

  getActionOption() {
    return this.page.getByTestId(`permission-form-action-select-item`);
  }

  getCreateButton() {
    return this.getDialog().getByRole('button', { name: /create/i });
  }

  getCancelButton() {
    return this.getDialog().getByRole('button', { name: /cancel/i });
  }

  async selectPermissionType(type: 'system' | 'data') {
    await this.getPermissionTypeSelect().click();
    await this.getPermissionTypeOption(type).click();
  }

  async selectSystemResource(resource: string) {
    await this.getSystemResourceSelect().click();
    await this.getSystemResourceOption(resource).click();
  }

  async selectScope(scope: 'table' | 'storage') {
    await this.getScopeSelect().click();
    await this.getScopeOption(scope).click();
  }

  async selectAction(action: string) {
    if (await this.getActionSelect().isEnabled()) {
      await this.getActionSelect().click();

      await this.page.locator(`[data-value="${action}"]`).click();
    }
  }

  async fillSystemPermissionForm(data: {
    name: string;
    description?: string;
    systemResource: string;
    action: string;
  }) {
    await this.getNameInput().fill(data.name);

    if (data.description) {
      await this.getDescriptionTextarea().fill(data.description);
    }

    await this.selectPermissionType('system');
    await this.selectSystemResource(data.systemResource);
    await this.selectAction(data.action);
  }

  async fillDataPermissionForm(data: {
    name: string;
    description?: string;
    scope: 'table' | 'storage';
    schemaName?: string;
    tableName?: string;
    columnName?: string;
    action: string;
  }) {
    await this.getNameInput().fill(data.name);

    if (data.description) {
      await this.getDescriptionTextarea().fill(data.description);
    }

    await this.selectPermissionType('data');
    await this.selectScope(data.scope);

    if (data.schemaName) {
      await this.getSchemaNameInput().fill(data.schemaName);
    }

    if (data.tableName) {
      await this.getTableNameInput().fill(data.tableName);
    }

    if (data.columnName) {
      await this.getColumnNameInput().fill(data.columnName);
    }

    await this.selectAction(data.action);
  }

  async submitForm() {
    await this.getCreateButton().click();
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
}

export class CreatePermissionGroupDialogPageObject {
  constructor(private readonly page: Page) {}

  getDialog() {
    return this.page.getByRole('dialog');
  }

  getForm() {
    return this.page.getByTestId('permission-group-form');
  }

  getNameInput() {
    return this.page.getByTestId('permission-group-form-name-input');
  }

  getDescriptionTextarea() {
    return this.page.getByTestId('permission-group-form-description-textarea');
  }

  getCreateButton() {
    return this.getDialog().getByRole('button', { name: /create/i });
  }

  getCancelButton() {
    return this.getDialog().getByRole('button', { name: /cancel/i });
  }

  async fillForm(data: { name: string; description?: string }) {
    await this.getNameInput().fill(data.name);

    if (data.description !== undefined) {
      await this.getDescriptionTextarea().fill(data.description);
    }
  }

  async submitForm() {
    await this.getCreateButton().click();
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
}

export class RoleDetailsPageObject {
  constructor(private readonly page: Page) {}

  async goto(roleId: string) {
    await this.page.goto(`/settings/permissions/roles/${roleId}`);
  }

  // Page Header Elements
  getBreadcrumb() {
    return this.page.locator(`[aria-label="breadcrumb"]`);
  }

  getPageTitle() {
    return this.page.getByRole('heading', { level: 4 });
  }

  getPageDescription() {
    return this.page.locator('div.text-muted-foreground').first();
  }

  // Action Buttons
  getManagePermissionsButton() {
    return this.page.getByTestId('manage-permissions-button');
  }

  getManagePermissionGroupsButton() {
    return this.page.getByTestId('manage-permission-groups-button');
  }

  getEditRoleButton() {
    return this.page.getByTestId('edit-role-button');
  }

  getDeleteRoleButton() {
    return this.page.getByTestId('delete-role-button');
  }

  // Tabs
  getPermissionsTab() {
    return this.page.getByTestId('permissions-tab');
  }

  getGroupsTab() {
    return this.page.getByTestId('groups-tab');
  }

  async switchToPermissionsTab() {
    await this.getPermissionsTab().click();
  }

  async switchToGroupsTab() {
    await this.getGroupsTab().click();
  }

  // Tables
  getRolePermissionsTable() {
    return this.page.getByTestId('role-permissions-table');
  }

  getRolePermissionGroupsTable() {
    return this.page.getByTestId('role-permission-groups-table');
  }

  // Utility methods
  async expectPageToLoad() {
    await expect(this.getBreadcrumb()).toBeVisible();
  }

  async expectPermissionsTableToLoad() {
    await expect(this.getRolePermissionsTable()).toBeVisible();
  }

  async expectPermissionGroupsTableToLoad() {
    await expect(this.getRolePermissionGroupsTable()).toBeVisible();
  }
}

export class PermissionDetailsPageObject {
  constructor(private readonly page: Page) {}

  async goto(permissionId: string) {
    await this.page.goto(`/settings/permissions/${permissionId}`);
  }

  // Page Header Elements
  getBreadcrumb() {
    return this.page.getByRole('navigation');
  }

  getPageTitle() {
    return this.page.getByRole('heading', { level: 4 });
  }

  getPageDescription() {
    return this.page.locator('div.text-muted-foreground').first();
  }

  // Action Buttons
  getEditPermissionButton() {
    return this.page.getByTestId('edit-permission-button');
  }

  getDeletePermissionButton() {
    return this.page.getByTestId('delete-permission-button');
  }

  // Permission Details Cards
  getPermissionTypeBadge() {
    return this.page.getByTestId('permission-type-badge');
  }

  getPermissionActionBadge() {
    return this.page.getByTestId('permission-action-badge');
  }

  getPermissionScopeBadge() {
    return this.page.getByTestId('permission-scope-badge');
  }

  getPermissionSchemaNameBadge() {
    return this.page.getByTestId('permission-schema-name-badge');
  }

  getPermissionTableNameBadge() {
    return this.page.getByTestId('permission-table-name-badge');
  }

  getPermissionColumnNameBadge() {
    return this.page.getByTestId('permission-column-name-badge');
  }

  // Tabs
  getRolesTab() {
    return this.page.getByTestId('roles-tab');
  }

  getGroupsTab() {
    return this.page.getByTestId('groups-tab');
  }

  async switchToRolesTab() {
    await this.getRolesTab().click();
  }

  async switchToGroupsTab() {
    await this.getGroupsTab().click();
  }

  // Tables
  getPermissionRolesTable() {
    return this.page.getByTestId('permission-roles-table');
  }

  getPermissionGroupsTable() {
    return this.page.getByTestId('permission-groups-table');
  }

  // Utility methods
  async expectPageToLoad() {
    await expect(this.getBreadcrumb()).toBeVisible();
    await expect(this.getPageTitle()).toBeVisible();
  }

  async expectRolesTableToLoad() {
    await expect(this.getPermissionRolesTable()).toBeVisible();
  }

  async expectGroupsTableToLoad() {
    await expect(this.getPermissionGroupsTable()).toBeVisible();
  }
}

export class ManagePermissionsDialogPageObject {
  constructor(
    private readonly page: Page,
    private readonly type: 'group' | 'role',
  ) {}

  getDialog() {
    return this.page.getByRole('dialog');
  }

  getContent() {
    return this.page.getByTestId(
      `manage-${this.type}-permissions-dialog-content`,
    );
  }

  getSearchInput() {
    return this.page.getByTestId(
      `manage-${this.type}-permissions-dialog-search-input`,
    );
  }

  getPermissionCheckbox(permissionId?: string) {
    if (permissionId) {
      return this.page
        .getByTestId(
          `manage-${this.type}-permissions-dialog-permission-checkbox`,
        )
        .filter({ has: this.page.locator(`[data-value="${permissionId}"]`) });
    }

    return this.page.getByTestId(
      `manage-${this.type}-permissions-dialog-permission-checkbox`,
    );
  }

  getSaveChangesButton() {
    return this.page.getByTestId(
      `manage-${this.type}-permissions-dialog-save-changes-button`,
    );
  }

  getCancelButton() {
    return this.getDialog().getByRole('button', { name: /cancel/i });
  }

  async searchPermissions(searchTerm: string) {
    await this.getSearchInput().fill(searchTerm);
  }

  async togglePermission(permissionId: string) {
    await this.getPermissionCheckbox(permissionId).click();
  }

  async saveChanges() {
    await expect(this.getSaveChangesButton()).toBeEnabled();
    await this.getSaveChangesButton().click();
  }

  async cancel() {
    await this.getCancelButton().click();
  }

  async expectDialogOpen() {
    await this.page.waitForSelector(
      `[data-testid='manage-${this.type}-permissions-dialog-content']`,
    );
  }

  async expectDialogClosed() {
    await expect(this.getDialog()).not.toBeVisible();
  }
}
