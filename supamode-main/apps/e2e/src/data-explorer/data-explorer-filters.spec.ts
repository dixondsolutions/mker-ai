import { expect, test } from '@playwright/test';

import { DataExplorerPageObject } from './data-explorer.po';

test.describe('Data Explorer - Advanced Filtering', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test.describe('Text Operators', () => {
    test('should filter using equals operator', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Add a filter for the name column
      await pageObject.addFilter('Name');
      await pageObject.selectFilterOperator('Is');
      await pageObject.setFilterValue('Test Category');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/name\.eq=Test\+Category/);

      // Verify filter badge is visible
      const filterBadge = pageObject.getFilterBadge('Name');
      await expect(filterBadge).toBeVisible();
      await expect(filterBadge).toContainText('Test Category');
    });

    test('should filter using contains operator', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.selectFilterOperator('Contains');
      await pageObject.setFilterValue('Test');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/name\.contains=Test/);

      // Verify filter badge shows correct operator
      const filterBadge = pageObject.getFilterBadge('Name');
      await expect(filterBadge).toContainText('Test');
    });

    test('should filter using starts with operator', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.selectFilterOperator('Starts with');
      await pageObject.setFilterValue('Test');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/name\.startsWith=Test/);

      // Verify filter badge shows correct operator
      const filterBadge = pageObject.getFilterBadge('Name');
      await expect(filterBadge).toContainText('Test');
    });

    test('should filter using ends with operator', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.selectFilterOperator('Ends with');
      await pageObject.setFilterValue('Category');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/name\.endsWith=Category/);

      // Verify filter badge shows correct operator
      const filterBadge = pageObject.getFilterBadge('Name');
      await expect(filterBadge).toContainText('Category');
    });

    test('should filter using not equals operator', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Name');
      await pageObject.selectFilterOperator('Is not');
      await pageObject.setFilterValue('Test Category');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/name\.neq=Test\+Category/);

      // Verify filter badge shows correct operator
      const filterBadge = pageObject.getFilterBadge('Name');
      await expect(filterBadge).toContainText('Test Category');
    });
  });

  test.describe('Numeric Operators', () => {
    test('should filter using equals operator for numbers', async ({
      page,
    }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Sort Order');
      await pageObject.selectFilterOperator('Is');
      await pageObject.setFilterValue('1');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/sort_order\.eq=1/);

      // Verify filter badge
      const filterBadge = pageObject.getFilterBadge('Sort Order');
      await expect(filterBadge).toContainText('1');
    });

    test('should filter using greater than operator', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Sort Order');
      await pageObject.selectFilterOperator('Is greater than');
      await pageObject.setFilterValue('5');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/sort_order\.gt=5/);

      // Verify filter badge shows correct operator
      const filterBadge = pageObject.getFilterBadge('Sort Order');
      await expect(filterBadge).toContainText('5');
    });

    test('should filter using less than operator', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Sort Order');
      await pageObject.selectFilterOperator('Is less than');
      await pageObject.setFilterValue('10');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/sort_order\.lt=10/);

      // Verify filter badge shows correct operator
      const filterBadge = pageObject.getFilterBadge('Sort Order');
      await expect(filterBadge).toContainText('10');
    });

    test('should filter using between operator for numbers', async ({
      page,
    }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Sort Order');
      await pageObject.selectFilterOperator('Is between');
      await pageObject.setFilterRangeValue('1', '10');
      await pageObject.applyFilter();

      // Verify filter appears in URL
      await page.waitForURL(/sort_order\.between=1%2C10/);

      // Verify filter badge shows range
      const filterBadge = pageObject.getFilterBadge('Sort Order');
      await expect(filterBadge).toContainText('1 and 10');
    });
  });

  test.describe('Boolean Operators', () => {
    test('should filter boolean true values', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Is Active');
      await pageObject.selectFilterOperator('Is');
      await pageObject.selectBooleanValue(true);

      // Verify filter appears in URL
      await page.waitForURL(/is_active\.eq=true/);

      // Verify filter badge shows boolean value
      const filterBadge = pageObject.getFilterBadge('Is Active');
      await expect(filterBadge).toContainText('True');
    });

    test('should filter boolean false values', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Is Active');
      await pageObject.selectFilterOperator('Is');
      await pageObject.selectBooleanValue(false);

      // Verify filter appears in URL
      await page.waitForURL(/is_active\.eq=false/);

      // Verify filter badge shows boolean value
      const filterBadge = pageObject.getFilterBadge('Is Active');
      await expect(filterBadge).toContainText('False');
    });
  });

  test.describe('Null Operators', () => {
    test('should filter null values', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Description');
      await pageObject.selectFilterOperator('Is empty');

      // No value input needed for null filters
      // Verify filter appears in URL
      await page.waitForURL(/description\.isNull=true/);

      // Verify filter badge shows null filter
      const filterBadge = pageObject.getFilterBadge('Description');
      await expect(filterBadge).toContainText('empty');
    });

    test('should filter not null values', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Description');
      await pageObject.selectFilterOperator('Is not empty');

      // Verify filter appears in URL
      await page.waitForURL(/description\.notNull=true/);

      // Verify filter badge shows not null filter
      const filterBadge = pageObject.getFilterBadge('Description');
      await expect(filterBadge).toContainText('not empty');
    });
  });

  test.describe('Date Operators', () => {
    test('should filter using relative date - today', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Created At');
      await pageObject.selectFilterOperator('Is');
      await pageObject.selectRelativeDate('today');

      // Verify filter appears in URL with relative date format
      await page.waitForURL(/created_at\.eq=__rel_date%3Atoday/);

      // Verify filter badge shows relative date
      const filterBadge = pageObject.getFilterBadge('Created At');
      await expect(filterBadge).toContainText('Today');
    });

    test('should filter using relative date - last week', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Created At');
      await pageObject.selectFilterOperator('Is after');
      await pageObject.selectRelativeDate('Last Week');

      // Verify filter appears in URL
      await page.waitForURL(/created_at\.gt=__rel_date%3AlastWeek/);

      // Verify filter badge shows relative date
      const filterBadge = pageObject.getFilterBadge('Created At');
      await expect(filterBadge).toContainText('Last week');
    });

    test('should filter using custom date picker', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Created At');
      await pageObject.selectFilterOperator('Is after');
      await pageObject.selectCustomDate();

      // Pick a specific date
      await pageObject.selectDateInCalendar(new Date());

      // Verify filter appears in URL with ISO date end of day
      await page.waitForURL(new RegExp(`created_at\.gt=`));
    });

    test('should filter using date range (between)', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      await pageObject.addFilter('Created At');
      await pageObject.selectFilterOperator('Is between');

      // Set date range
      const startDate = new Date();
      const endDate = new Date();
      await pageObject.setDateRange(startDate, endDate);

      await page.waitForURL(new RegExp(`created_at\.between=`));

      // Verify filter badge shows date range
      const filterBadge = pageObject.getFilterBadge('Created At');
      await expect(filterBadge).toContainText('between');
    });
  });

  test.describe('Multiple Filters', () => {
    test('should combine multiple filters with AND logic', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Add first filter
      await pageObject.addFilter('Name');
      await pageObject.selectFilterOperator('Contains');
      await pageObject.setFilterValue('Test');
      await pageObject.applyFilter();

      // Add second filter
      await pageObject.addFilter('Is Active');
      await pageObject.selectFilterOperator('Is');
      await pageObject.selectBooleanValue(true);

      // Verify both filters appear in URL
      await page.waitForURL(/name\.contains=Test/);
      await page.waitForURL(/is_active\.eq=true/);

      // Verify both filter badges are visible
      const nameFilter = pageObject.getFilterBadge('Name');
      const activeFilter = pageObject.getFilterBadge('Is Active');

      await expect(nameFilter).toBeVisible();
      await expect(activeFilter).toBeVisible();
    });

    test('should allow removing individual filters', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Add multiple filters
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('Test');
      await pageObject.applyFilter();

      await pageObject.addFilter('Is Active');
      await pageObject.selectFilterOperator('Is');
      await pageObject.selectBooleanValue(true);

      // Remove first filter
      await pageObject.removeFilter('Name');

      // Verify only second filter remains
      await page.waitForURL(/is_active\.eq=true/);
      await expect(page).not.toHaveURL(/name\./);

      const nameFilter = pageObject.getFilterBadge('name');
      const activeFilter = pageObject.getFilterBadge('Is Active');

      await expect(nameFilter).not.toBeVisible();
      await expect(activeFilter).toBeVisible();
    });

    test('should clear all filters', async ({ page }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Add multiple filters
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('Test');
      await pageObject.applyFilter();

      await pageObject.addFilter('Is Active');
      await pageObject.selectFilterOperator('Is');
      await pageObject.selectBooleanValue(true);

      // Clear all filters
      await pageObject.clearAllFilters();

      // Verify URL has no filter parameters
      await expect(page).not.toHaveURL(/name\./);
      await expect(page).not.toHaveURL(/is_active\./);

      // Verify no filter badges are visible
      const filterContainer = page.locator('[data-testid="filters-container"]');
      const filterBadges = filterContainer.locator(
        '[data-testid="filter-badge"]',
      );
      await expect(filterBadges).toHaveCount(0);
    });
  });

  test.describe('Filter Persistence', () => {
    test('should preserve filters in URL after page refresh', async ({
      page,
    }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Add filter
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('Test');
      await pageObject.applyFilter();
      await page.waitForURL(/name\.eq=Test/);

      // Refresh page
      await page.reload();
      await pageObject.waitForTableLoad();

      // Verify filter is restored from URL
      await page.waitForURL(/name\.eq=Test/);

      const filterBadge = pageObject.getFilterBadge('Name');
      await expect(filterBadge).toBeVisible();
      await expect(filterBadge).toContainText('Test');
    });

    test('should preserve filters when navigating between records', async ({
      page,
    }) => {
      await pageObject.navigateToTable('public', 'categories');
      await pageObject.waitForTableLoad();

      // Add filter
      await pageObject.addFilter('Name');
      await pageObject.setFilterValue('Test');
      await pageObject.applyFilter();
      await page.waitForURL(/name\.eq=Test/);

      // reload the page
      await page.reload();
      await pageObject.waitForTableLoad();

      // Verify filter is restored from URL
      await page.waitForURL(/name\.eq=Test/);
    });
  });
});
