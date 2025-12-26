import { expect, test } from '@playwright/test';

import {
  CreatePermissionDialogPageObject,
  CreatePermissionGroupDialogPageObject,
  CreateRoleDialogPageObject,
  ManagePermissionsDialogPageObject,
  PermissionDetailsPageObject,
  PermissionsPageObject,
  RoleDetailsPageObject,
} from './permissions.po';

test.describe('Permissions System', () => {
  test.use({ storageState: '.auth/root.json' });

  let permissionsPage: PermissionsPageObject;
  let createRoleDialog: CreateRoleDialogPageObject;
  let createPermissionDialog: CreatePermissionDialogPageObject;
  let createPermissionGroupDialog: CreatePermissionGroupDialogPageObject;

  test.beforeEach(async ({ page }) => {
    permissionsPage = new PermissionsPageObject(page);

    createRoleDialog = new CreateRoleDialogPageObject(page);

    createPermissionDialog = new CreatePermissionDialogPageObject(page);

    createPermissionGroupDialog = new CreatePermissionGroupDialogPageObject(
      page,
    );

    await permissionsPage.goto();
    await permissionsPage.expectPageToLoad();
  });

  test.describe('Page Structure and Navigation', () => {
    test('should load with correct page structure', async () => {
      await expect(permissionsPage.getPageTitle()).toBeVisible();
      await expect(permissionsPage.getPageDescription()).toBeVisible();
      await expect(permissionsPage.getTabs()).toBeVisible();

      // Check all tab buttons are visible
      await expect(permissionsPage.getRolesTab()).toBeVisible();
      await expect(permissionsPage.getPermissionsTab()).toBeVisible();
      await expect(permissionsPage.getGroupsTab()).toBeVisible();
    });

    test('should navigate between tabs correctly', async () => {
      // Start with roles tab (default)
      await permissionsPage.expectTableToLoad('roles');
      await permissionsPage.expectCreateButtonVisible('role');

      // Switch to permissions tab
      await permissionsPage.switchToTab('permissions');
      await permissionsPage.expectTableToLoad('permissions');
      await permissionsPage.expectCreateButtonVisible('permission');

      // Switch to groups tab
      await permissionsPage.switchToTab('groups');
      await permissionsPage.expectTableToLoad('groups');
      await permissionsPage.expectCreateButtonVisible('group');

      // Switch back to roles tab
      await permissionsPage.switchToTab('roles');
      await permissionsPage.expectTableToLoad('roles');
      await permissionsPage.expectCreateButtonVisible('role');
    });

    test('should display correct tables based on active tab', async () => {
      // Roles tab
      await expect(permissionsPage.getRolesTable()).toBeVisible();
      await expect(permissionsPage.getPermissionsTable()).not.toBeVisible();
      await expect(
        permissionsPage.getPermissionGroupsTable(),
      ).not.toBeVisible();

      // Permissions tab
      await permissionsPage.switchToTab('permissions');
      await expect(permissionsPage.getRolesTable()).not.toBeVisible();
      await expect(permissionsPage.getPermissionsTable()).toBeVisible();
      await expect(
        permissionsPage.getPermissionGroupsTable(),
      ).not.toBeVisible();

      // Groups tab
      await permissionsPage.switchToTab('groups');
      await expect(permissionsPage.getRolesTable()).not.toBeVisible();
      await expect(permissionsPage.getPermissionsTable()).not.toBeVisible();
      await expect(permissionsPage.getPermissionGroupsTable()).toBeVisible();
    });

    test('should load with URL tab parameter', async ({ page }) => {
      await permissionsPage.goto('permissions');
      await expect(permissionsPage.getPermissionsTab()).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await permissionsPage.expectTableToLoad('permissions');

      await permissionsPage.goto('groups');
      await expect(permissionsPage.getGroupsTab()).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await permissionsPage.expectTableToLoad('groups');
    });
  });

  test.describe('Roles Management', () => {
    test.beforeEach(async () => {
      await permissionsPage.switchToTab('roles');
      await permissionsPage.expectTableToLoad('roles');
    });

    test('should open create role dialog', async () => {
      await permissionsPage.getCreateRoleButton().click();
      await createRoleDialog.expectDialogOpen();
    });

    test('should close create role dialog on cancel', async () => {
      await permissionsPage.getCreateRoleButton().click();
      await createRoleDialog.expectDialogOpen();

      await createRoleDialog.cancelForm();
      await createRoleDialog.expectDialogClosed();
    });

    test('should disallow creating a role with higher rank than existing roles', async ({
      page,
    }) => {
      const randomSuffix = Math.random().toString(36).substring(7);
      const roleName = `Test Role ${randomSuffix}`;
      const roleDescription = `Test role description ${randomSuffix}`;

      await permissionsPage.getCreateRoleButton().click();
      await createRoleDialog.expectDialogOpen();

      await createRoleDialog.fillForm({
        name: roleName,
        description: roleDescription,
        rank: 1000,
      });

      // expect to see validation error
      await expect(
        createRoleDialog.getDialog().getByText(/the value entered is greater/i),
      ).toBeVisible();
    });

    test('should create a new role successfully', async ({ page }) => {
      const randomSuffix = Math.random().toString(36).substring(7);
      const roleName = `Test Role ${randomSuffix}`;
      const roleDescription = `Test role description ${randomSuffix}`;

      await permissionsPage.getCreateRoleButton().click();
      await createRoleDialog.expectDialogOpen();

      await expect(async () => {
        const randomNumber = Math.floor(Math.random() * 99);

        await createRoleDialog.fillForm({
          name: roleName,
          description: roleDescription,
          rank: randomNumber,
        });

        await expect(createRoleDialog.getCreateButton()).toBeEnabled();

        await Promise.all([
          createRoleDialog.submitForm(),
          page.waitForResponse('**/api/**'),
        ]);

        await createRoleDialog.expectDialogClosed();
      }).toPass();

      // we are now in the roles page, let's go back to the permissions page
      await permissionsPage.goto();
      await permissionsPage.switchToTab('roles');

      // Verify role appears in table
      await expect(permissionsPage.getRolesTable()).toContainText(roleName);

      // Clean up: delete the created role
      await permissionsPage.clickTableRow('roles', roleName);
      await page.waitForURL(/\/settings\/permissions\/roles\/.*/);

      const roleDetailsPage = new RoleDetailsPageObject(page);
      await roleDetailsPage.expectPageToLoad();

      await roleDetailsPage.getDeleteRoleButton().click();
      await expect(page.getByTestId('delete-role-dialog')).toBeVisible();

      await page
        .getByTestId('delete-role-dialog')
        .getByRole('button', { name: /delete/i })
        .click();

      await page.waitForResponse('**/api/**');
      await expect(page.getByTestId('delete-role-dialog')).not.toBeVisible();
    });

    test('should validate required fields in create role form', async () => {
      await permissionsPage.getCreateRoleButton().click();
      await createRoleDialog.expectDialogOpen();

      // Try to submit without filling required fields
      await expect(createRoleDialog.getCreateButton()).toBeDisabled();

      // fill the name field
      await createRoleDialog.getNameInput().fill('Test Role');

      // expect the create button to be enabled
      await expect(createRoleDialog.getCreateButton()).toBeEnabled();

      // fill the description field
      await createRoleDialog
        .getDescriptionTextarea()
        .fill('Test role description');

      // expect the create button to be enabled
      await expect(createRoleDialog.getCreateButton()).toBeEnabled();

      // fill the rank field
      await createRoleDialog.getRankInput().fill('1000');

      // expect the create button to be enabled
      await expect(createRoleDialog.getCreateButton()).toBeEnabled();

      // the rank field has an issue
      await expect(
        createRoleDialog.getDialog().locator('p', {
          hasText:
            /The value entered is greater than the maximum allowed rank/i,
        }),
      ).toBeVisible();

      // submit the form
      await createRoleDialog.submitForm();

      // expect the dialog to be open
      await createRoleDialog.expectDialogOpen();
    });

    test('should navigate to role details when clicking on role', async ({
      page,
    }) => {
      const rows = await permissionsPage.getTableRows('roles').all();

      if (rows.length > 1) {
        // Skip header row
        const firstDataRow = rows[1];

        const roleName = await firstDataRow
          .getByRole('cell')
          .first()
          .textContent();

        if (roleName) {
          await firstDataRow.click();

          // Should navigate to role details page
          await page.waitForURL(/\/settings\/permissions\/roles\/.*/, {
            timeout: 5000,
          });

          // Verify we're on the role details page
          const roleDetailsPage = new RoleDetailsPageObject(page);
          await roleDetailsPage.expectPageToLoad();
        }
      }
    });
  });

  test.describe('Permissions Management', () => {
    test.beforeEach(async () => {
      await permissionsPage.switchToTab('permissions');
      await permissionsPage.expectTableToLoad('permissions');
    });

    test('should open create permission dialog', async () => {
      await permissionsPage.getCreatePermissionButton().click();
      await createPermissionDialog.expectDialogOpen();
    });

    test('should close create permission dialog on cancel', async () => {
      await permissionsPage.getCreatePermissionButton().click();
      await createPermissionDialog.expectDialogOpen();

      await createPermissionDialog.cancelForm();
      await createPermissionDialog.expectDialogClosed();
    });

    test('should create a system permission successfully', async ({ page }) => {
      const randomSuffix = Math.random().toString(36).substring(7);
      const permissionName = `Test System Permission ${randomSuffix}`;

      await permissionsPage.getCreatePermissionButton().click();
      await createPermissionDialog.expectDialogOpen();

      await createPermissionDialog.fillSystemPermissionForm({
        name: permissionName,
        description: 'Test system permission description',
        systemResource: 'account',
        action: '*',
      });

      await Promise.all([
        createPermissionDialog.submitForm(),
        page.waitForResponse('**/api/**'),
      ]);

      await createPermissionDialog.expectDialogClosed();

      // go back to the permissions page
      await permissionsPage.goto();
      await permissionsPage.switchToTab('permissions');

      // Verify permission appears in table
      await expect(permissionsPage.getPermissionsTable()).toContainText(
        permissionName,
      );
    });

    test('should create a data permission successfully', async ({ page }) => {
      const randomSuffix = Math.random().toString(36).substring(7);
      const permissionName = `Test Data Permission ${randomSuffix}`;

      await permissionsPage.getCreatePermissionButton().click();
      await createPermissionDialog.expectDialogOpen();

      await createPermissionDialog.fillDataPermissionForm({
        name: permissionName,
        description: 'Test data permission description',
        scope: 'table',
        schemaName: 'public',
        tableName: '*',
        action: 'select',
      });

      await Promise.all([
        createPermissionDialog.submitForm(),
        page.waitForResponse('**/api/**'),
      ]);

      await createPermissionDialog.expectDialogClosed();

      // go back to the permissions page
      await permissionsPage.goto();
      await permissionsPage.switchToTab('permissions');

      // Verify permission appears in table
      await expect(permissionsPage.getPermissionsTable()).toContainText(
        permissionName,
      );
    });

    test('should show conditional fields based on permission type', async () => {
      await permissionsPage.getCreatePermissionButton().click();
      await createPermissionDialog.expectDialogOpen();

      // Select system permission type
      await createPermissionDialog.selectPermissionType('system');

      // expect the system resource select to be visible
      await expect(
        createPermissionDialog.getSystemResourceSelect(),
      ).toBeVisible();

      await expect(createPermissionDialog.getScopeSelect()).not.toBeVisible();

      // Select data permission type
      await createPermissionDialog.selectPermissionType('data');

      // expect the system resource select to be hidden
      await expect(
        createPermissionDialog.getSystemResourceSelect(),
      ).not.toBeVisible();

      // expect the scope select to be visible
      await expect(createPermissionDialog.getScopeSelect()).toBeVisible();
    });

    test('should show conditional fields based on data scope', async () => {
      await permissionsPage.getCreatePermissionButton().click();
      await createPermissionDialog.expectDialogOpen();

      await createPermissionDialog.selectPermissionType('data');

      // Table scope - schema and table name required
      await createPermissionDialog.selectScope('table');

      await expect(createPermissionDialog.getSchemaNameInput()).toBeVisible();
      await expect(createPermissionDialog.getTableNameInput()).toBeVisible();

      // expect the column name input to be hidden
      await expect(
        createPermissionDialog.getColumnNameInput(),
      ).not.toBeVisible();

      // Storage scope - all fields required
      await createPermissionDialog.selectScope('storage');

      await expect(
        createPermissionDialog.getStorageBucketNameInput(),
      ).toBeVisible();

      await expect(createPermissionDialog.getStoragePathInput()).toBeVisible();
      await expect(createPermissionDialog.getActionSelect()).toBeVisible();
    });

    test('should restrict actions for protected schemas', async ({ page }) => {
      await permissionsPage.getCreatePermissionButton().click();
      await createPermissionDialog.expectDialogOpen();

      // Select data permission type
      await createPermissionDialog.selectPermissionType('data');

      // Select table scope
      await createPermissionDialog.selectScope('table');

      // Fill in protected schema name
      await createPermissionDialog.getSchemaNameInput().fill('auth');

      // Action select should be disabled
      await expect(createPermissionDialog.getActionSelect()).toBeDisabled();

      // Check that only select action is available
      const selectContent = page.getByTestId(
        'permission-form-action-select-trigger',
      );

      await expect(selectContent).toBeDisabled();
      await expect(selectContent).toContainText('This is a protected schema');

      // Try to submit with select action
      await createPermissionDialog.fillDataPermissionForm({
        name: 'Test Protected Schema Permission',
        description: 'Test protected schema permission description',
        scope: 'table',
        schemaName: 'auth',
        tableName: 'users',
        action: 'select',
      });

      await expect(createPermissionDialog.getCreateButton()).toBeEnabled();
    });

    test('should allow all actions for non-protected schemas', async ({
      page,
    }) => {
      await permissionsPage.getCreatePermissionButton().click();
      await createPermissionDialog.expectDialogOpen();

      // Select data permission type
      await createPermissionDialog.selectPermissionType('data');

      // Select table scope
      await createPermissionDialog.selectScope('table');

      // Fill in non-protected schema name
      await createPermissionDialog.getSchemaNameInput().fill('public');

      // Action select should be enabled
      await expect(createPermissionDialog.getActionSelect()).toBeEnabled();

      // All actions should be available
      const actionSelect = createPermissionDialog.getActionSelect();
      await actionSelect.click();

      const actions = page.getByTestId('permission-form-action-select-item');

      await expect(actions.nth(0)).toContainText('All actions');
      await expect(actions.nth(1)).toContainText('Read');
      await expect(actions.nth(2)).toContainText('Insert');
      await expect(actions.nth(3)).toContainText('Update');
      await expect(actions.nth(4)).toContainText('Delete');
    });

    test('should navigate to permission details when clicking on permission', async ({
      page,
    }) => {
      const rows = await permissionsPage.getTableRows('permissions').all();

      if (rows.length > 1) {
        // Skip header row
        const firstDataRow = rows[1];
        await firstDataRow.click();

        // Should navigate to permission details page
        await page.waitForURL(/\/settings\/permissions\/[^\/]+$/);

        // Verify we're on the permission details page
        const permissionDetailsPage = new PermissionDetailsPageObject(page);

        await permissionDetailsPage.expectPageToLoad();
      }
    });
  });

  test.describe('Permission Groups Management', () => {
    test.describe.configure({
      mode: 'serial',
    });

    let managePermissionsDialog: ManagePermissionsDialogPageObject;

    test.beforeEach(async ({ page }) => {
      managePermissionsDialog = new ManagePermissionsDialogPageObject(
        page,
        'group',
      );

      await permissionsPage.switchToTab('groups');
      await permissionsPage.expectTableToLoad('groups');
    });

    test('should open create permission group dialog', async () => {
      await permissionsPage.getCreatePermissionGroupButton().click();
      await createPermissionGroupDialog.expectDialogOpen();
    });

    test('should close create permission group dialog on cancel', async () => {
      await permissionsPage.getCreatePermissionGroupButton().click();
      await createPermissionGroupDialog.expectDialogOpen();

      await createPermissionGroupDialog.cancelForm();
      await createPermissionGroupDialog.expectDialogClosed();
    });

    test('should create a new permission group successfully', async ({
      page,
    }) => {
      const randomSuffix = Math.random().toString(36).substring(7);
      const groupName = `Test Group ${randomSuffix}`;
      const groupDescription = `Test group description ${randomSuffix}`;

      await permissionsPage.getCreatePermissionGroupButton().click();
      await createPermissionGroupDialog.expectDialogOpen();

      await createPermissionGroupDialog.fillForm({
        name: groupName,
        description: groupDescription,
      });

      await Promise.all([
        createPermissionGroupDialog.submitForm(),
        page.waitForResponse('**/api/**'),
      ]);

      await createPermissionGroupDialog.expectDialogClosed();

      // go back to the permissions page
      await permissionsPage.goto();
      await permissionsPage.switchToTab('groups');

      // Verify group appears in table
      await expect(permissionsPage.getPermissionGroupsTable()).toContainText(
        groupName,
      );
    });

    test('should validate required fields in create group form', async () => {
      await permissionsPage.getCreatePermissionGroupButton().click();
      await createPermissionGroupDialog.expectDialogOpen();

      // Try to submit without filling required fields
      await createPermissionGroupDialog.submitForm();

      // Form should show validation errors and remain open
      await createPermissionGroupDialog.expectDialogOpen();
    });

    test('should navigate to group details when clicking on group', async ({
      page,
    }) => {
      const rows = await permissionsPage.getTableRows('groups').all();

      if (rows.length > 1) {
        // Skip header row
        const firstDataRow = rows[1];
        await firstDataRow.click();

        // Should navigate to group details page
        await page.waitForURL(/\/settings\/permissions\/groups\/.*/);

        // Verify we're on the group details page
        await expect(page.getByRole('heading', { level: 4 })).toBeVisible();
      }
    });

    test('should manage permissions for a group', async ({ page }) => {
      // select a group
      const rows = await permissionsPage.getTableRows('groups').all();

      await rows[1].click();

      await page.waitForURL(/\/settings\/permissions\/groups\/.*/);

      // open the manage permissions dialog
      await page
        .locator("[data-testid='manage-group-permissions-button']")
        .click();

      await managePermissionsDialog.expectDialogOpen();

      const checkboxes = await managePermissionsDialog
        .getPermissionCheckbox()
        .all();

      // this is the state of the checkboxes
      const state: Record<string, boolean> = {};

      for (let i = 0; i < checkboxes.length; i++) {
        const result =
          (await checkboxes[i].getAttribute('aria-checked')) === 'true';

        const id = (await checkboxes[i].getAttribute('id')) as string;

        state[id] = result;
      }

      if (checkboxes.length > 0) {
        // flip the first checkbox
        await checkboxes[0].click();
        const id = (await checkboxes[0].getAttribute('id')) as string;
        state[id] = !state[id];
      }

      await Promise.all([
        page.waitForResponse('**/api/**'),
        managePermissionsDialog.saveChanges(),
      ]);

      // expect dialog to be closed
      await managePermissionsDialog.expectDialogClosed();

      // reopen dialog
      await page
        .locator("[data-testid='manage-group-permissions-button']")
        .click();

      await managePermissionsDialog.expectDialogOpen();

      // check state of checkboxes
      const newCheckboxes = await managePermissionsDialog
        .getPermissionCheckbox()
        .all();

      for (let i = 0; i < newCheckboxes.length; i++) {
        const isChecked =
          (await newCheckboxes[i].getAttribute('aria-checked')) === 'true';

        const id = (await newCheckboxes[i].getAttribute('id')) as string;

        // expect the checkbox to be flipped
        expect(isChecked).toBe(state[id]);
      }

      // reload page and check if the permission is saved
      await page.reload();

      // open the manage permissions dialog again
      await page
        .locator("[data-testid='manage-group-permissions-button']")
        .click();

      await managePermissionsDialog.expectDialogOpen();

      // verify checkboxes match
      const newCheckboxesAfterReload = await managePermissionsDialog
        .getPermissionCheckbox()
        .all();

      // now we check if the checkboxes are flipped
      for (let i = 0; i < newCheckboxesAfterReload.length; i++) {
        if (!newCheckboxesAfterReload[i]) {
          continue;
        }

        const isChecked =
          (await newCheckboxesAfterReload[i]!.getAttribute('aria-checked')) ===
          'true';

        const id = (await newCheckboxesAfterReload[i]!.getAttribute(
          'id',
        )) as string;

        // expect the checkbox to be flipped
        expect(isChecked).toBe(state[id]);
      }
    });
  });

  test.describe('Table Interactions', () => {
    test('should display data in all tables', async () => {
      // Check roles table has data
      await permissionsPage.switchToTab('roles');
      const rolesRows = await permissionsPage.getTableRows('roles').all();

      expect(rolesRows.length).toBeGreaterThan(1); // Header + at least one data row

      // Check permissions table has data
      await permissionsPage.switchToTab('permissions');

      const permissionsRows = await permissionsPage
        .getTableRows('permissions')
        .all();

      expect(permissionsRows.length).toBeGreaterThan(1);

      // Check groups table
      await permissionsPage.switchToTab('groups');
      const groupsRows = await permissionsPage.getTableRows('groups').all();

      expect(groupsRows.length).toBeGreaterThan(0); // At least header row
    });

    test('should show appropriate columns in each table', async () => {
      // Roles table columns
      await permissionsPage.switchToTab('roles');
      const rolesTable = permissionsPage.getRolesTable();
      await expect(rolesTable).toContainText('Name');
      await expect(rolesTable).toContainText('Rank');

      // Permissions table columns
      await permissionsPage.switchToTab('permissions');
      const permissionsTable = permissionsPage.getPermissionsTable();

      await expect(permissionsTable).toContainText('Name');
      await expect(permissionsTable).toContainText('Type');
      await expect(permissionsTable).toContainText('Action');
      await expect(permissionsTable).toContainText('Resource');

      // Groups table columns
      await permissionsPage.switchToTab('groups');
      const groupsTable = permissionsPage.getPermissionGroupsTable();
      await expect(groupsTable).toContainText('Name');
    });
  });

  test.describe('Access Control', () => {
    test('should show create buttons when user has permissions', async () => {
      // Test that create buttons are visible for root user
      await permissionsPage.switchToTab('roles');
      await permissionsPage.expectCreateButtonVisible('role');

      await permissionsPage.switchToTab('permissions');
      await permissionsPage.expectCreateButtonVisible('permission');

      await permissionsPage.switchToTab('groups');
      await permissionsPage.expectCreateButtonVisible('group');
    });
  });

  test.describe('Error Handling', () => {
    test('should handle form validation errors gracefully', async () => {
      await permissionsPage.getCreateRoleButton().click();
      await createRoleDialog.expectDialogOpen();

      // Submit form with invalid data
      await createRoleDialog.fillForm({
        name: '', // Empty name should trigger validation
        rank: -1, // Invalid rank
      });

      await createRoleDialog.submitForm();

      // Dialog should remain open with validation errors
      await createRoleDialog.expectDialogOpen();
      await expect(createRoleDialog.getForm()).toBeVisible();
    });

    test('should handle network errors during creation', async ({ page }) => {
      // Intercept and fail the creation request
      await page.route('**/api/**', (route) => route.abort());

      await permissionsPage.getCreateRoleButton().click();
      await createRoleDialog.expectDialogOpen();

      const randomNumber = Math.floor(Math.random() * 99);

      await createRoleDialog.fillForm({
        name: 'Test Role',
        rank: randomNumber,
      });

      await createRoleDialog.submitForm();

      // Should show error or maintain dialog state
      // Exact behavior depends on error handling implementation
    });
  });
});

test.describe('Role Details Page', () => {
  test.use({ storageState: '.auth/root.json' });

  let roleDetailsPage: RoleDetailsPageObject;
  let managePermissionsDialog: ManagePermissionsDialogPageObject;

  test.beforeEach(async ({ page }) => {
    roleDetailsPage = new RoleDetailsPageObject(page);

    managePermissionsDialog = new ManagePermissionsDialogPageObject(
      page,
      'role',
    );

    // Navigate to first available role
    const permissionsPage = new PermissionsPageObject(page);
    await permissionsPage.goto('roles');

    await page.waitForSelector("[data-testid='roles-table']");

    const role = permissionsPage
      .getTableRows('roles')
      .getByRole('link', { name: 'Admin' });

    await role.click();

    await page.waitForURL(/\/settings\/permissions\/roles\/.*/);

    await roleDetailsPage.expectPageToLoad();
  });

  test.describe('Page Structure', () => {
    test('should load with correct page structure', async () => {
      await expect(roleDetailsPage.getBreadcrumb()).toBeVisible();
      await expect(roleDetailsPage.getPageTitle()).toBeVisible();

      await expect(roleDetailsPage.getEditRoleButton()).toBeVisible();
    });

    test('should navigate between tabs correctly', async () => {
      // Start with permissions tab
      await roleDetailsPage.switchToPermissionsTab();

      await expect(roleDetailsPage.getPermissionsTab()).toHaveAttribute(
        'aria-selected',
        'true',
      );

      // Switch to groups tab
      await roleDetailsPage.switchToGroupsTab();

      await expect(roleDetailsPage.getGroupsTab()).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    test('should display role information correctly', async () => {
      await expect(roleDetailsPage.getPageTitle()).toBeVisible();

      // Verify breadcrumb navigation
      const breadcrumb = roleDetailsPage.getBreadcrumb();
      await expect(breadcrumb).toContainText('Settings');
      await expect(breadcrumb).toContainText('Roles');
    });
  });

  test.describe('Permissions Management', () => {
    test('should search permissions in manage dialog', async () => {
      await roleDetailsPage.getManagePermissionsButton().click();
      await managePermissionsDialog.expectDialogOpen();

      await managePermissionsDialog.searchPermissions('admin');
    });

    test('should toggle permission selection', async () => {
      await roleDetailsPage.getManagePermissionsButton().click();
      await managePermissionsDialog.expectDialogOpen();

      const checkboxes = await managePermissionsDialog
        .getPermissionCheckbox()
        .all();

      if (checkboxes.length > 0) {
        const initialState =
          (await checkboxes[0].getAttribute('aria-checked')) === 'true';

        await checkboxes[0].click();

        const newState =
          (await checkboxes[0].getAttribute('aria-checked')) === 'true';

        expect(newState).toBe(!initialState);
      }
    });

    test('should save permission changes', async ({ page }) => {
      await roleDetailsPage.getManagePermissionsButton().click();
      await managePermissionsDialog.expectDialogOpen();
      await page.waitForTimeout(100);

      const checkboxes = managePermissionsDialog.getPermissionCheckbox();

      // Toggle a permission
      await checkboxes.first().click();

      // Save changes
      await managePermissionsDialog.saveChanges();
      await managePermissionsDialog.expectDialogClosed();
    });

    test('should cancel permission changes', async () => {
      await roleDetailsPage.getManagePermissionsButton().click();
      await managePermissionsDialog.expectDialogOpen();

      await managePermissionsDialog.cancel();
      await managePermissionsDialog.expectDialogClosed();
    });
  });

  test.describe('Role Actions', () => {
    test('should open edit role dialog', async ({ page }) => {
      await roleDetailsPage.getEditRoleButton().click();

      // Should open edit dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByTestId('edit-role-dialog-form')).toBeVisible();
    });

    test('should allow deleting a role with lower rank', async ({ page }) => {
      // Create a new role
      const permissionsPage = new PermissionsPageObject(page);
      const createRoleDialog = new CreateRoleDialogPageObject(page);

      const randomSuffix = Math.random().toString(36).substring(7);
      const roleName = `E2E Delete Test Role ${randomSuffix}`;
      const roleDescription = `E2E test role for delete ${randomSuffix}`;

      await permissionsPage.goto();
      await permissionsPage.switchToTab('roles');
      await permissionsPage.getCreateRoleButton().click();
      await createRoleDialog.expectDialogOpen();

      await expect(async () => {
        const randomNumber = Math.floor(Math.random() * 99);

        await createRoleDialog.fillForm({
          name: roleName,
          description: roleDescription,
          rank: randomNumber,
        });

        await Promise.all([
          createRoleDialog.submitForm(),
          page.waitForResponse('**/api/**'),
          page.waitForURL(/\/settings\/permissions\/roles\/.*/),
        ]);
      }).toPass();

      await createRoleDialog.expectDialogClosed();
      await permissionsPage.goto();
      await permissionsPage.switchToTab('roles');

      // Click the new role row
      await permissionsPage.clickTableRow('roles', roleName);
      await page.waitForURL(/\/settings\/permissions\/roles\/.*/);

      const roleDetailsPage = new RoleDetailsPageObject(page);
      await roleDetailsPage.expectPageToLoad();

      // Delete button should be visible
      await expect(roleDetailsPage.getDeleteRoleButton()).toBeVisible();
      await roleDetailsPage.getDeleteRoleButton().click();

      // Confirm delete dialog
      await expect(page.getByTestId('delete-role-dialog')).toBeVisible();
      // Confirm delete (assuming a button with text 'Delete')

      await page
        .getByTestId('delete-role-dialog')
        .getByRole('button', { name: /delete/i })
        .click();

      await page.waitForResponse('**/api/**');

      // Wait for dialog to close and role to be removed
      await expect(page.getByTestId('delete-role-dialog')).not.toBeVisible();

      await permissionsPage.goto();
      await permissionsPage.switchToTab('roles');

      await expect(permissionsPage.getRolesTable()).not.toContainText(roleName);
    });
  });

  test.describe('Tables Display', () => {
    test('should display permissions table', async ({ page }) => {
      await roleDetailsPage.switchToPermissionsTab();

      // Table should be visible (even if empty)
      const permissionsSection = page.locator(
        '[data-testid="role-permissions-table"], .py-8',
      );

      await expect(permissionsSection).toBeVisible();
    });

    test('should display permission groups table', async ({ page }) => {
      await roleDetailsPage.switchToGroupsTab();

      // Table should be visible (even if empty)
      const groupsSection = page.locator(
        '[data-testid="role-permission-groups-table"], .py-8',
      );

      await expect(groupsSection).toBeVisible();
    });
  });
});

test.describe('Permission Details Page', () => {
  test.use({ storageState: '.auth/root.json' });

  let permissionDetailsPage: PermissionDetailsPageObject;

  test.beforeEach(async ({ page }) => {
    permissionDetailsPage = new PermissionDetailsPageObject(page);

    // Navigate to first available permission
    const permissionsPage = new PermissionsPageObject(page);
    await permissionsPage.goto('permissions');

    await page.waitForSelector("[data-testid='permissions-table']");

    const rows = await permissionsPage.getTableRows('permissions').all();

    if (rows.length > 1) {
      await rows[1].click(); // Click first data row

      await page.waitForURL(/\/settings\/permissions\/[^\/]+$/, {
        timeout: 5000,
      });

      await permissionDetailsPage.expectPageToLoad();
    }
  });

  test.describe('Page Structure', () => {
    test('should load with correct page structure', async () => {
      await expect(permissionDetailsPage.getBreadcrumb()).toBeVisible();
      await expect(permissionDetailsPage.getPageTitle()).toBeVisible();

      // Check action buttons are visible
      await expect(
        permissionDetailsPage.getEditPermissionButton(),
      ).toBeVisible();

      await expect(
        permissionDetailsPage.getDeletePermissionButton(),
      ).toBeVisible();
    });

    test('should display permission details correctly', async () => {
      // Check permission detail badges
      await expect(
        permissionDetailsPage.getPermissionTypeBadge(),
      ).toBeVisible();

      await expect(
        permissionDetailsPage.getPermissionActionBadge(),
      ).toBeVisible();

      // Scope badge might not always be visible depending on permission type
      const scopeBadge = permissionDetailsPage.getPermissionScopeBadge();

      // Just check it exists in DOM, might show "-" for system permissions
      await expect(scopeBadge).toBeVisible();
    });

    test('should navigate between tabs correctly', async () => {
      await permissionDetailsPage.switchToRolesTab();

      await expect(permissionDetailsPage.getRolesTab()).toHaveAttribute(
        'aria-selected',
        'true',
      );

      await permissionDetailsPage.switchToGroupsTab();

      await expect(permissionDetailsPage.getGroupsTab()).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  test.describe('Permission Actions', () => {
    test('should open edit permission dialog', async ({ page }) => {
      await permissionDetailsPage.getEditPermissionButton().click();

      // Should open edit dialog
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByTestId('permission-form')).toBeVisible();
    });

    test('should open delete permission dialog', async ({ page }) => {
      await permissionDetailsPage.getDeletePermissionButton().click();

      // Should open delete confirmation dialog
      await expect(page.getByRole('alertdialog')).toBeVisible();
    });
  });

  test.describe('Related Data Display', () => {
    test('should display roles using this permission', async ({ page }) => {
      await permissionDetailsPage.switchToRolesTab();

      // Should show either table with roles or empty state
      const rolesSection = page.locator(
        '[data-testid="permission-roles-table"], .py-8',
      );

      await expect(rolesSection).toBeVisible();
    });

    test('should display groups containing this permission', async ({
      page,
    }) => {
      await permissionDetailsPage.switchToGroupsTab();

      // Should show either table with groups or empty state
      const groupsSection = page.locator(
        '[data-testid="permission-groups-table"], .py-8',
      );

      await expect(groupsSection).toBeVisible();
    });
  });
});
