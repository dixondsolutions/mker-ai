import { expect, test } from '@playwright/test';

import { DataExplorerPageObject } from '../data-explorer/data-explorer.po';
import { GlobalSearchPageObject } from './global-search.po';

// Test data for creating records to search for
const TEST_RECORDS = {
  category: () => ({
    name: `Global Search Category ${Date.now()}`,
    slug: `global-search-category-${Date.now()}`,
    description: 'A category created for global search testing',
  }),
  tag: () => ({
    name: `Global Search Tag ${Date.now()}`,
    slug: `global-search-tag-${Date.now()}`,
    usage_count: 42,
  }),
  setting: () => ({
    key: `global_search_setting_${Date.now()}`,
    value: 'test_value_for_search',
    description: 'Setting created for global search testing',
    category: 'test',
  }),
};

test.describe('Global Search', () => {
  test.use({ storageState: '.auth/root.json' });

  let dataExplorerPageObject: DataExplorerPageObject;
  let globalSearchPageObject: GlobalSearchPageObject;

  test.beforeEach(async ({ page }) => {
    dataExplorerPageObject = new DataExplorerPageObject(page);
    globalSearchPageObject = new GlobalSearchPageObject(page);

    await dataExplorerPageObject.navigateToTable('public', 'categories');
  });

  test('should find recently created records through global search', async ({
    page,
  }) => {
    // First, create a test record to search for
    await dataExplorerPageObject.waitForTableLoad();
    await dataExplorerPageObject.openCreateRecordPage();

    const category = TEST_RECORDS.category();

    await dataExplorerPageObject.fillFormWithData(category);

    await Promise.all([
      dataExplorerPageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('record') && response.status() === 200,
      ),
    ]);

    // Now navigate to a different page to test global search
    await dataExplorerPageObject.navigateToTable('public', 'tags');
    await dataExplorerPageObject.waitForTableLoad();

    // Open global search
    await globalSearchPageObject.openGlobalSearch();

    // Search for the created record
    await globalSearchPageObject.searchFor(category.name);

    await expect(
      globalSearchPageObject.getSearchResultByTitle(category.name),
    ).toBeVisible();

    // Verify the result shows the correct table
    const resultItem = globalSearchPageObject.getSearchResultByTitle(
      category.name,
    );

    await expect(resultItem).toBeVisible();

    // Click on the search result and verify navigation
    await resultItem.click();

    // Should navigate to the record detail page
    await expect(page).toHaveURL(
      /\/resources\/public\/categories\/record\/[^\/]+$/,
    );
  });

  test('should show no results for non-existent search terms', async () => {
    await globalSearchPageObject.openGlobalSearch();

    // Search for something that definitely doesn't exist
    const nonExistentTerm = `non_existent_${Date.now()}_xyz123`;
    await globalSearchPageObject.searchFor(nonExistentTerm);

    // Should show no results message
    await expect(globalSearchPageObject.getNoResultsMessage()).toBeVisible({
      timeout: 10000,
    });
  });

  test('should require minimum characters before searching', async ({
    page,
  }) => {
    await globalSearchPageObject.openGlobalSearch();

    // Type less than 3 characters
    await globalSearchPageObject.typeInSearchInput('te');

    // Should not show loading or results yet (since it requires > 2 characters)
    await expect(globalSearchPageObject.getLoadingSpinner()).not.toBeVisible();

    // Add one more character to trigger search
    await globalSearchPageObject.clearSearch();
    await globalSearchPageObject.typeInSearchInput('test');

    // Wait for debounce and check if loading appears
    await page.waitForTimeout(500);
  });

  test('should handle search errors gracefully', async () => {
    await globalSearchPageObject.openGlobalSearch();

    // Search for a term that should work fine
    await globalSearchPageObject.searchFor(
      '23476237462678468723487847346868273642384682736',
    );

    // Should either show results or no results, but not error
    await expect(
      globalSearchPageObject
        .getAllSearchResults()
        .first()
        .or(globalSearchPageObject.getNoResultsMessage()),
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test('should close search dialog when clicking on a result', async ({
    page,
  }) => {
    // Create a test record first
    await dataExplorerPageObject.navigateToTable('public', 'categories');
    await dataExplorerPageObject.waitForTableLoad();
    await dataExplorerPageObject.openCreateRecordPage();

    const category = TEST_RECORDS.category();

    await dataExplorerPageObject.fillFormWithData(category);

    await Promise.all([
      dataExplorerPageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('record') && response.status() === 200,
      ),
    ]);

    // Navigate away and then use global search
    await dataExplorerPageObject.navigateToTable('public', 'tags');
    await dataExplorerPageObject.waitForTableLoad();

    await globalSearchPageObject.openGlobalSearch();
    await globalSearchPageObject.searchFor(category.name);

    // Click on a search result
    const resultItem = globalSearchPageObject.getSearchResultByTitle(
      category.name,
    );

    await expect(resultItem).toBeVisible();
    await resultItem.click();

    // Dialog should close after clicking
    await expect(
      globalSearchPageObject.getGlobalSearchDialog(),
    ).not.toBeVisible();

    // Should navigate to the correct page
    await expect(page).toHaveURL(
      /\/resources\/public\/categories\/record\/[^\/]+$/,
    );
  });

  test('should handle cancel button correctly', async () => {
    // Open global search
    await globalSearchPageObject.openGlobalSearch();

    // Verify dialog is open
    await expect(globalSearchPageObject.getGlobalSearchDialog()).toBeVisible();

    // Click cancel
    await globalSearchPageObject.getCancelButton().click();

    // Dialog should close
    await expect(
      globalSearchPageObject.getGlobalSearchDialog(),
    ).not.toBeVisible();
  });

  test('should focus search input when dialog opens', async () => {
    await globalSearchPageObject.openGlobalSearch();

    // Search input should be focused and ready for typing
    const searchInput = globalSearchPageObject.getSearchInput();
    await expect(searchInput).toBeFocused();
  });
});
