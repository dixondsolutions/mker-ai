import { Locator, Page } from '@playwright/test';

export class GlobalSearchPageObject {
  constructor(private page: Page) {}

  // Main global search input that triggers the dialog
  getGlobalSearchInput(): Locator {
    return this.page.getByTestId('global-search-input');
  }

  // The search dialog/modal
  getGlobalSearchDialog(): Locator {
    return this.page.getByTestId('global-search-dialog');
  }

  // The search input inside the dialog
  getSearchInput(): Locator {
    return this.page.getByTestId('global-search-command-input');
  }

  // Search results container - use first() to handle multiple results
  getSearchResults(): Locator {
    return this.page.getByTestId('global-search-result').first();
  }

  // All search results
  getAllSearchResults(): Locator {
    return this.page.getByTestId('global-search-result');
  }

  // Specific search result by title
  getSearchResultByTitle(title: string): Locator {
    return this.page
      .getByTestId('global-search-result-title')
      .filter({ hasText: title });
  }

  // No results message
  getNoResultsMessage(): Locator {
    return this.page.getByTestId('global-search-no-results');
  }

  // Loading spinner
  getLoadingSpinner(): Locator {
    return this.page.getByTestId('global-search-loading');
  }

  // Error message (if any)
  getErrorMessage(): Locator {
    return this.page.getByTestId('global-search-error');
  }

  // Cancel button
  getCancelButton(): Locator {
    return this.page.getByTestId('global-search-cancel');
  }

  // Actions
  async openGlobalSearch() {
    await this.getGlobalSearchInput().click();
    await this.getGlobalSearchDialog().waitFor({ state: 'visible' });
  }

  async openGlobalSearchWithKeyboard() {
    await this.page.keyboard.press('Meta+k');
    await this.getGlobalSearchDialog().waitFor({ state: 'visible' });
  }

  async closeGlobalSearch() {
    await this.getCancelButton().click();
    await this.getGlobalSearchDialog().waitFor({ state: 'hidden' });
  }

  async closeGlobalSearchWithKeyboard() {
    await this.page.keyboard.press('Escape');
    await this.getGlobalSearchDialog().waitFor({ state: 'hidden' });
  }

  async searchFor(query: string) {
    const searchInput = this.getSearchInput();
    await searchInput.fill(query);
    // Wait a bit for debouncing and search to execute
    await this.page.waitForTimeout(1200);
  }

  async typeInSearchInput(text: string) {
    const searchInput = this.getSearchInput();
    await searchInput.type(text);
  }

  async clearSearch() {
    const searchInput = this.getSearchInput();
    await searchInput.fill('');
  }

  async clickSearchResult(title: string) {
    const result = this.getSearchResultByTitle(title);
    await result.click();
  }

  async waitForSearchResults() {
    await this.getSearchResults().waitFor({ state: 'visible' });
  }

  async waitForNoResults() {
    await this.getNoResultsMessage().waitFor({ state: 'visible' });
  }

  // Helper to get all search result titles
  async getAllSearchResultTitles(): Promise<string[]> {
    const titles = this.page.getByTestId('global-search-result-title');
    return await titles.allTextContents();
  }

  // Helper to verify search result count
  async getSearchResultCount(): Promise<number> {
    return await this.getAllSearchResults().count();
  }
}
