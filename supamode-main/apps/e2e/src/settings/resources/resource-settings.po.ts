import { Page, expect } from '@playwright/test';

export class ResourceSettingsPageObject {
  constructor(private readonly page: Page) {}

  async goto(schema: string, tableName: string) {
    await this.page.goto(`/settings/resources/${schema}/${tableName}`, {
      waitUntil: 'commit',
    });
  }

  async gotoWithEdit(schema: string, tableName: string) {
    await this.page.goto(
      `/settings/resources/${schema}/${tableName}?edit=true`,
      {
        waitUntil: 'commit',
      },
    );
  }

  // Page Header Elements
  getPageTitle() {
    return this.page.getByRole('heading').first();
  }

  getBreadcrumb() {
    return this.page.getByRole('navigation').first();
  }

  getConfigureTableButton() {
    return this.page.getByTestId('configure-table-button').first();
  }

  getDetailsCard() {
    return this.page.getByTestId('resource-details-card');
  }

  getDisplayNameField() {
    return this.getDetailsCard().getByTestId('resource-display-name');
  }

  getTableNameField() {
    return this.getDetailsCard().getByTestId('resource-table-name');
  }

  getSchemaNameField() {
    return this.getDetailsCard().getByTestId('resource-schema-name');
  }

  getVisibilityBadge() {
    return this.getDetailsCard().getByTestId('resource-visibility-badge');
  }

  getDisplayFormatField() {
    return this.getDetailsCard().getByTestId('resource-display-format');
  }

  getDescriptionField() {
    return this.getDetailsCard();
  }

  // Columns Table
  getColumnsTable() {
    return this.page.getByTestId('resource-columns-table');
  }

  getColumnsTableRows() {
    return this.getColumnsTable().getByRole('row');
  }

  getColumnRow(columnName: string) {
    return this.getColumnsTableRows().filter({
      has: this.page.getByText(columnName, {
        exact: true,
      }),
    });
  }

  getDragHandle(columnName: string) {
    return this.getColumnRow(columnName).getByRole('button').first();
  }

  getEditColumnButton(columnName: string) {
    return this.getColumnRow(columnName).getByRole('button', { name: /edit/i });
  }

  async clickColumnRow(columnName: string) {
    await this.getColumnRow(columnName).click();
  }

  async dragColumnToPosition(sourceColumn: string, targetColumn: string) {
    const sourceRow =
      this.getColumnRow(sourceColumn).getByTestId('row-drag-handle');

    const targetRow =
      this.getColumnRow(targetColumn).getByTestId('row-drag-handle');

    await sourceRow.hover();
    await this.page.mouse.down();

    await this.page.waitForTimeout(100);

    await targetRow.hover({
      force: true,
    });

    await this.page.waitForTimeout(100);

    await this.page.mouse.up();
  }

  // Table Metadata Dialog
  getTableMetadataDialog() {
    return this.page.getByRole('dialog');
  }

  getTableMetadataForm() {
    return this.page.getByTestId('edit-table-metadata-form');
  }

  getTableDisplayNameInput() {
    return this.page.getByTestId('edit-table-metadata-form-display-name');
  }

  getTableDescriptionInput() {
    return this.page.getByTestId('edit-table-metadata-form-description');
  }

  getTableDisplayFormatInput() {
    return this.page.getByTestId('edit-table-metadata-form-display-format');
  }

  getTableVisibilitySwitch() {
    return this.page.getByTestId('edit-table-metadata-form-visible');
  }

  getTableSearchableSwitch() {
    return this.page.getByTestId('edit-table-metadata-form-searchable');
  }

  getTableMetadataSaveButton() {
    return this.getTableMetadataDialog().getByRole('button', { name: /save/i });
  }

  getTableMetadataCancelButton() {
    return this.getTableMetadataDialog().getByRole('button', {
      name: /cancel/i,
    });
  }

  async fillTableMetadata(data: {
    displayName?: string;
    description?: string;
    displayFormat?: string;
    isVisible?: boolean;
    isSearchable?: boolean;
  }) {
    if (data.displayName !== undefined) {
      await this.getTableDisplayNameInput().fill(data.displayName);
    }

    if (data.description !== undefined) {
      await this.getTableDescriptionInput().fill(data.description);
    }

    if (data.displayFormat !== undefined) {
      await this.getTableDisplayFormatInput().fill(data.displayFormat);
    }

    if (data.isVisible !== undefined) {
      const currentState = await this.getTableVisibilitySwitch().isChecked();
      if (currentState !== data.isVisible) {
        await this.getTableVisibilitySwitch().click();
      }
    }

    if (data.isSearchable !== undefined) {
      const currentState = await this.getTableSearchableSwitch().isChecked();
      if (currentState !== data.isSearchable) {
        await this.getTableSearchableSwitch().click();
      }
    }
  }

  async saveTableMetadata() {
    await this.getTableMetadataSaveButton().click();
  }

  async cancelTableMetadata() {
    await this.getTableMetadataCancelButton().click();
  }

  // Column Metadata Dialog
  getColumnMetadataDialog() {
    return this.page.getByRole('dialog');
  }

  getColumnMetadataForm() {
    return this.page.getByTestId('edit-column-metadata-form');
  }

  getColumnDisplayNameInput() {
    return this.page.getByTestId('edit-column-metadata-form-display-name');
  }

  getColumnUiDataTypeSelect() {
    return this.page.getByTestId(
      'edit-column-metadata-form-ui-data-type-select-trigger',
    );
  }

  getColumnUiDataTypeOption(value: string) {
    return this.page
      .getByTestId('edit-column-metadata-form-ui-data-type-select-item')
      .filter({ hasText: value });
  }

  getColumnDescriptionTextarea() {
    return this.getColumnMetadataForm().getByRole('textbox', {
      name: /description/i,
    });
  }

  getColumnVisibleInTableSwitch() {
    return this.getColumnMetadataForm().getByRole('switch', {
      name: /visible in table/i,
    });
  }

  getColumnVisibleInDetailSwitch() {
    return this.getColumnMetadataForm().getByRole('switch', {
      name: /visible in detail/i,
    });
  }

  getColumnSearchableSwitch() {
    return this.getColumnMetadataForm().getByRole('switch', {
      name: /searchable/i,
    });
  }

  getColumnSortableSwitch() {
    return this.getColumnMetadataForm().getByRole('switch', {
      name: /sortable/i,
    });
  }

  getColumnFilterableSwitch() {
    return this.getColumnMetadataForm().getByRole('switch', {
      name: /filterable/i,
    });
  }

  getColumnEditableSwitch() {
    return this.getColumnMetadataForm().getByRole('switch', {
      name: /editable/i,
    });
  }

  getColumnMetadataSaveButton() {
    return this.getColumnMetadataDialog().getByRole('button', {
      name: /Save Changes/i,
    });
  }

  getColumnMetadataCancelButton() {
    return this.getColumnMetadataDialog().getByRole('button', {
      name: /cancel/i,
    });
  }

  async fillColumnMetadata(data: {
    displayName?: string;
    uiDataType?: string;
    description?: string;
    isVisibleInTable?: boolean;
    isVisibleInDetail?: boolean;
    isSearchable?: boolean;
    isSortable?: boolean;
    isFilterable?: boolean;
    isEditable?: boolean;
  }) {
    if (data.displayName !== undefined) {
      await this.getColumnDisplayNameInput().fill(data.displayName);
    }

    if (data.uiDataType !== undefined) {
      await this.getColumnUiDataTypeSelect().click();
      await this.getColumnUiDataTypeOption(data.uiDataType).click();
    }

    if (data.description !== undefined) {
      await this.getColumnDescriptionTextarea().fill(data.description);
    }

    // Handle individual visibility switches
    if (data.isVisibleInTable !== undefined) {
      const switchElement = this.getColumnVisibleInTableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isVisibleInTable) {
        await switchElement.click();
      }
    }

    if (data.isVisibleInDetail !== undefined) {
      const switchElement = this.getColumnVisibleInDetailSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isVisibleInDetail) {
        await switchElement.click();
      }
    }

    if (data.isSearchable !== undefined) {
      const switchElement = this.getColumnSearchableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isSearchable) {
        await switchElement.click();
      }
    }

    if (data.isSortable !== undefined) {
      const switchElement = this.getColumnSortableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isSortable) {
        await switchElement.click();
      }
    }

    if (data.isFilterable !== undefined) {
      const switchElement = this.getColumnFilterableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isFilterable) {
        await switchElement.click();
      }
    }

    if (data.isEditable !== undefined) {
      const switchElement = this.getColumnEditableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isEditable) {
        await switchElement.click();
      }
    }
  }

  async saveColumnMetadata() {
    await this.getColumnMetadataSaveButton().click();
  }

  async cancelColumnMetadata() {
    await this.getColumnMetadataCancelButton().click();
  }

  // Utility methods for assertions
  async expectPageToLoad() {
    await expect(this.getPageTitle()).toBeVisible();
    await expect(this.getDetailsCard()).toBeVisible();
    await expect(this.getColumnsTable()).toBeVisible();
  }

  async gotoFirstAvailableTable() {
    // Navigate to resources page to get first available table
    await this.page.goto('/settings/resources');

    await expect(this.page.getByTestId('resources-table')).toBeVisible();

    const rows = this.page.getByTestId('resources-table').getByRole('row');

    // Extract schema and table name from the first row
    const schemaCell = await rows.nth(1).locator('td').nth(3).textContent(); // Schema column

    const tableCell = await rows.nth(1).locator('td').nth(4).textContent(); // Table column

    if (!schemaCell || !tableCell) {
      throw new Error(
        'Could not extract schema and table names from resources table',
      );
    }

    const schema = schemaCell.trim();
    const table = tableCell.trim();

    // Navigate to the resource page
    await this.goto(schema, table);

    await this.expectPageToLoad();

    return { schema, table };
  }

  async expectTableMetadataDialogOpen() {
    await expect(this.getTableMetadataDialog()).toBeVisible();
    await expect(this.getTableMetadataForm()).toBeVisible();
  }

  async expectTableMetadataDialogClosed() {
    await expect(this.getTableMetadataDialog()).not.toBeVisible();
  }

  async expectColumnMetadataDialogOpen() {
    await expect(this.getColumnMetadataDialog()).toBeVisible();
    await expect(this.getColumnMetadataForm()).toBeVisible();
  }

  async expectColumnMetadataDialogClosed() {
    await expect(this.getColumnMetadataDialog()).not.toBeVisible();
  }

  async expectSaveButtonDisabled(dialog: 'table' | 'column') {
    const saveButton =
      dialog === 'table'
        ? this.getTableMetadataSaveButton()
        : this.getColumnMetadataSaveButton();

    await expect(saveButton).toBeDisabled();
  }

  async expectSaveButtonEnabled(dialog: 'table' | 'column') {
    const saveButton =
      dialog === 'table'
        ? this.getTableMetadataSaveButton()
        : this.getColumnMetadataSaveButton();

    await expect(saveButton).toBeEnabled();
  }

  async waitForColumnMetadataToComplete() {
    await this.page.waitForResponse((response) => {
      return (
        response.url().includes('/api/v1/tables/') &&
        response.url().endsWith('/columns') &&
        response.request().method() === 'PUT'
      );
    });
  }

  async waitForTableMetadataToComplete() {
    // Wait specifically for table metadata updates
    // Pattern: PUT /api/v1/tables/{schema}/{table} (without /columns)
    await this.page.waitForResponse((response) => {
      const url = response.url();

      return (
        url.includes('/api/v1/tables/') &&
        !url.endsWith('/columns') &&
        response.request().method() === 'PUT'
      );
    });
  }

  // Batch action methods for columns
  getColumnsBatchActionsToolbar() {
    return this.page.getByTestId('batch-actions-toolbar');
  }

  getColumnsBatchEditButton() {
    return this.page.getByRole('button', { name: /batch edit/i });
  }

  getColumnsClearSelectionButton() {
    return this.page.getByRole('button', { name: /clear/i });
  }

  getColumnsSaveButton() {
    return this.getColumnsBatchActionsToolbar().getByRole('button', {
      name: /save/i,
    });
  }

  getColumnsRevertButton() {
    return this.getColumnsClearSelectionButton();
  }

  getColumnsSelectAllCheckbox() {
    return this.page.getByTestId('columns-select-all-checkbox');
  }

  getColumnRowCheckbox(columnName: string) {
    return this.getColumnRow(columnName).getByRole('checkbox');
  }

  async selectColumnByName(columnName: string) {
    const row = this.getColumnRow(columnName);
    await row.getByRole('checkbox').check();
  }

  async selectMultipleColumns(columnNames: string[]) {
    for (const columnName of columnNames) {
      await this.selectColumnByName(columnName);
    }
  }

  async getSelectedColumnsCount() {
    const toolbar = this.getColumnsBatchActionsToolbar();
    const countText = await toolbar.locator('span').first().textContent();
    const match = countText?.match(/(\d+)/);

    return match ? parseInt(match[1]!, 10) : 0;
  }

  // Batch edit dialog methods for columns
  getColumnsBatchEditDialog() {
    return this.page.getByRole('dialog');
  }

  getColumnsBatchEditTitle() {
    return this.getColumnsBatchEditDialog().getByRole('heading');
  }

  // Individual switches in batch edit dialog
  getBatchVisibleInTableSwitch() {
    return this.getColumnsBatchEditDialog().getByRole('switch').first();
  }

  getBatchVisibleInDetailSwitch() {
    return this.getColumnsBatchEditDialog().getByRole('switch').nth(1);
  }

  getBatchSearchableSwitch() {
    return this.getColumnsBatchEditDialog().getByRole('switch').nth(2);
  }

  getBatchSortableSwitch() {
    return this.getColumnsBatchEditDialog().getByRole('switch').nth(3);
  }

  getBatchFilterableSwitch() {
    return this.getColumnsBatchEditDialog().getByRole('switch').nth(4);
  }

  getBatchEditableSwitch() {
    return this.getColumnsBatchEditDialog().getByRole('switch').nth(5);
  }

  getBatchEditSaveButton() {
    return this.getColumnsBatchEditDialog().getByRole('button', {
      name: /save changes/i,
    });
  }

  getBatchEditCancelButton() {
    return this.getColumnsBatchEditDialog().getByRole('button', {
      name: /cancel/i,
    });
  }

  async fillBatchColumnMetadata(data: {
    isVisibleInTable?: boolean;
    isVisibleInDetail?: boolean;
    isSearchable?: boolean;
    isSortable?: boolean;
    isFilterable?: boolean;
    isEditable?: boolean;
  }) {
    if (data.isVisibleInTable !== undefined) {
      const switchElement = this.getBatchVisibleInTableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isVisibleInTable) {
        await switchElement.click();
      }
    }

    if (data.isVisibleInDetail !== undefined) {
      const switchElement = this.getBatchVisibleInDetailSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isVisibleInDetail) {
        await switchElement.click();
      }
    }

    if (data.isSearchable !== undefined) {
      const switchElement = this.getBatchSearchableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isSearchable) {
        await switchElement.click();
      }
    }

    if (data.isSortable !== undefined) {
      const switchElement = this.getBatchSortableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isSortable) {
        await switchElement.click();
      }
    }

    if (data.isFilterable !== undefined) {
      const switchElement = this.getBatchFilterableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isFilterable) {
        await switchElement.click();
      }
    }

    if (data.isEditable !== undefined) {
      const switchElement = this.getBatchEditableSwitch();
      const currentState = await switchElement.isChecked();
      if (currentState !== data.isEditable) {
        await switchElement.click();
      }
    }
  }

  async saveBatchColumnMetadata() {
    await this.getBatchEditSaveButton().click();
  }

  async cancelBatchColumnMetadata() {
    await this.getBatchEditCancelButton().click();
  }

  // Utility methods for batch operations
  async expectColumnsBatchActionsVisible() {
    await expect(this.getColumnsBatchActionsToolbar()).toBeVisible();
  }

  async expectColumnsBatchActionsHidden() {
    await expect(this.getColumnsBatchActionsToolbar()).not.toBeVisible();
  }

  async expectColumnsBatchEditDialogOpen() {
    await expect(this.getColumnsBatchEditDialog()).toBeVisible();
    await expect(this.getBatchEditSaveButton()).toBeVisible();
  }

  async expectColumnsBatchEditDialogClosed() {
    await expect(this.getColumnsBatchEditDialog()).not.toBeVisible();
  }

  async getColumnBooleanCellValue(
    columnName: string,
    property:
      | 'isVisibleInTable'
      | 'isVisibleInDetail'
      | 'isSearchable'
      | 'isSortable'
      | 'isFilterable'
      | 'isEditable',
  ) {
    const row = this.getColumnRow(columnName);
    const cellSelector = this.getCellSelectorForProperty(property);
    const cell = row.locator(cellSelector);

    // Check if the cell contains a CheckIcon (green) or XIcon (red)
    const hasCheckIcon = await cell
      .locator('svg')
      .first()
      .getAttribute('class');
    return hasCheckIcon?.includes('text-green-500') ?? false;
  }

  private getCellSelectorForProperty(property: string): string {
    const propertyMap = {
      isVisibleInTable: '[data-column="isVisibleInTable"]',
      isVisibleInDetail: '[data-column="isVisibleInDetail"]',
      isSearchable: '[data-column="isSearchable"]',
      isSortable: '[data-column="isSortable"]',
      isFilterable: '[data-column="isFilterable"]',
      isEditable: '[data-column="isEditable"]',
    };

    return propertyMap[property as keyof typeof propertyMap] || 'td';
  }
}
