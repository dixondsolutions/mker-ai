import { Page, expect } from '@playwright/test';

export class DashboardPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/dashboards', {
      waitUntil: 'commit',
    });
  }

  // Basic page elements
  getPageTitle() {
    return this.page.getByRole('heading', { level: 1 });
  }

  getDashboardGrid() {
    return this.page.getByTestId('dashboard-grid');
  }

  getDashboardEmptyState() {
    return this.page.getByTestId('dashboard-empty-state');
  }

  // Dashboard creation elements
  getAddDashboardButton() {
    // Try the header button first (when dashboards exist), then fall back to empty state button
    return this.page
      .getByTestId('add-dashboard-button-header')
      .or(this.page.getByTestId('add-dashboard-button-empty'));
  }

  getCreateDashboardDialog() {
    return this.page.getByTestId('create-dashboard-dialog');
  }

  getDashboardNameInput() {
    return this.page.getByTestId('dashboard-name-input');
  }

  getCreateDashboardSubmitButton() {
    return this.page.getByTestId('create-dashboard-submit');
  }

  // Dashboard actions menu
  getDashboardActionsMenu() {
    return this.page.getByTestId('dashboard-actions-menu');
  }

  getDeleteDashboardButton() {
    return this.page.getByTestId('delete-dashboard-button');
  }

  getConfirmDeleteButton() {
    return this.page.getByTestId('confirm-delete-dashboard');
  }

  getRenameDashboardButton() {
    return this.page.getByTestId('rename-dashboard-button');
  }

  // Rename dashboard dialog elements
  getRenameDashboardInput() {
    // The rename form uses a standard input field within the dialog
    return this.page.getByRole('dialog').getByRole('textbox');
  }

  getRenameDashboardSaveButton() {
    // The save button should be in the dialog
    return this.page.getByRole('dialog').getByRole('button', { name: /save/i });
  }

  // Widget editing elements
  getWidgetEditButton() {
    return this.page.getByTestId('widget-edit-button');
  }

  getWidgetConfigPanel() {
    return this.page.getByTestId('widget-config-panel');
  }

  getWidgetTitleInput() {
    return this.page.getByTestId('widget-title-input');
  }

  getWidgetSaveButton() {
    return this.page.getByTestId('widget-save-button');
  }

  // Dashboard creation helpers
  async createDashboard(name: string) {
    // Navigate to dashboards page
    await this.goto();

    // Open creation dialog
    await this.getAddDashboardButton().click();
    await expect(this.getCreateDashboardDialog()).toBeVisible();

    // Fill in dashboard name
    await this.getDashboardNameInput().fill(name);

    await Promise.all([
      this.getCreateDashboardSubmitButton().click(),
      this.page.waitForResponse(
        (response) =>
          response.url().includes('v1/dashboards') &&
          response.status() === 201 &&
          response.request().method() === 'POST',
      ),
    ]);

    // Verify we're redirected to the new dashboard
    await this.page.waitForTimeout(1000);

    return name;
  }

  // Widget dialog helpers
  async openWidgetDialog() {
    // Wait for the add widget button to be visible and click it
    await expect(async () => {
      const addWidgetButton = this.page
        .getByTestId('add-widget-button-empty')
        .or(this.page.getByTestId('add-widget-button-header'))
        .first();

      await expect(addWidgetButton).toBeVisible();
      await addWidgetButton.click();

      // Verify widget creation dialog opens
      await expect(this.page.getByTestId('widget-wizard-dialog')).toBeVisible();
    }).toPass();
  }

  // Widget creation helpers
  async createWidget(config: {
    type: 'metric' | 'chart' | 'table';
    title: string;
    schema?: string; // If not provided, will select first available
    table?: string; // If not provided, will select first available
    skipFilters?: boolean; // Default true - skip filter configuration
  }) {
    // Open widget wizard
    await this.openWidgetDialog();

    // Step 0: Basic Info and Type Selection
    await this.page.getByTestId(`widget-type-${config.type}`).click();
    await this.page.getByTestId('widget-title-input').fill(config.title);

    // Proceed to data configuration
    await this.page.getByTestId('wizard-next-button').click();

    // Step 1: Data Configuration - Configure schema and table
    await expect(async () => {
      const schemaSelect = this.page.getByTestId('widget-schema-select');
      await expect(schemaSelect).toBeVisible();
      await schemaSelect.click();
      const firstSchema = this.page.getByRole('option').first();
      await expect(firstSchema).toBeVisible();
      await firstSchema.click();
    }).toPass();

    await expect(async () => {
      const tableSelect = this.page.getByTestId('widget-table-select');
      await expect(tableSelect).toBeVisible();
      await tableSelect.click();
      const firstTable = this.page.getByRole('option').first();
      await expect(firstTable).toBeVisible();
      await firstTable.click();
    }).toPass();

    // Continue through wizard steps
    await this.page.getByTestId('wizard-next-button').click(); // Filters step
    await this.page.getByTestId('wizard-next-button').click(); // Preview step

    // Save widget
    const saveButton = this.page.getByTestId('widget-save-button');
    await expect(saveButton).toBeVisible();

    await Promise.all([
      saveButton.click(),
      this.page.waitForResponse(
        (response) =>
          response.url().includes('widgets') &&
          response.status() === 201 &&
          response.request().method() === 'POST',
      ),
    ]);

    await expect(await this.getWidgetContainer(config.title)).toBeVisible();
  }

  private async selectWidgetType(type: 'metric' | 'chart' | 'table') {
    const widgetTypeButton = this.page.getByTestId(`widget-type-${type}`);
    await expect(widgetTypeButton).toBeVisible();
    await widgetTypeButton.click();
  }

  private async fillWidgetTitle(title: string) {
    const titleInput = this.page.getByTestId('widget-title-input');
    await expect(titleInput).toBeVisible();
    await titleInput.fill(title);
  }

  private async proceedToNextStep() {
    const nextButton = this.page.getByTestId('wizard-next-button');
    await expect(nextButton).toBeVisible();
    await nextButton.click();
    // Wait a bit for the next step to load
    await this.page.waitForTimeout(500);
  }

  private async selectSchemaAndTable(schema?: string, table?: string) {
    // Select schema
    await expect(async () => {
      const schemaSelect = this.page.getByTestId('widget-schema-select');
      await expect(schemaSelect).toBeVisible();
      await schemaSelect.click();

      if (schema) {
        // Select specific schema
        const schemaOption = this.page.getByRole('option', { name: schema });
        await expect(schemaOption).toBeVisible();
        await schemaOption.click();
      } else {
        // Select first available schema
        const firstSchema = this.page.getByRole('option').first();
        await expect(firstSchema).toBeVisible();
        await firstSchema.click();
      }
    }).toPass();

    // Select table
    await expect(async () => {
      const tableSelect = this.page.getByTestId('widget-table-select');
      await expect(tableSelect).toBeVisible();
      await tableSelect.click();

      if (table) {
        // Select specific table
        const tableOption = this.page.getByRole('option', { name: table });
        await expect(tableOption).toBeVisible();
        await tableOption.click();
      } else {
        // Select first available table
        const firstTable = this.page.getByRole('option').first();
        await expect(firstTable).toBeVisible();
        await firstTable.click();
      }
    }).toPass();
  }

  private async _configureFilters(
    _filters: Array<{ column: string; operator: string; value: string }>,
  ) {
    // This would need to be implemented based on the actual filter UI
    // For now, we'll skip filter configuration
    // TODO: Implement filter configuration when needed
  }

  private async saveWidget() {
    // On the preview step (step 3), the button changes to 'widget-save-button'
    // Wait for step to load and check for both possible buttons
    await expect(async () => {
      // Check if we have the next button (not on last step) or save button (on last step)
      const nextButton = this.page.getByTestId('wizard-next-button');
      const saveButton = this.page.getByTestId('widget-save-button');

      // If we still have a next button, we're not on the last step
      if (await nextButton.isVisible()) {
        await nextButton.click();
        await this.page.waitForTimeout(500);
        // After clicking next, we should be on the save step
        await expect(saveButton).toBeVisible();
      } else {
        // We're already on the save step
        await expect(saveButton).toBeVisible();
      }

      await saveButton.click();
    }).toPass({ timeout: 15000 });
  }

  async getWidgetContainer(widgetTitle: string) {
    return this.page.locator(`[data-widget-title="${widgetTitle}"]`);
  }

  // Widget deletion helpers
  async deleteWidget(widgetTitle?: string) {
    // Find the widget container (optionally by title)
    let widgetContainer;
    if (widgetTitle) {
      widgetContainer = this.page
        .getByTestId('widget-container')
        .filter({ hasText: widgetTitle });
    } else {
      widgetContainer = this.page.getByTestId('widget-container').first();
    }

    await expect(widgetContainer).toBeVisible();

    // Open widget actions menu - look for the more actions button
    const widgetActions = widgetContainer
      .getByTestId('widget-header')
      .locator('button[class*="opacity-0"]');
    await expect(widgetActions).toBeVisible();
    await widgetActions.click();

    // Click delete button
    await expect(this.page.getByTestId('widget-delete-button')).toBeVisible();
    await this.page.getByTestId('widget-delete-button').click();

    // Confirm deletion
    await expect(this.page.getByTestId('confirm-delete-widget')).toBeVisible();
    await this.page.getByTestId('confirm-delete-widget').click();

    // Verify widget is deleted
    await expect(widgetContainer).not.toBeVisible();
  }

  // Dashboard deletion helpers
  async deleteDashboard(dashboardName?: string) {
    // If dashboard name is provided, navigate to it first
    if (dashboardName) {
      await this.goto();
      const dashboardLink = this.page.getByText(dashboardName).first();
      if (await dashboardLink.isVisible({ timeout: 2000 })) {
        await dashboardLink.click();
        // Wait for dashboard page to load
        await this.page.waitForURL(/\/dashboards\/[^\/]+$/, { timeout: 5000 });
      }
    }

    // Open dashboard actions menu
    await this.getDashboardActionsMenu().click();

    // Click delete button
    await this.getDeleteDashboardButton().click();

    // Confirm deletion
    await Promise.all([
      this.getConfirmDeleteButton().click(),
      this.page.waitForResponse('**/api/**'),
    ]);

    // Verify dialog closes and dashboard is deleted
    await expect(this.page.getByRole('dialog')).not.toBeVisible();

    if (dashboardName) {
      await expect(
        this.page.getByText(dashboardName).first(),
      ).not.toBeVisible();
    }
  }

  // Widget editing helpers
  async updateWidget(widgetTitle: string, newTitle: string) {
    // Find the widget container by title
    const widgetContainer = this.page
      .getByTestId('widget-container')
      .filter({ hasText: widgetTitle });

    await expect(widgetContainer).toBeVisible();

    // Open widget actions menu - look for the more actions button
    const widgetActions = widgetContainer
      .getByTestId('widget-header')
      .locator('button[class*="opacity-0"]');

    await expect(widgetActions).toBeVisible();
    await widgetActions.click();

    // Click edit button - this opens the widget wizard in edit mode
    await expect(this.getWidgetEditButton()).toBeVisible();
    await this.getWidgetEditButton().click();

    // Verify widget wizard opens in edit mode
    await expect(this.page.getByTestId('widget-wizard-dialog')).toBeVisible();

    // Update the title
    const titleInput = this.page.getByTestId('widget-title-input');
    await expect(titleInput).toBeVisible();
    await titleInput.clear();
    await titleInput.fill(newTitle);

    // Save changes - navigate to the last step where save button appears
    await this.page.getByTestId('wizard-next-button').click(); // Data config
    await this.page.getByTestId('wizard-next-button').click(); // Filters
    await this.page.getByTestId('wizard-next-button').click(); // Preview

    // Save the widget
    const saveButton = this.page.getByTestId('widget-save-button');
    await expect(saveButton).toBeVisible();

    await Promise.all([
      saveButton.click(),
      this.page.waitForResponse('**/api/**'),
    ]);

    // Verify the title was updated
    await expect(this.page.getByTestId('widget-title')).toContainText(newTitle);

    await expect(this.page.getByTestId('widget-title')).not.toContainText(
      widgetTitle,
    );
  }
}
