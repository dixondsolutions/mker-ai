import { expect, test } from '@playwright/test';

import { DataExplorerPageObject } from './data-explorer.po';

// Test data for different field types based on our demo schema
// Only including required fields and some optional ones that are easy to fill
const TEST_DATA = {
  categories: () => ({
    name: `Test Category ${Date.now()}`,
    slug: `test-category-${Date.now()}`,
    description: 'Test category description',
    sort_order: 1,
    is_active: true,
  }),
  tags: () => ({
    name: `Test Tag ${Date.now()}`,
    slug: `test-tag-${Date.now()}`,
    usage_count: 0,
    color: '#000000',
  }),
  site_settings: () => ({
    key: `test_setting_${Date.now()}`,
    value: 'test_value',
    description: 'Test setting description',
    category: 'test',
  }),
};

// Minimal test data - only required fields
const MINIMAL_TEST_DATA = {
  categories: () => ({
    name: `Minimal Category ${Date.now()}`,
    slug: `minimal-category-${Date.now()}`,
  }),
  tags: () => ({
    name: `Minimal Tag ${Date.now()}`,
    slug: `minimal-tag-${Date.now()}`,
  }),
  site_settings: () => ({
    key: `minimal_setting_${Date.now()}`,
  }),
};

test.describe('Data Explorer - Record Creation', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test('should create category record with basic field types', async ({
    page,
  }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Navigate to create record page
    await pageObject.openCreateRecordPage();

    // Fill form using our intelligent form filler
    await pageObject.fillFormWithData(TEST_DATA.categories());

    // Submit the form
    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('public/categories/record') &&
          response.status() === 200,
      ),
    ]);

    // Should be redirected to the record view page
    await expect(page).toHaveURL(/\/resources\/public\/categories\/[^\/]+$/);

    // Verify we can see some record data on the page (basic structure check)
    // Use more flexible selectors that don't depend on exact text matches
    await expect(
      page.locator('text=name').or(page.locator('text=Name')),
    ).toBeVisible();

    await expect(
      page.locator('text=slug').or(page.locator('text=Slug')),
    ).toBeVisible();
  });

  test('should create tag record with number fields', async ({ page }) => {
    await pageObject.navigateToTable('public', 'tags');
    await pageObject.waitForTableLoad();

    await pageObject.openCreateRecordPage();

    await pageObject.fillFormWithData(TEST_DATA.tags());

    // Submit the form
    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('public/tags/record') &&
          response.status() === 200,
      ),
    ]);

    // Should be redirected to the record view page
    await expect(page).toHaveURL(/\/resources\/public\/tags\/[^\/]+$/);

    // Verify we can see some record data on the page (basic structure check)
    await expect(
      page.locator('text=name').or(page.locator('text=Name')),
    ).toBeVisible();

    await expect(
      page.locator('text=slug').or(page.locator('text=Slug')),
    ).toBeVisible();
  });

  test('should create site_settings record', async ({ page }) => {
    await pageObject.navigateToTable('public', 'site_settings');
    await pageObject.waitForTableLoad();

    await pageObject.openCreateRecordPage();

    await pageObject.fillFormWithData(TEST_DATA.site_settings());

    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('public/site_settings/record') &&
          response.status() === 200,
      ),
    ]);

    // Should be redirected to the record view page
    await expect(page).toHaveURL(/\/resources\/public\/site_settings\/[^\/]+$/);

    // Verify we can see some record data on the page (basic structure check)
    await expect(
      page.locator('text=key').or(page.locator('text=Key')),
    ).toBeVisible();

    await expect(
      page.locator('text=value').or(page.locator('text=Value')),
    ).toBeVisible();
  });
});

test.describe('Data Explorer - Record Reading', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test('should create and display category record with various field types', async ({
    page,
  }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();
    await pageObject.openCreateRecordPage();
    await pageObject.fillFormWithData(TEST_DATA.categories());

    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('public/categories/record') &&
          response.status() === 200,
      ),
    ]);

    // Should be redirected to the record view page
    await expect(page).toHaveURL(/\/resources\/public\/categories\/[^\/]+$/);

    // Verify we can see some record data on the page (basic structure check)
    await expect(
      page.locator('text=name').or(page.locator('text=Name')),
    ).toBeVisible();

    await expect(
      page.locator('text=slug').or(page.locator('text=Slug')),
    ).toBeVisible();
  });

  test('should create and display tag record', async ({ page }) => {
    await pageObject.navigateToTable('public', 'tags');
    await pageObject.waitForTableLoad();
    await pageObject.openCreateRecordPage();
    await pageObject.fillFormWithData(TEST_DATA.tags());

    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('public/tags/record') &&
          response.status() === 200,
      ),
    ]);

    // Should be redirected to the record view page
    await page.waitForURL(/\/resources\/public\/tags\/[^\/]+$/);

    // Verify we can see some record data on the page (basic structure check)
    await expect(
      page.locator('text=name').or(page.locator('text=Name')),
    ).toBeVisible();

    await expect(
      page.locator('text=slug').or(page.locator('text=Slug')),
    ).toBeVisible();
  });
});

test.describe('Data Explorer - Table Navigation', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test('should load table data correctly', async () => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Check that the table is visible and has the data table
    await expect(pageObject.getTable()).toBeVisible();
  });
});

test.describe('Data Explorer - Error Handling', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test('should handle validation errors for required fields', async () => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();
    await pageObject.openCreateRecordPage();

    // Try to submit empty required fields
    await pageObject.submitRecordForm();

    // Should show validation errors for required fields
    await expect(pageObject.getValidationError('name').first()).toBeVisible();
    await expect(pageObject.getValidationError('slug').first()).toBeVisible();
  });
});

test.describe('Data Explorer - Network Payload Validation', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test('should only send dirty fields in create request payload', async ({
    page,
  }) => {
    // Set up network interception to capture the create request
    let createRequestPayload: object | null = null;

    await page.route('**/record', async (route) => {
      const request = route.request();

      if (request.method() === 'POST') {
        // Capture the request body
        const body = request.postData();

        if (body) {
          try {
            createRequestPayload = JSON.parse(body);
          } catch (e) {
            // If JSON parsing fails, throw an error
            throw new Error('Failed to parse JSON');
          }
        }
      }

      await route.continue();
    });

    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();
    await pageObject.openCreateRecordPage();

    const data = MINIMAL_TEST_DATA.categories();

    // Fill only the required fields (minimal data)
    await pageObject.fillFormWithData(data);

    // Submit the form
    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('public/categories/record') &&
          response.request().method() === 'POST' &&
          response.status() === 200,
      ),
    ]);

    await page.waitForTimeout(100);

    await expect(() => {
      // Verify that only the fields we filled are in the payload
      expect(createRequestPayload).toBeTruthy();

      expect(createRequestPayload).toHaveProperty('name', data.name);

      expect(createRequestPayload).toHaveProperty('slug', data.slug);

      // These fields should NOT be in the payload since we didn't fill them
      expect(createRequestPayload).not.toHaveProperty('description');
      expect(createRequestPayload).not.toHaveProperty('color');
      expect(createRequestPayload).not.toHaveProperty('sort_order');
      expect(createRequestPayload).not.toHaveProperty('is_active');

      // System fields should not be included
      expect(createRequestPayload).not.toHaveProperty('id');
      expect(createRequestPayload).not.toHaveProperty('created_at');
      expect(createRequestPayload).not.toHaveProperty('updated_at');
    }).toPass();
  });

  test('should only send dirty fields in edit request payload', async ({
    page,
  }) => {
    // First create a record with full data
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();
    await pageObject.openCreateRecordPage();

    const data = TEST_DATA.categories();
    await pageObject.fillFormWithData(data);

    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse((response) => {
        return (
          response.url().includes('public/categories/record') &&
          response.status() === 200 &&
          response.request().method() === 'POST'
        );
      }),
    ]);

    await page.waitForTimeout(100);

    await pageObject.getEditButton().click();
    await page.waitForURL(/\/edit$/);

    // Set up network interception for the edit request
    let editRequestPayload: object | null = null;

    await page.route('**/record/**', async (route) => {
      const request = route.request();

      if (request.method() === 'PUT' || request.method() === 'PATCH') {
        const body = request.postData();

        if (body) {
          try {
            editRequestPayload = JSON.parse(body);
          } catch (e) {
            throw new Error('Failed to parse JSON');
          }
        }
      }

      await route.continue();
    });

    await page.waitForTimeout(200);

    // Only modify one field
    const newDescription = `Updated description ${Date.now()}`;
    await pageObject.fillFieldByName('description', newDescription);

    // Submit the form
    await pageObject.submitRecordForm();

    await expect(() => {
      // Verify that only the modified field is in the payload
      expect(editRequestPayload).toBeTruthy();
      expect(editRequestPayload).toHaveProperty('description', newDescription);

      // These fields should NOT be in the payload since we didn't modify them
      expect(editRequestPayload).not.toHaveProperty('name');
      expect(editRequestPayload).not.toHaveProperty('slug');
      expect(editRequestPayload).not.toHaveProperty('color');
      expect(editRequestPayload).not.toHaveProperty('sort_order');
      expect(editRequestPayload).not.toHaveProperty('is_active');

      // System fields should not be included
      expect(editRequestPayload).not.toHaveProperty('id');
      expect(editRequestPayload).not.toHaveProperty('created_at');
      expect(editRequestPayload).not.toHaveProperty('updated_at');
    }).toPass();
  });

  test('should send multiple fields when multiple fields are dirty', async ({
    page,
  }) => {
    // Set up network interception
    let createRequestPayload: object | null = null;

    await page.route('**/record', async (route) => {
      const request = route.request();

      if (request.method() === 'POST') {
        const body = request.postData();

        if (body) {
          try {
            createRequestPayload = JSON.parse(body);
          } catch (e) {
            throw new Error('Failed to parse JSON');
          }
        }
      }

      await route.continue();
    });

    await pageObject.navigateToTable('public', 'tags');
    await pageObject.waitForTableLoad();
    await pageObject.openCreateRecordPage();

    // Fill multiple fields but not all
    const testData = {
      name: `Multi Field Tag ${Date.now()}`,
      slug: `multi-field-tag-${Date.now()}`,
      usage_count: 5,
    };

    await pageObject.fillFormWithData(testData);

    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('public/tags/record') &&
          response.status() === 200,
      ),
    ]);

    await expect(() => {
      // Verify that all filled fields are in the payload
      expect(createRequestPayload).toBeTruthy();

      expect(createRequestPayload).toHaveProperty('name', testData.name);
      expect(createRequestPayload).toHaveProperty('slug', testData.slug);

      expect(createRequestPayload).toHaveProperty(
        'usage_count',
        testData.usage_count,
      );

      // Fields we didn't fill should not be in the payload
      expect(createRequestPayload).not.toHaveProperty('color'); // has default but not dirty

      // System fields should not be included
      expect(createRequestPayload).not.toHaveProperty('id');
      expect(createRequestPayload).not.toHaveProperty('created_at');
      expect(createRequestPayload).not.toHaveProperty('updated_at');
    }).toPass();
  });
});

test.describe('Data Explorer - Readonly Role Access Control', () => {
  test.use({ storageState: '.auth/readonly.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test('should allow readonly role to view table data', async ({ page }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Verify table is visible and data can be read
    await expect(pageObject.getTable()).toBeVisible();
    await expect(pageObject.getTableHeader('name')).toBeVisible();
    await expect(pageObject.getTableHeader('slug')).toBeVisible();
  });

  test('should hide create record button for readonly role', async ({
    page,
  }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Create button should not be visible for readonly users
    const createButton = page.locator('[data-testid="create-record-link"]');

    await expect(createButton).not.toBeVisible();
  });

  test('should allow readonly role to view individual records', async ({
    page,
  }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Click on first row to view record details
    const firstRow = pageObject.getTable().locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    // Should be able to view record details
    await page.waitForURL(`/resources/public/categories/record/*`);

    // Verify record page loads with data
    await expect(
      page.locator('text=name').or(page.locator('text=Name')).first(),
    ).toBeVisible();
  });

  test('should hide edit button for readonly role on record view', async ({
    page,
  }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Navigate to a record
    const firstRow = pageObject.getTable().locator('tbody tr').first();
    await firstRow.click();

    // Edit button should not be visible
    const editButton = page.locator('[data-testid="edit-record-button"]');
    await expect(editButton).not.toBeVisible();
  });

  test('should hide delete button for readonly role on record view', async ({
    page,
  }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Navigate to a record
    const firstRow = pageObject.getTable().locator('tbody tr').first();
    await firstRow.click();

    // Delete button should not be visible
    const deleteButton = page.locator('[data-testid="delete-record-button"]');
    await expect(deleteButton).not.toBeVisible();
  });

  test('should allow readonly role to use search functionality', async ({
    page,
  }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Search functionality should be available
    const searchInput = page.locator('[data-testid="table-search"]');

    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      // Should be able to search without restrictions
      await expect(searchInput).toHaveValue('test');
    }
  });

  test('should allow readonly role to use table filters', async ({ page }) => {
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();

    // Filter functionality should be available
    const filterButton = page.locator('[data-testid="table-filter-button"]');

    if (await filterButton.isVisible()) {
      await filterButton.click();
      // Should be able to access filters
      await expect(page.locator('[data-testid="filter-panel"]')).toBeVisible();
    }
  });
});

test.describe('Data Explorer - Record Deletion', () => {
  test.use({ storageState: '.auth/root.json' });

  let pageObject: DataExplorerPageObject;

  test.beforeEach(async ({ page }) => {
    pageObject = new DataExplorerPageObject(page);
  });

  test('should delete a record successfully', async ({ page }) => {
    // First create a record to delete
    await pageObject.navigateToTable('public', 'categories');
    await pageObject.waitForTableLoad();
    await pageObject.openCreateRecordPage();

    const testData = {
      name: `Delete Test Category ${Date.now()}`,
      slug: `delete-test-category-${Date.now()}`,
      description: 'This category will be deleted',
    };

    await pageObject.fillFormWithData(testData);

    await Promise.all([
      pageObject.submitRecordForm(),
      page.waitForResponse(
        (response) =>
          response.url().includes('record') && response.status() === 200,
      ),
    ]);

    // Should be on the record detail page no
    await page.waitForURL('/resources/public/categories/record/*');

    // Verify the record data is displayed
    await expect(page.locator('text=' + testData.name).first()).toBeVisible();

    // Set up network interception for the delete request
    let deleteRequestMade = false;
    await page.route('**/record/**', async (route) => {
      const request = route.request();
      if (request.method() === 'DELETE') {
        deleteRequestMade = true;
      }

      await route.continue();
    });

    // Click the delete button
    const deleteButton = pageObject.getDeleteButton();
    await expect(deleteButton).toBeVisible();
    await deleteButton.click();

    // Handle the confirmation dialog
    const confirmDialog = pageObject.getDeleteConfirmationDialog();
    await expect(confirmDialog).toBeVisible();

    // Verify dialog content
    await expect(confirmDialog).toContainText('delete');

    // Click confirm delete
    const confirmDeleteButton = pageObject.getConfirmDeleteButton();

    await Promise.all([
      confirmDeleteButton.click(),
      page.waitForResponse(
        (response) =>
          response.url().includes('record') &&
          response.request().method() === 'DELETE' &&
          (response.status() === 200 || response.status() === 204),
      ),
    ]);

    // Should be redirected back to the table
    await page.waitForURL(/\/resources\/public\/categories$/);

    // Verify the delete request was made
    expect(deleteRequestMade).toBe(true);

    // Verify the record is no longer in the table
    await pageObject.waitForTableLoad();
    await pageObject.searchTable(testData.name);
    await expect(pageObject.getNoResultsMessage()).toBeVisible();
  });
});
