import { Locator, Page } from '@playwright/test';

export class AuditLogsPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/logs');
  }

  getAuthorInput(): Locator {
    return this.page.getByPlaceholder('Search by Account ID...');
  }

  async setAuthor(author: string) {
    await this.getAuthorInput().fill(author);
  }

  getFiltersToggle(): Locator {
    return this.page.getByRole('button', { name: /filters/i });
  }

  async openFilters() {
    await this.getFiltersToggle().click();
  }

  getActionCheckbox(action: string): Locator {
    return this.page.getByRole('menuitemcheckbox', { name: action });
  }

  async toggleAction(action: string) {
    await this.openFilters();
    await this.openActionsFilter();
    await this.getActionCheckbox(action).click();
  }

  getActionsFilter(): Locator {
    return this.page.getByRole('button', { name: 'Actions' });
  }

  async openActionsFilter() {
    await this.getActionsFilter().click();
  }

  getApplyButton(): Locator {
    return this.page.getByRole('button', { name: /apply/i });
  }

  async applyFilters() {
    await Promise.all([this.getApplyButton().click()]);
  }

  getAuditLogsTable(): Locator {
    return this.page.getByTestId('audit-logs-table');
  }

  getRowByRecordId(id: string): Locator {
    // rows display ID truncated to 15 characters when long
    const shortId = id.substring(0, 8);

    return this.getAuditLogsTable().getByText(shortId, { exact: false });
  }
}
