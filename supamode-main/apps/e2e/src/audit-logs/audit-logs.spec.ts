import { expect, test } from '@playwright/test';

import { DataExplorerPageObject } from '../data-explorer/data-explorer.po';
import {
  PermissionDetailsPageObject,
  PermissionsPageObject,
} from '../settings/permissions/permissions.po';
import { AuditLogsPageObject } from './audit-logs.po';

// Helper to extract record id from a record page URL
function extractId(url: string): string {
  const match = url.match(/([^\/]+)$/);

  return match ? match[1]! : '';
}

const createTag = () => ({
  name: `Test Tag Tag ${Date.now()}`,
  slug: `test-tag-${Date.now()}`,
  usage_count: 0,
  color: '#000000',
});

test.describe('Audit Logs', () => {
  test.use({ storageState: '.auth/root.json' });

  let dataExplorer: DataExplorerPageObject;
  let auditLogs: AuditLogsPageObject;

  test.beforeEach(async ({ page }) => {
    dataExplorer = new DataExplorerPageObject(page);
    auditLogs = new AuditLogsPageObject(page);
  });

  test('should log record creation and permission update', async ({ page }) => {
    await dataExplorer.navigateToTable('public', 'tags');
    await dataExplorer.waitForTableLoad();
    await dataExplorer.openCreateRecordPage();

    await dataExplorer.fillFormWithData(createTag());

    await Promise.all([
      dataExplorer.submitRecordForm(),
      page.waitForResponse(
        (res) => res.url().includes('record') && res.status() === 200,
      ),
    ]);

    await expect(page).toHaveURL(/\/resources\/public\/tags\/record\/[^\/]+$/);

    const recordId = extractId(page.url());

    // verify insert audit log
    await auditLogs.goto();
    await auditLogs.toggleAction('INSERT');
    await auditLogs.applyFilters();

    await expect(auditLogs.getRowByRecordId(recordId)).toBeVisible();

    // modify a permission
    const permissions = new PermissionsPageObject(page);
    await permissions.goto('permissions');
    await permissions.expectTableToLoad('permissions');
    const rows = permissions.getTableRows('permissions');

    await rows.nth(1).click();

    await page.waitForURL(/\/settings\/permissions\/[^\/]+$/);
    const permissionId = extractId(page.url());
    const details = new PermissionDetailsPageObject(page);
    await details.expectPageToLoad();

    await details.getEditPermissionButton().click();
    await expect(page.getByTestId('permission-form')).toBeVisible();

    const newDescription = `updated ${Date.now()}`;

    await page
      .getByTestId('permission-form-description-textarea')
      .fill(newDescription);

    await Promise.all([
      page.getByRole('button', { name: /save/i }).click(),
      page.waitForResponse(
        (res) =>
          res.url().includes('/permissions/') &&
          res.request().method() === 'PUT',
      ),
    ]);

    await expect(page.getByRole('dialog')).not.toBeVisible();

    // verify update audit log
    await auditLogs.goto();
    await auditLogs.toggleAction('UPDATE');
    await auditLogs.applyFilters();

    await expect(
      auditLogs.getRowByRecordId(permissionId).first(),
    ).toBeVisible();
  });
});
