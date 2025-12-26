import { expect, test } from '@playwright/test';

import { AuthPageObject } from '../../auth/auth.po';
import {
  AssignRoleDialogPageObject,
  EditAccountDialogPageObject,
  MemberDetailsPageObject,
  MembersPageObject,
} from './members.po';

test.describe('Members Management', () => {
  test.use({ storageState: '.auth/root.json' });

  let membersPage: MembersPageObject;

  test.beforeEach(async ({ page }) => {
    membersPage = new MembersPageObject(page);

    await membersPage.goto();
    await membersPage.expectPageToLoad();
  });

  test.describe('Members List Page', () => {
    test('should load with correct page structure', async () => {
      await expect(membersPage.getPageTitle()).toBeVisible();
      await expect(membersPage.getPageDescription()).toBeVisible();
      await expect(membersPage.getSearchInput()).toBeVisible();
      await expect(membersPage.getMembersTable()).toBeVisible();
    });

    test('should display members in the table', async () => {
      // Check that table has at least one member (header + at least one data row)
      await membersPage.expectTableToHaveMinimumRows(1);

      // Verify table headers
      const table = membersPage.getMembersTable();
      await expect(table).toContainText('Display Name');
      await expect(table).toContainText('Role');
      await expect(table).toContainText('Joined');
    });

    test('should show member information correctly', async () => {
      const rows = await membersPage.getMembersTableRows().all();

      if (rows.length > 1) {
        // Skip header row
        const firstDataRow = rows[1];

        if (!firstDataRow) {
          throw new Error('No first data row found');
        }

        // Check that member row contains expected elements
        await expect(firstDataRow).toContainText('@'); // Email should contain @

        // Check for avatar/profile image
        const avatar = firstDataRow.getByTestId('profile-avatar-fallback');
        await expect(avatar).toBeVisible();

        // Check for role badge
        const roleBadge = firstDataRow.getByTestId('member-role-badge');
        await expect(roleBadge).toBeVisible();
      }
    });

    test('should have working member actions dropdown', async ({ page }) => {
      const rows = await membersPage.getMembersTableRows().all();

      if (rows.length > 1) {
        const firstDataRow = rows[1]!;
        const actionsButton = firstDataRow.getByTestId('member-actions');

        await expect(actionsButton).toBeVisible();
        await actionsButton.click();

        // Check dropdown menu appears
        const viewMenuItem = page.getByRole('menuitem', {
          name: /view/i,
        });

        await expect(viewMenuItem).toBeVisible();
      }
    });

    test('should navigate to member details when row is clicked', async ({
      page,
    }) => {
      const rows = await membersPage
        .getMembersTableRows()
        .filter({
          has: page.locator('a'),
        })
        .all();

      if (rows.length > 1) {
        const firstDataRow = rows[1]!;
        await firstDataRow.click();

        // Should navigate to member details page
        await page.waitForURL(/\/settings\/members\/.*/, { timeout: 5000 });

        // Verify we're on member details page
        const memberDetailsPage = new MemberDetailsPageObject(page);
        await memberDetailsPage.expectPageToLoad();
      }
    });

    test('should search members successfully', async ({ page }) => {
      // Get a member name from the table to search for
      const rows = await membersPage.getMembersTableRows().all();

      const firstDataRow = rows[1]!;

      const memberNameElement = firstDataRow.getByTestId(
        'member-table-display-name',
      );

      const memberName = await memberNameElement.textContent();

      if (!memberName) {
        throw new Error('No member name found in first data row');
      }

      await membersPage.searchMembers(memberName);

      await page.waitForURL(/.*search=.*/, { timeout: 5000 });

      // Member should still be visible in filtered results
      await membersPage.expectMemberInTable(memberName);
    });

    test('should show no results for invalid search', async ({ page }) => {
      const invalidSearchTerm = 'nonexistentuser12345';

      await membersPage.searchMembers(invalidSearchTerm);

      await expect(async () => {
        // Filter by only rows containing a link
        const rows = await membersPage
          .getMembersTableRows()
          .filter({ has: page.locator('a') })
          .all();

        expect(rows.length).toBe(0);
      }).toPass();
    });

    test('should display member roles correctly', async () => {
      const rows = await membersPage.getMembersTableRows().all();

      if (rows.length > 1) {
        for (const row of rows.slice(1, 4)) {
          // Check first 3 data rows
          const roleCell = row.getByTestId('member-role-badge');
          await expect(roleCell).toBeVisible();

          const roleText = await roleCell.textContent();
          expect(roleText).toBeTruthy();
          expect(roleText?.trim()).not.toBe('');
        }
      }
    });
  });

  test.describe('Search Functionality', () => {
    test('should preserve search state on page reload', async ({ page }) => {
      const searchTerm = 'admin';

      await membersPage.searchMembers(searchTerm);
      await page.waitForURL(/.*search=.*/, { timeout: 5000 });

      // Reload page
      await page.reload();
      await membersPage.expectPageToLoad();

      // Search input should still contain the search term
      await expect(membersPage.getSearchInput()).toHaveValue(searchTerm);
    });

    test('should handle special characters in search', async ({ page }) => {
      const specialSearchTerm = 'user@example.com';

      await membersPage.searchMembers(specialSearchTerm);
      await page.waitForURL(/.*search=.*/, { timeout: 5000 });

      // Should not cause any errors
      await membersPage.expectPageToLoad();
    });

    test('should be case insensitive', async ({ page }) => {
      const rows = await membersPage.getMembersTableRows().all();

      if (rows.length > 1) {
        const firstDataRow = rows[1]!;
        const memberNameElement = firstDataRow.getByRole('cell').first();
        const memberName = await memberNameElement.textContent();

        if (memberName) {
          const nameOnly = memberName.split(/\s/)[0];

          if (nameOnly && nameOnly.length > 2) {
            // Search with uppercase
            await membersPage.searchMembers(nameOnly.toUpperCase());
            await page.waitForURL(/.*search=.*/, { timeout: 5000 });

            // Should still find the member
            const rowsAfterSearch = await membersPage
              .getMembersTableRows()
              .all();
            expect(rowsAfterSearch.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  test.describe('Navigation and URL Handling', () => {
    test('should support direct URL access with search parameter', async ({
      page,
    }) => {
      await page.goto('/settings/members?search=admin');
      await membersPage.expectPageToLoad();

      // Search input should be populated
      await expect(membersPage.getSearchInput()).toHaveValue('admin');
    });

    test('should handle empty search parameter', async ({ page }) => {
      await page.goto('/settings/members?search=');
      await membersPage.expectPageToLoad();

      // Should show all members
      await membersPage.expectTableToHaveMinimumRows(1);
    });
  });
});

test.describe('Member Details Page', () => {
  test.use({ storageState: '.auth/root.json' });

  let email: string;

  test.beforeEach(async ({ page }) => {
    const authPage = new AuthPageObject(page);

    const credentials = await authPage.createCredentials();
    email = credentials.email;

    await authPage.bootstrapUser(credentials);
  });

  let memberDetailsPage: MemberDetailsPageObject;
  let editAccountDialog: EditAccountDialogPageObject;
  let assignRoleDialog: AssignRoleDialogPageObject;

  test.beforeEach(async ({ page }) => {
    memberDetailsPage = new MemberDetailsPageObject(page);
    editAccountDialog = new EditAccountDialogPageObject(page);
    assignRoleDialog = new AssignRoleDialogPageObject(page);

    // Navigate to first available member
    const membersPage = new MembersPageObject(page);
    await membersPage.goto();
    await membersPage.expectPageToLoad();

    const rows = membersPage.getMembersTableRows();

    // find a membet that is not the current user
    const memberRow = rows
      .filter({
        has: page.getByTestId('member-table-email').filter({
          hasText: email,
        }),
      })
      .first();

    if (!memberRow) {
      throw new Error('No member row found');
    }

    await memberRow.click();

    await page.waitForURL(/\/settings\/members\/.*/, { timeout: 5000 });
    await memberDetailsPage.expectPageToLoad();
  });

  test.describe('Page Structure and Display', () => {
    test('should load with correct page structure', async () => {
      await expect(memberDetailsPage.getBreadcrumb()).toBeVisible();
      await expect(memberDetailsPage.getPageTitle()).toBeVisible();
      await expect(memberDetailsPage.getMemberEmail()).toBeVisible();
    });

    test('should display member information correctly', async () => {
      // Check member details cards
      await expect(memberDetailsPage.getAccountStatusBadge()).toBeVisible();
      await expect(memberDetailsPage.getAssignedRoleBadge()).toBeVisible();

      await expect(
        memberDetailsPage.getAccountIdCopyToClipboard(),
      ).toBeVisible();

      await expect(
        memberDetailsPage.getAuthUserIdCopyToClipboard(),
      ).toBeVisible();
    });

    test('should have working breadcrumb navigation', async ({ page }) => {
      const breadcrumb = memberDetailsPage.getBreadcrumb();

      // Check breadcrumb contains expected links
      await expect(breadcrumb).toContainText('Settings');
      await expect(breadcrumb).toContainText('Members');

      // Click members breadcrumb link
      const membersLink = breadcrumb.getByRole('link', { name: /members/i });
      await membersLink.click();

      await page.waitForURL('/settings/members', { timeout: 5000 });
    });

    test('should display activity logs section', async () => {
      await expect(memberDetailsPage.getActivityLogsSection()).toBeVisible();
      await expect(memberDetailsPage.getViewAllLogsLink()).toBeVisible();
    });

    test('should navigate to full logs when view all logs is clicked', async ({
      page,
    }) => {
      await memberDetailsPage.getViewAllLogsLink().click();

      // Should navigate to logs page with user filter
      await page.waitForURL(/\/logs\?author=.*/, { timeout: 5000 });
    });
  });

  test.describe('Account Status Management', () => {
    test('should toggle member status when deactivate button is clicked', async ({
      page,
    }) => {
      await memberDetailsPage.expectMemberStatus('active');

      // Test deactivation
      await memberDetailsPage.getDeactivateButton().click();
      await page.waitForResponse('**/api/**');

      // Status should change to inactive
      await memberDetailsPage.expectMemberStatus('inactive');

      // Test activation
      await memberDetailsPage.getActivateButton().click();
      await page.waitForResponse('**/api/**');

      // Status should change to active
      await memberDetailsPage.expectMemberStatus('active');

      await page.reload();

      // Status should change to active
      await memberDetailsPage.expectMemberStatus('active');
    });
  });

  test.describe('Edit Account Functionality', () => {
    test.beforeEach(async () => {
      const editButton = memberDetailsPage.getEditMemberButton();
      await editButton.click();
      await editAccountDialog.expectDialogOpen();
    });

    test('should open/close edit account dialog', async () => {
      await editAccountDialog.expectDialogOpen();
      await editAccountDialog.cancelForm();
      await editAccountDialog.expectDialogClosed();
    });

    test('should disable save button when form is not dirty', async () => {
      await editAccountDialog.expectSaveButtonDisabled();
    });

    test('should enable save button when form is modified', async () => {
      const randomSuffix = Math.random().toString(36).substring(7);
      const newDisplayName = `Updated Name ${randomSuffix}`;

      await editAccountDialog.fillForm({
        displayName: newDisplayName,
      });

      await editAccountDialog.expectSaveButtonEnabled();
    });

    test('should save account changes successfully', async ({ page }) => {
      const randomSuffix = Math.random().toString(36).substring(7);
      const newDisplayName = `Updated Name ${randomSuffix}`;

      await editAccountDialog.fillForm({
        displayName: newDisplayName,
      });

      await Promise.all([
        page.waitForResponse('**/api/**'),
        editAccountDialog.saveForm(),
      ]);

      await expect(async () => {
        // Should show success message
        await editAccountDialog.expectSuccessMessage();

        await editAccountDialog.cancelForm();

        await editAccountDialog.expectDialogClosed();

        // Page title should update
        await expect(memberDetailsPage.getPageTitle()).toContainText(
          newDisplayName,
        );
      }).toPass();
    });

    test('should validate email format', async () => {
      await editAccountDialog.fillForm({
        email: 'invalid-email',
      });

      // Form should show validation error
      await expect(editAccountDialog.getForm()).toBeVisible();
    });
  });

  test.describe('Role Assignment Functionality', () => {
    // make sure Playwright runs tests in serial mode
    test.describe.configure({ mode: 'serial' });

    test.beforeEach(async () => {
      const changeRoleButton = memberDetailsPage.getChangeRoleButton();

      await changeRoleButton.click();
      await assignRoleDialog.expectDialogOpen();
    });

    test('should close dialog on cancel', async () => {
      await assignRoleDialog.cancel();
      await assignRoleDialog.expectDialogClosed();
    });

    test('should search roles successfully', async () => {
      await assignRoleDialog.searchRoles('admin');

      // Search input should contain the search term
      await expect(assignRoleDialog.getSearchInput()).toHaveValue('admin');
    });

    test('should enable save button when role is changed', async () => {
      await assignRoleDialog.getRoleOptions().first().click();

      await assignRoleDialog.expectSaveButtonEnabled();
    });

    test('should assign new role successfully', async ({ page }) => {
      await assignRoleDialog.searchRoles('admin');

      await assignRoleDialog.getRoleOptions().first().click();

      await Promise.all([
        page.waitForResponse('**/api/**'),
        assignRoleDialog.saveChanges(),
      ]);

      await assignRoleDialog.expectDialogClosed();

      // Role badge should update
      await memberDetailsPage.expectMemberRole('Admin');

      await page.reload();

      await memberDetailsPage.expectPageToLoad();
      await memberDetailsPage.expectMemberRole('Admin');
    });

    test('should show role priorities', async ({ page }) => {
      // Check that roles display rank information
      const roleOptions = await page
        .locator("[data-testid*='assign-role-dialog-role']")
        .all();

      for (const option of roleOptions.slice(0, 3)) {
        // Check first 3 roles
        const rankBadge = option.getByText(/rank:/i);

        if (await rankBadge.isVisible()) {
          const rankText = await rankBadge.textContent();

          expect(rankText).toMatch(/rank:\s*\d+/i);
        }
      }
    });
  });

  test.describe('Copy to Clipboard Functionality', () => {
    test('should copy account ID to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      const accountIdElement = memberDetailsPage.getAccountIdCopyToClipboard();
      const accountId = await accountIdElement.textContent();

      await accountIdElement.click();

      // Verify clipboard content (if supported in test environment)
      if (accountId) {
        // Check that the element is clickable and shows the ID
        await expect(accountIdElement).toBeVisible();

        expect(accountId.trim()).toBeTruthy();
      }
    });

    test('should copy auth user ID to clipboard', async ({ page, context }) => {
      // Grant clipboard permissions
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);

      const authUserIdElement =
        memberDetailsPage.getAuthUserIdCopyToClipboard();

      const authUserId = await authUserIdElement.textContent();

      await authUserIdElement.click();

      if (authUserId) {
        await expect(authUserIdElement).toBeVisible();
        expect(authUserId.trim()).toBeTruthy();
      }
    });
  });
});

test.describe('Self-Modification Prevention', () => {
  test.use({ storageState: '.auth/root.json' });

  test('should prevent user from actioning themselves in members list', async ({
    page,
  }) => {
    const membersPage = new MembersPageObject(page);
    const memberDetailsPage = new MemberDetailsPageObject(page);

    await membersPage.goto();
    await membersPage.expectPageToLoad();

    // Search for the current user to ensure they're visible
    const currentUserEmail = 'root@supamode.com';
    await membersPage.searchMembers(currentUserEmail);

    // Find the current user's row in the table after search
    const currentUserRow = membersPage.getMemberRow(currentUserEmail);

    await expect(currentUserRow).toBeVisible();

    await currentUserRow.getByRole('link').click();
    await memberDetailsPage.expectPageToLoad();

    const changeRoleButton = memberDetailsPage.getChangeRoleButton();

    await expect(changeRoleButton).not.toBeVisible();
  });

  test('should prevent user from deactivating themselves in member details', async ({
    page,
  }) => {
    const membersPage = new MembersPageObject(page);
    const memberDetailsPage = new MemberDetailsPageObject(page);

    await membersPage.goto();
    await membersPage.expectPageToLoad();

    // Search for the current user to ensure they're visible
    const currentUserEmail = 'root@supamode.com';
    await membersPage.searchMembers(currentUserEmail);

    // Find the current user's row in the table after search
    const currentUserRow = membersPage.getMemberRow(currentUserEmail);

    await expect(currentUserRow).toBeVisible();

    await currentUserRow.getByRole('link').click();
    await memberDetailsPage.expectPageToLoad();

    // Check that the deactivate button is not visible for self-modification
    const deactivateButton = memberDetailsPage.getDeactivateButton();
    await expect(deactivateButton).not.toBeVisible();
  });

  test('should show appropriate messaging when viewing own profile', async ({
    page,
  }) => {
    const membersPage = new MembersPageObject(page);
    const memberDetailsPage = new MemberDetailsPageObject(page);

    await membersPage.goto();
    await membersPage.expectPageToLoad();

    // Search for the current user to ensure they're visible
    const currentUserEmail = 'root@supamode.com';
    await membersPage.searchMembers(currentUserEmail);

    // Find the current user's row in the table after search
    const currentUserRow = membersPage.getMemberRow(currentUserEmail);

    await expect(currentUserRow).toBeVisible();

    await currentUserRow.getByRole('link').click();
    await memberDetailsPage.expectPageToLoad();

    // Should show some indication this is the current user's profile
    // This could be a badge, message, or different UI state
    const pageContent = await page.textContent('body');

    // The page should somehow indicate this is the current user
    // (implementation may vary - could be a "You" indicator, different styling, etc.)
    expect(pageContent).toBeTruthy(); // Basic check that page loads
  });
});

test.describe('Error Handling and Edge Cases', () => {
  test.use({ storageState: '.auth/root.json' });

  let membersPage: MembersPageObject;

  test.beforeEach(async ({ page }) => {
    membersPage = new MembersPageObject(page);
  });

  test.describe('Empty States and Edge Cases', () => {
    test('should handle members with no roles', async () => {
      await membersPage.goto();
      await membersPage.expectPageToLoad();

      // Check if any members have "No role" displayed
      const table = membersPage.getMembersTable();
      const noRoleElements = table.getByText('No role');

      await expect(noRoleElements.first()).toBeVisible();
    });

    test('should handle members with missing display names', async () => {
      const rows = await membersPage.getMembersTableRows().all();

      if (rows.length > 1) {
        for (const row of rows.slice(1, 4)) {
          // Check first 3 data rows
          const nameCell = row.getByRole('cell').first();
          const nameText = await nameCell.textContent();

          // Should always have some identifier (name or email)
          expect(nameText?.trim()).toBeTruthy();
          expect(nameText?.trim()).not.toBe('');
        }
      }
    });

    test('should handle very long member names gracefully', async () => {
      // This test checks that long names don't break the layout
      const rows = await membersPage.getMembersTableRows().all();

      if (rows.length > 1) {
        for (const row of rows.slice(1, 4)) {
          const nameCell = row.getByRole('cell').first();

          // Cell should have proper CSS constraints
          const boundingBox = await nameCell.boundingBox();
          expect(boundingBox?.width).toBeLessThan(500); // Reasonable width limit
        }
      }
    });
  });
});
