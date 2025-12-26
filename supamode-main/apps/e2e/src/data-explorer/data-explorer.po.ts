import { Locator, Page, expect } from '@playwright/test';

export class DataExplorerPageObject {
  constructor(private page: Page) {}

  // Navigation methods
  async navigateToTable(schema: string, table: string) {
    await this.page.goto(`/resources/${schema}/${table}`, {
      waitUntil: 'commit',
    });
  }

  async waitForTableLoad() {
    await this.page.waitForSelector('[data-testid="data-table"]', {
      state: 'visible',
      timeout: 10_000,
    });

    await this.page.waitForTimeout(500);
  }

  // Table interaction methods
  getTable() {
    return this.page.getByTestId('data-table');
  }

  getTableTitle() {
    return this.page.getByTestId('table-title');
  }

  getTableHeader(columnName: string) {
    return this.page
      .locator('th')
      .getByText(new RegExp(`^${columnName}$`, 'i'), {
        exact: true,
      });
  }

  async searchTable(searchTerm: string) {
    // First click on the search input to focus it
    const searchInput = this.page.getByTestId('filters-search-input');
    await searchInput.click();

    // Clear any existing content and fill with new search term
    await searchInput.fill(searchTerm);
    await searchInput.press('Enter');

    // Wait for search results to load
    await this.page.waitForLoadState('networkidle');
  }

  getNoResultsMessage() {
    return this.page.getByText(/no results found/i);
  }

  // Record creation methods
  async openCreateRecordPage() {
    // Click the create record link to navigate to the form page
    const createButton = this.page.getByTestId('create-record-link');

    await expect(createButton).toBeVisible();

    await createButton.click();

    await expect(this.getRecordForm()).toBeVisible();
  }

  getRecordForm() {
    // The form is on a page, not in a dialog
    return this.page.locator('form[id="record-form"], form');
  }

  async submitRecordForm() {
    const submitButton = this.page.getByTestId('record-form-submit');
    await expect(submitButton).toBeVisible();

    return submitButton.click();
  }

  // Advanced form filling method that handles different field types
  async fillFormWithData(data: Record<string, any>) {
    const form = this.getRecordForm();

    for (const [fieldName, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;

      await this.fillFieldByName(fieldName, value, form);
    }
  }

  async fillFieldByName(fieldName: string, value: any, container?: Locator) {
    const formContainer = container || this.getRecordForm();

    // Find the field container by data-field-name
    const fieldContainer = formContainer
      .locator(
        `[data-testid="record-form-field"][data-field-name="${fieldName}"]`,
      )
      .first();

    if (await fieldContainer.isVisible()) {
      // Look for the actual input within the field container
      const input = fieldContainer
        .locator(
          '[data-testid="field-input"], [data-testid="field-textarea"], [data-testid="field-select"], [data-testid="field-switch"], [data-testid="field-relation-picker"]',
        )
        .first();

      if (await input.isVisible()) {
        await this.fillFieldByType(input, value);

        return;
      }
    }

    // Fallback: find by name attribute
    const namedField = formContainer.locator(`[name="${fieldName}"]`).first();

    if (await namedField.isVisible()) {
      await this.fillFieldByType(namedField, value);

      return;
    }

    // Final fallback: find input that contains the field name
    const inputField = formContainer
      .locator(
        `input[name*="${fieldName}"], textarea[name*="${fieldName}"], select[name*="${fieldName}"]`,
      )
      .first();

    if (await inputField.isVisible()) {
      await this.fillFieldByType(inputField, value);
    }
  }

  private async fillFieldByType(field: Locator, value: any) {
    const testId = await field.getAttribute('data-testid');

    // Handle field types based on data-testid
    if (testId === 'field-switch') {
      await this.fillSwitchComponent(field, value);
    } else if (testId === 'field-select') {
      await this.fillSelectComponent(field, value);
    } else if (testId === 'field-relation-picker') {
      await this.fillRelationFieldComponent(field, value);
    } else if (testId === 'field-textarea' || 'field-color') {
      await field.fill(value.toString());
    } else if (testId === 'field-input') {
      // Check field type for inputs
      const fieldType = await field.getAttribute('data-field-type');

      if (typeof value === 'object' && value !== null && fieldType !== 'json') {
        await this.fillJSONField(field, value);
      } else {
        await field.fill(value.toString());
      }
    } else {
      // Fallback to legacy logic
      const tagName = await field.evaluate((el) => el.tagName.toLowerCase());

      if (typeof value === 'boolean') {
        await this.fillBooleanField(field, value);
      } else if (typeof value === 'object' && value !== null) {
        await this.fillJSONField(field, value);
      } else if (tagName === 'textarea') {
        await field.fill(value.toString());
      } else {
        await field.fill(value.toString());
      }
    }
  }

  private async fillBooleanField(field: Locator, value: boolean) {
    // Check if it's a switch/toggle component
    if (await this.isSwitchComponent(field)) {
      await this.fillSwitchComponent(field, value);
    } else {
      // Standard checkbox
      if (value) {
        await field.check();
      } else {
        await field.uncheck();
      }
    }
  }

  private async fillSelectComponent(field: Locator, value: string) {
    // Handle custom select components (like Shadcn Select)
    const trigger = field
      .locator('[role="combobox"], [data-testid="select-trigger"]')
      .first();

    if (await trigger.isVisible()) {
      await trigger.click();

      // Wait for dropdown to appear
      await this.page.waitForSelector('[role="listbox"], [role="menu"]', {
        state: 'visible',
      });

      // Click the option (use first match to avoid strict mode violations)
      const option = this.page
        .locator(
          `[role="option"]:has-text("${value}"), [role="menuitem"]:has-text("${value}")`,
        )
        .first();
      await option.click();
    }
  }

  private async fillSwitchComponent(field: Locator, value: boolean) {
    // For switch components with data-testid="field-switch"
    const isChecked = (await field.getAttribute('aria-checked')) === 'true';
    if (isChecked !== value) {
      await field.click();
    }
  }

  private async fillRelationFieldComponent(
    field: Locator,
    searchValue: string,
  ) {
    // Click the relation picker to open the dropdown
    await field.click();

    // Wait for the search input to appear
    const searchInput = this.page.getByTestId('relation-search-input');
    await searchInput.waitFor({ state: 'visible' });

    // Type the search value
    await searchInput.fill(searchValue);

    // Wait for results and click the first option
    await this.page.waitForTimeout(1000); // Wait for debounced search

    await this.page.waitForSelector('[data-testid="relation-option"]', {
      state: 'visible',
    });

    const firstOption = this.page.getByTestId('relation-option').first();
    await firstOption.click();
  }

  private async fillDatePickerComponent(field: Locator, value: Date) {
    // Handle custom date picker components
    const dateTrigger = field
      .locator(
        '[data-testid="date-picker-trigger"], button:has-text("Pick date")',
      )
      .first();

    if (await dateTrigger.isVisible()) {
      await dateTrigger.click();

      // Wait for calendar to appear
      await this.page.waitForSelector(
        '[role="dialog"] .calendar, [data-testid="calendar"]',
        { state: 'visible' },
      );

      // Click the date - this is simplified, real implementation would navigate to correct month/year
      const dayButton = this.page
        .locator(`[role="gridcell"]:has-text("${value.getDate()}")`)
        .first();

      await dayButton.click();
    }
  }

  private async isSwitchComponent(field: Locator) {
    return (
      (await field.locator('[role="switch"], [data-testid="switch"]').count()) >
      0
    );
  }

  private async isDatePickerComponent(field: Locator) {
    return (
      (await field
        .locator(
          '[data-testid="date-picker-trigger"], button:has-text("Pick date")',
        )
        .count()) > 0
    );
  }

  // Relation field methods
  async fillRelationField(fieldName: string, searchValue: string) {
    const form = this.getRecordForm();
    const fieldContainer = form
      .locator(
        `[data-testid="record-form-field"][data-field-name="${fieldName}"]`,
      )
      .first();

    // Find the relation picker within the field container
    const relationPicker = fieldContainer.getByTestId('field-relation-picker');
    await this.fillRelationFieldComponent(relationPicker, searchValue);
  }

  // Error handling methods
  getValidationError(fieldName: string) {
    return this.page
      .locator(`[data-testid="field-error"][data-field-name="${fieldName}"]`)
      .or(this.page.getByText(/required|invalid|error|expected/i));
  }

  getEditButton() {
    return this.page.getByTestId('edit-record-button');
  }

  getDeleteButton() {
    return this.page.getByTestId('request-delete-record-button');
  }

  getConfirmDeleteButton() {
    return this.page.getByRole('button', { name: /delete/i }).filter({
      hasNot: this.page.getByTestId('request-delete-record-button'),
    });
  }

  // Tab-related methods
  getTabsContainer() {
    return this.page.getByTestId('tabs-container');
  }

  getTabItem(tabText?: string) {
    const tabItems = this.page.getByTestId('tab-item');
    return tabText ? tabItems.filter({ hasText: tabText }) : tabItems;
  }

  getNewTabButton() {
    return this.page.getByTestId('new-tab-button');
  }

  getTabCloseButton(tabText: string) {
    return this.getTabItem(tabText).getByTestId('tab-close-button');
  }

  getActiveTab() {
    return this.page.locator('[data-testid="tab-item"].active');
  }

  async clickTab(tabText: string) {
    const tab = this.getTabItem(tabText);
    await tab.click();
  }

  async closeTab(tabText: string) {
    const closeButton = this.getTabCloseButton(tabText);
    await closeButton.click();
  }

  async createNewTab() {
    const newTabButton = this.getNewTabButton();
    await newTabButton.click();
  }

  getTabContextMenu() {
    return this.page.getByTestId('tab-context-menu');
  }

  getCloseOtherTabsOption() {
    return this.page.getByTestId('close-other-tabs');
  }

  getEmptyTabsState() {
    return this.page.getByTestId('empty-tabs-state');
  }

  async rightClickTab(tabText: string) {
    const tab = this.getTabItem(tabText);
    await tab.click({ button: 'right' });
  }

  // Global search methods
  getGlobalSearch() {
    return this.page.getByTestId('global-search');
  }

  async useGlobalSearch(searchTerm: string) {
    const globalSearch = this.getGlobalSearch();
    await globalSearch.click();
    await globalSearch.fill(searchTerm);
  }

  getSearchResult(resultText?: string) {
    const results = this.page.getByTestId('search-result');
    return resultText ? results.filter({ hasText: resultText }) : results;
  }

  // Sidebar navigation methods
  getSidebarTableLink(tableName: string) {
    return this.page
      .getByTestId('sidebar-table-link')
      .filter({ hasText: tableName });
  }

  getOpenInNewTabOption() {
    return this.page.getByTestId('open-in-new-tab');
  }

  async openTableInNewTab(tableName: string) {
    const tableLink = this.getSidebarTableLink(tableName);
    await tableLink.click({ button: 'right' });
    const newTabOption = this.getOpenInNewTabOption();
    await newTabOption.click();
  }

  // Advanced Filter Methods
  async addFilter(columnName: string) {
    await expect(async () => {
      // Click the "Add Filter" button
      const addFilterButton = this.page.getByTestId('add-filter-button');

      await expect(addFilterButton).toBeVisible();

      await addFilterButton.click();

      await expect(this.page.getByTestId('filter-column-search')).toBeVisible();
    }).toPass();

    // Search for and select the column
    const filterSearch = this.page.getByTestId('filter-column-search');
    await filterSearch.fill(columnName);

    // Wait for column options to appear
    await this.page.waitForSelector('[data-testid="filter-column-option"]', {
      state: 'visible',
    });

    const columnOption = this.page
      .getByTestId('filter-column-option')
      .filter({ hasText: columnName })
      .first();

    await columnOption.click();

    // Wait for filter to be added
    await this.page.waitForSelector(
      `[data-testid="filter-badge"][data-filter-badge-name="${columnName}"]`,
      {
        state: 'visible',
      },
    );
  }

  async selectFilterOperator(operator: string) {
    // Open the filter that was just added (assumes last added filter is open)
    const operatorSelect = this.page.getByTestId('filter-operator-select');
    await operatorSelect.click();

    // Wait for the dropdown to be visible
    await this.page.waitForSelector('[data-testid="filter-operator-option"]', {
      state: 'visible',
    });

    // Find the visible operator option (first one that matches)
    const operatorOption = this.page
      .getByTestId('filter-operator-option')
      .filter({ hasText: operator })
      .first();

    await expect(operatorOption).toBeVisible();

    await this.page.waitForTimeout(100);

    await operatorOption.click();
  }

  async setFilterValue(value: string) {
    await this.page.waitForTimeout(100);
    const filterInput = this.page.getByTestId('filter-value-input');
    await filterInput.fill(value);
  }

  async setFilterRangeValue(startValue: string, endValue: string) {
    const startInput = this.page.getByTestId('filter-range-start-input');
    const endInput = this.page.getByTestId('filter-range-end-input');

    await startInput.fill(startValue);
    await endInput.fill(endValue);

    // Click apply range button
    const applyButton = this.page.getByTestId('apply-range-button');
    await applyButton.click();
  }

  async selectBooleanValue(value: boolean) {
    // Wait for boolean filter options to be visible
    await this.page.waitForSelector('[data-testid="boolean-filter"]', {
      state: 'visible',
    });

    const booleanCheckbox = this.page
      .getByTestId(`boolean-filter`)
      .nth(value ? 0 : 1);

    await booleanCheckbox.click();
  }

  async selectRelativeDate(option: string) {
    const relativeDateSelect = this.page.getByTestId('relative-date-trigger');
    await relativeDateSelect.click();

    // Wait for date options to appear
    await this.page.waitForSelector('[data-testid="relative-date-option"]', {
      state: 'visible',
    });

    const dateOption = this.page
      .getByTestId('relative-date-option')
      .filter({ hasText: option })
      .first();

    await dateOption.click();
  }

  async selectCustomDate() {
    const relativeDateSelect = this.page.getByTestId('relative-date-trigger');
    await relativeDateSelect.click();

    // Wait for date options to appear
    await this.page.waitForSelector('[data-testid="relative-date-option"]', {
      state: 'visible',
    });

    const customDateOption = this.page.getByTestId('custom-date-option');

    await customDateOption.click();
  }

  async selectDateInCalendar(date: Date) {
    // Navigate to the correct month/year if needed
    const daySelector = `[data-day="${date.toLocaleDateString()}"]`;
    const dayButton = this.page.locator(daySelector);
    await dayButton.click();
  }

  async setDateRange(startDate: Date, endDate: Date) {
    // For date range filters, interact with start and end calendar pickers
    const startCalendar = this.page.getByTestId('date-range-start-calendar');
    await startCalendar.click();
    await this.selectDateInCalendar(startDate);

    const endCalendar = this.page.getByTestId('date-range-end-calendar');
    await endCalendar.click();

    await this.selectDateInCalendar(endDate);

    // Apply the date range
    const applyButton = this.page.getByTestId('apply-date-range-button');
    await applyButton.click();
  }

  async applyFilter() {
    await this.page.waitForTimeout(500);

    // For most filters, pressing Enter or clicking outside applies them
    // For some filters, there might be an explicit apply button
    const applyButton = this.page.getByTestId('apply-filter-button');

    if (
      await applyButton.isVisible({
        timeout: 1000,
      })
    ) {
      await applyButton.click();
    } else {
      // Default to pressing Enter on the active input
      await this.page.keyboard.press('Enter');
    }
  }

  async attemptApplyFilter() {
    // Similar to applyFilter but for testing validation scenarios
    await this.applyFilter();
  }

  getFilterBadge(displayName: string) {
    return this.page.locator(
      `[data-testid="filter-badge"][data-filter-badge-name="${displayName}"]`,
    );
  }

  private displayNameToColumnName(displayName: string): string {
    // Map common display names to column names
    const displayNameMap: Record<string, string> = {
      Name: 'name',
      'Is Active': 'is_active',
      'Created At': 'created_at',
      'Sort Order': 'sort_order',
      Description: 'description',
      Slug: 'slug',
      Title: 'title',
      Content: 'content',
      'Published At': 'published_at',
      Status: 'status',
      'Category Id': 'category_id',
      'External Url': 'external_url',
      Email: 'email',
      Metadata: 'metadata',
      'Featured Image': 'featured_image',
    };

    return (
      displayNameMap[displayName] ||
      displayName.toLowerCase().replace(/\s+/g, '_')
    );
  }

  async removeFilter(columnName: string) {
    const filterBadge = this.getFilterBadge(columnName);
    const removeButton = filterBadge.getByTestId('remove-filter-button');
    await removeButton.click();
  }

  async clearAllFilters() {
    const clearAllButton = this.page.getByTestId('clear-all-filters-button');
    await clearAllButton.click();
    await this.page.waitForTimeout(500);
  }

  // Batch selection methods
  async selectAllRows() {
    const selectAllCheckbox = this.page.getByTestId('select-all-checkbox');
    await selectAllCheckbox.click();
  }

  async selectRow(rowIndex: number) {
    const rowCheckbox = this.page.getByTestId(`row-checkbox-${rowIndex}`);
    await rowCheckbox.click();
  }

  async selectRowById(id: string) {
    const rowCheckbox = this.page.getByTestId(`row-checkbox-${id}`);
    await rowCheckbox.click();
  }

  getSelectedRowsCount() {
    return this.page.getByTestId('selected-rows-count');
  }

  getBatchDeleteButton() {
    return this.page.getByTestId('batch-delete-button');
  }

  async performBatchDelete() {
    const batchDeleteButton = this.getBatchDeleteButton();
    await batchDeleteButton.click();

    // Confirm the deletion in the dialog
    const confirmButton = this.page.getByTestId('confirm-batch-delete-button');
    await confirmButton.click();
  }

  getBatchDeleteConfirmationDialog() {
    return this.page
      .getByRole('alertdialog')
      .filter({ hasText: /delete.*items/i });
  }

  // Saved Views Methods
  async toggleSavedViewsDropdown() {
    const savedViewsButton = this.page.getByTestId(
      'saved-views-dropdown-trigger',
    );

    await savedViewsButton.click();
  }

  getSaveCurrentViewButton() {
    return this.page.getByTestId('save-current-view-button');
  }

  async clickSaveCurrentView() {
    const saveButton = this.getSaveCurrentViewButton();
    await saveButton.click();
  }

  async fillSavedViewForm(data: {
    name: string;
    description?: string;
    roles?: string[];
  }) {
    // Fill name field
    const nameInput = this.page.getByTestId('saved-view-name-input');
    await nameInput.fill(data.name);

    // Fill description if provided
    if (data.description) {
      const descriptionInput = this.page.getByTestId(
        'saved-view-description-input',
      );
      await descriptionInput.fill(data.description);
    }

    // Select roles if provided
    if (data.roles && data.roles.length > 0) {
      const rolesButton = this.page.getByTestId('select-roles-button');
      await rolesButton.click();

      for (const roleName of data.roles) {
        const roleCheckbox = this.page.getByTestId(`role-checkbox-${roleName}`);
        await roleCheckbox.click();
      }

      // Close roles dropdown
      await this.page.keyboard.press('Escape');
    }
  }

  async submitSavedViewForm() {
    const submitButton = this.page.getByTestId('submit-saved-view-button');

    await Promise.all([
      submitButton.click(),
      this.page.waitForResponse('**/views'),
      this.page.waitForResponse(
        (response) =>
          response.url().includes('api/v1/tables/') &&
          response.status() === 200,
      ),
    ]);

    await expect(this.page.locator('[role="dialog"]')).toBeHidden();

    await this.page.keyboard.press('Escape');
  }

  async createSavedView(name: string, description?: string) {
    await this.toggleSavedViewsDropdown();
    await this.clickSaveCurrentView();
    await this.fillSavedViewForm({ name, description });
    await this.submitSavedViewForm();
    await this.page.waitForTimeout(500);
  }

  getSavedViewItem(viewName: string) {
    return this.page
      .getByTestId('saved-view-item')
      .filter({ hasText: viewName })
      .first();
  }

  async loadSavedView(viewName: string) {
    await this.getSavedViewItem(viewName).click();

    await this.page.waitForTimeout(500);
  }

  async unselectSavedView(viewName: string) {
    const viewItem = this.getSavedViewItem(viewName);
    const unselectButton = viewItem.getByTestId('unselect-view-button');
    await unselectButton.click();
  }

  getUpdateViewButton() {
    return this.page.getByTestId('update-saved-view-button');
  }

  async updateSavedView() {
    const updateButton = this.getUpdateViewButton();

    await Promise.all([
      updateButton.click(),
      this.page.waitForResponse('**/api/**'),
    ]);
  }

  async requestDeleteSavedView(viewName: string) {
    const viewItem = this.getSavedViewItem(viewName);
    const deleteButton = viewItem.getByTestId('delete-view-button');

    await deleteButton.click();
  }

  getDeleteConfirmationDialog() {
    return this.page.getByRole('alertdialog');
  }

  async confirmDeleteSavedView() {
    const confirmButton = this.page.getByTestId('confirm-delete-view-button');

    await Promise.all([
      confirmButton.click(),
      this.page.waitForResponse((response) => {
        return (
          response.url().includes('views') &&
          response.status() === 200 &&
          response.request().method() === 'DELETE'
        );
      }),
    ]);

    // Wait for the deletion dialog to close
    await this.page.waitForSelector(
      '[data-testid="confirm-delete-view-button"]',
      {
        state: 'hidden',
      },
    );
  }

  // Additional helper methods for table operations
  async sortByColumn(columnName: string, direction: 'asc' | 'desc') {
    const sortButton = this.page.getByTestId('sort-menu-button');

    // Check current state to determine needed clicks
    const currentColumn = await sortButton.getAttribute('data-test-column');
    const currentDirection = await sortButton.getAttribute(
      'data-test-direction',
    );

    // If already sorted correctly, no action needed (case-insensitive comparison)
    if (
      currentColumn?.toLowerCase() === columnName.toLowerCase() &&
      currentDirection === direction
    ) {
      return;
    }

    await sortButton.click();

    // Wait for sort options to appear
    await this.page
      .getByTestId('sort-column-option')
      .first()
      .waitFor({ state: 'visible' });

    const columnOption = this.page
      .getByTestId('sort-column-option')
      .filter({ hasText: new RegExp(columnName, 'i') })
      .first();

    await columnOption.click();

    // Wait for sort state to update - use lowercase for comparison
    await expect(sortButton).toHaveAttribute(
      'data-test-column',
      columnName.toLowerCase(),
    );
    await expect(sortButton).toHaveAttribute('data-test-direction', 'asc');

    // If we need descending and currently have ascending, click once more
    if (direction === 'desc') {
      await sortButton.click();
      await this.page
        .getByTestId('sort-column-option')
        .first()
        .waitFor({ state: 'visible' });
      await columnOption.click();

      // Wait for final state
      await expect(sortButton).toHaveAttribute('data-test-direction', 'desc');
    }
  }

  async clearSort() {
    const sortButton = this.page.getByTestId('sort-menu-button');
    await sortButton.click();

    const clearSortButton = this.page.getByTestId('clear-sort-button');
    if (await clearSortButton.isVisible()) {
      await clearSortButton.click();
    }
  }

  async clearSearch() {
    const searchInput = this.page.getByTestId('filters-search-input');
    await searchInput.clear();
    await searchInput.press('Enter');
  }

  // Advanced Field Editing Methods
  async getFieldValue(fieldName: string): Promise<string> {
    const field = this.page.locator(`[data-field-name="${fieldName}"]`).first();
    return (await field.textContent()) || '';
  }

  async fillJSONField(fieldName: string, jsonData: object) {
    const jsonString = JSON.stringify(jsonData, null, 2);
    const jsonField = this.page.getByTestId(`field-${fieldName}-json-editor`);

    if (await jsonField.isVisible()) {
      // Handle JSON editor (Monaco/Ace)
      await jsonField.click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.type(jsonString);
    } else {
      // Fallback to textarea
      const textareaField = this.page.locator(
        `[data-field-name="${fieldName}"] textarea`,
      );
      await textareaField.fill(jsonString);
    }
  }

  getJSONField(fieldName: string) {
    return this.page
      .getByTestId(`field-${fieldName}-json-editor`)
      .or(this.page.locator(`[data-field-name="${fieldName}"] textarea`));
  }

  async toggleBooleanField(fieldName: string, value: boolean) {
    const booleanField = this.page.locator(
      `[data-field-name="${fieldName}"] [data-testid="field-switch"]`,
    );

    const isChecked =
      (await booleanField.getAttribute('aria-checked')) === 'true';

    if (isChecked !== value) {
      await booleanField.click();
    }
  }

  async setDateField(fieldName: string, date: Date) {
    const dateField = this.page.locator(`[data-field-name="${fieldName}"]`);
    const datePicker = dateField.getByTestId('date-picker-trigger');

    if (await datePicker.isVisible()) {
      await datePicker.click();

      // Navigate to correct month/year if needed
      // For simplicity, clicking on the specific date
      const dayButton = this.page.locator(`[data-date="${date.getDate()}"]`);
      await dayButton.click();
    } else {
      // Fallback to direct input
      const dateInput = dateField.locator('input[type="date"]');
      const isoDate = date.toISOString().split('T')[0];
      if (isoDate) {
        await dateInput.fill(isoDate);
      }
    }
  }

  async selectEnumValue(fieldName: string, value: string) {
    const enumField = this.page.locator(
      `[data-field-name="${fieldName}"] [data-testid="field-select"]`,
    );

    if (await enumField.isVisible()) {
      await enumField.click();

      // Wait for options to appear and select the first matching one
      await this.page.waitForSelector('[role="option"]', { state: 'visible' });
      const option = this.page
        .getByRole('option')
        .filter({ hasText: value })
        .first();
      await option.click();
    } else {
      // Fallback to regular select
      const selectField = this.page.locator(
        `[data-field-name="${fieldName}"] select`,
      );
      await selectField.selectOption(value);
    }
  }

  async fillTextareaField(fieldName: string, content: string) {
    const textareaField = this.page.locator(
      `[data-field-name="${fieldName}"] textarea`,
    );
    await textareaField.fill(content);
  }

  getTextareaField(fieldName: string) {
    return this.page.locator(`[data-field-name="${fieldName}"] textarea`);
  }

  async fillRichTextField(fieldName: string, content: string) {
    // For rich text editors, we might need to interact with the editor directly
    const richTextField = this.page.locator(
      `[data-field-name="${fieldName}"] [data-testid="rich-text-editor"]`,
    );

    if (await richTextField.isVisible()) {
      // For most rich text editors, clicking and typing works
      await richTextField.click();
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.type(content);
    } else {
      // Fallback to textarea or contenteditable
      const fallbackField = this.page
        .locator(`[data-field-name="${fieldName}"] [contenteditable]`)
        .or(this.page.locator(`[data-field-name="${fieldName}"] textarea`));
      await fallbackField.fill(content);
    }
  }

  async uploadFile(fieldName: string, filePath: string) {
    const fileInput = this.page.locator(
      `[data-field-name="${fieldName}"] input[type="file"]`,
    );

    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles(filePath);
    } else {
      // Look for upload button/area
      const uploadArea = this.page.locator(
        `[data-field-name="${fieldName}"] [data-testid="file-upload-area"]`,
      );
      await uploadArea.click();

      // Handle file dialog
      const fileInputHidden = this.page.locator('input[type="file"]').last();
      await fileInputHidden.setInputFiles(filePath);
    }
  }

  async selectRelationValue(fieldName: string, searchValue: string) {
    const relationField = this.page.locator(
      `[data-field-name="${fieldName}"] [data-testid="field-relation-picker"]`,
    );

    if (await relationField.isVisible()) {
      await relationField.click();

      // Wait for dropdown and search
      const searchInput = this.page.getByTestId('relation-search-input');
      await searchInput.waitFor({ state: 'visible' });
      await searchInput.fill(searchValue);

      // Wait for results and select first match
      await this.page.waitForTimeout(500); // Wait for debounced search
      await this.page.waitForSelector('[data-testid="relation-option"]', {
        state: 'visible',
      });
      const firstOption = this.page.getByTestId('relation-option').first();
      await firstOption.click();
    }
  }

  async createNewRelatedRecord(
    fieldName: string,
    recordData: Record<string, string>,
  ) {
    const relationField = this.page.locator(
      `[data-field-name="${fieldName}"] [data-testid="field-relation-picker"]`,
    );
    await relationField.click();

    // Look for "Create New" option
    const createNewButton = this.page.getByTestId('create-new-related-record');
    if (await createNewButton.isVisible()) {
      await createNewButton.click();

      // Fill the creation form
      for (const [field, value] of Object.entries(recordData)) {
        await this.fillFieldByName(field, value);
      }

      // Submit the creation form
      const submitButton = this.page.getByTestId('submit-new-related-record');
      await submitButton.click();
    }
  }

  getFormField(fieldName: string) {
    return this.page.locator(`[data-field-name="${fieldName}"]`);
  }

  // Additional helper methods for complex interactions
  async waitForFormLoad() {
    await this.page.waitForSelector('form[id="record-form"]', {
      state: 'visible',
    });
  }

  async checkFormValidity() {
    const form = this.page.locator('form[id="record-form"]');
    return await form.evaluate((form: HTMLFormElement) => form.checkValidity());
  }

  async getFormErrors(): Promise<string[]> {
    const errorElements = this.page.locator('[data-testid^="field-error"]');
    const errorCount = await errorElements.count();
    const errors: string[] = [];

    for (let i = 0; i < errorCount; i++) {
      const error = await errorElements.nth(i).textContent();
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  async saveAndContinueEditing() {
    const saveAndContinueButton = this.page.getByTestId(
      'save-and-continue-button',
    );
    if (await saveAndContinueButton.isVisible()) {
      await saveAndContinueButton.click();
    }
  }

  async resetForm() {
    const resetButton = this.page.getByTestId('reset-form-button');
    if (await resetButton.isVisible()) {
      await resetButton.click();

      // Confirm reset if there's a confirmation dialog
      const confirmReset = this.page.getByTestId('confirm-reset-button');
      if (await confirmReset.isVisible()) {
        await confirmReset.click();
      }
    }
  }

  // Inline Editing Methods
  async openInlineEditor(columnName: string, rowIndex: number = 0) {
    const cell = this.page.getByTestId(`cell-${columnName}`).nth(rowIndex);
    await cell.hover();

    const editButton = cell.locator(
      `[data-testid="edit-button"][data-test-column="${columnName}"]`,
    );
    await editButton.click();

    // Wait for editor to be visible
    const editorPopover = this.page.locator(
      `[data-testid="inline-editor-popover"][data-test-column="${columnName}"]`,
    );
    await expect(editorPopover).toBeVisible();

    return editorPopover;
  }

  async saveInlineEdit(columnName: string, waitForResponse: boolean = true) {
    const saveButton = this.page.locator(
      `[data-testid="inline-editor-save"][data-test-column="${columnName}"]`,
    );

    if (waitForResponse) {
      await Promise.all([
        this.page.waitForResponse(
          (response) =>
            response.url().includes('/resources/') &&
            response.request().method() === 'PUT',
        ),
        saveButton.click(),
      ]);
    } else {
      await saveButton.click();
    }
  }

  async cancelInlineEdit(columnName: string) {
    const cancelButton = this.page.locator(
      `[data-testid="inline-editor-cancel"][data-test-column="${columnName}"]`,
    );
    await cancelButton.click();

    // Wait for editor to close
    const editorPopover = this.page.locator(
      `[data-testid="inline-editor-popover"][data-test-column="${columnName}"]`,
    );
    await expect(editorPopover).not.toBeVisible();
  }

  async editCellValue(columnName: string, value: string, rowIndex: number = 0) {
    await this.openInlineEditor(columnName, rowIndex);

    const editorContainer = this.page.locator(
      `[data-testid="inline-editor-container"][data-test-column="${columnName}"]`,
    );
    const input = editorContainer.locator('input, textarea').first();

    await input.fill(value);
    await this.saveInlineEdit(columnName);
  }

  async toggleBooleanCell(columnName: string, rowIndex: number = 0) {
    await this.openInlineEditor(columnName, rowIndex);

    const editorContainer = this.page.locator(
      `[data-testid="inline-editor-container"][data-test-column="${columnName}"]`,
    );
    const toggle = editorContainer
      .locator('[data-testid="field-switch"]')
      .first();

    await toggle.click();
    await this.saveInlineEdit(columnName);
  }

  getInlineEditor(columnName: string) {
    return this.page.locator(
      `[data-testid="inline-editor-popover"][data-test-column="${columnName}"]`,
    );
  }

  getInlineEditorForm(columnName: string) {
    return this.page.locator(
      `[data-testid="inline-editor-form"][data-test-column="${columnName}"]`,
    );
  }

  getInlineEditorInput(columnName: string) {
    const editorContainer = this.page.locator(
      `[data-testid="inline-editor-container"][data-test-column="${columnName}"]`,
    );
    return editorContainer.locator('input, textarea').first();
  }

  getInlineEditorSaveButton(columnName: string) {
    return this.page.locator(
      `[data-testid="inline-editor-save"][data-test-column="${columnName}"]`,
    );
  }

  getInlineEditorCancelButton(columnName: string) {
    return this.page.locator(
      `[data-testid="inline-editor-cancel"][data-test-column="${columnName}"]`,
    );
  }

  async isInlineEditorOpen(columnName: string): Promise<boolean> {
    const editorPopover = this.page.locator(
      `[data-testid="inline-editor-popover"][data-test-column="${columnName}"]`,
    );
    return await editorPopover.isVisible();
  }

  async getCellValue(
    columnName: string,
    rowIndex: number = 0,
  ): Promise<string> {
    const cell = this.page.getByTestId(`cell-${columnName}`).nth(rowIndex);
    return (await cell.textContent()) || '';
  }

  async isCellEditable(
    columnName: string,
    rowIndex: number = 0,
  ): Promise<boolean> {
    const cell = this.page.getByTestId(`cell-${columnName}`).nth(rowIndex);
    await cell.hover();

    const editButton = cell.locator(
      `[data-testid="edit-button"][data-test-column="${columnName}"]`,
    );
    return await editButton.isVisible();
  }

  async waitForInlineEditComplete(columnName: string) {
    const editorPopover = this.page.locator(
      `[data-testid="inline-editor-popover"][data-test-column="${columnName}"]`,
    );
    await expect(editorPopover).not.toBeVisible();
  }

  async getInlineEditorValidationError(
    columnName: string,
  ): Promise<string | null> {
    const editorForm = this.getInlineEditorForm(columnName);
    const errorMessage = editorForm.locator('[role="alert"]').first();

    if (await errorMessage.isVisible()) {
      return await errorMessage.textContent();
    }

    return null;
  }
}
