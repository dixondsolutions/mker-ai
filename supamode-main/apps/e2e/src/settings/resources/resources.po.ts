import { Page } from '@playwright/test';

export class ResourcesPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/settings/resources', {
      waitUntil: 'commit',
    });
  }

  getTable() {
    return this.page.getByTestId('resources-table');
  }

  getTableRows() {
    return this.getTable().getByRole('row');
  }

  goToResource(resourceName: string) {
    return this.getTableRows().filter({ hasText: resourceName }).click();
  }

  getDragHandle(tableName: string) {
    return this.getTableRows()
      .filter({ hasText: tableName })
      .getByRole('button')
      .first();
  }

  // Batch action methods
  getBatchActionsToolbar() {
    return this.page.getByTestId('batch-actions-toolbar');
  }

  getBatchEditButton() {
    return this.page.getByRole('button', { name: 'Batch Edit' });
  }

  getClearSelectionButton() {
    return this.page.getByRole('button', { name: 'Clear' });
  }

  getSelectAllCheckbox() {
    return this.getTable()
      .getByRole('row', { name: 'Display Name Schema Name' })
      .getByRole('checkbox');
  }

  getRowCheckbox(rowIndex: number) {
    return this.getTableRows().nth(rowIndex).getByRole('checkbox');
  }

  async selectTableByName(tableName: string) {
    const row = this.getTableRows().filter({ hasText: tableName });
    await row.getByRole('checkbox').check();
  }

  async selectMultipleTables(tableNames: string[]) {
    for (const tableName of tableNames) {
      await this.selectTableByName(tableName);
    }
  }

  async getSelectedTablesCount() {
    const toolbar = this.getBatchActionsToolbar();
    const countText = await toolbar.locator('span').first().textContent();
    const match = countText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  // Batch edit dialog methods
  getBatchEditDialog() {
    return this.page.getByRole('dialog');
  }

  getVisibilitySwitch() {
    return this.getBatchEditDialog().getByRole('switch');
  }

  getSaveChangesButton() {
    return this.getBatchEditDialog().getByRole('button', {
      name: 'Save Changes',
    });
  }

  getCancelButton() {
    return this.getBatchEditDialog().getByRole('button', { name: 'Cancel' });
  }

  async getTableVisibilityBadge(tableName: string) {
    const row = this.getTableRows().filter({ hasText: tableName });
    return row.locator('[data-testid="visibility-badge"]');
  }

  // Save/Revert button methods for explicit save behavior
  getSaveButton() {
    return this.getBatchActionsToolbar().getByRole('button', {
      name: /save/i,
    });
  }

  getRevertButton() {
    return this.getClearSelectionButton();
  }
}
