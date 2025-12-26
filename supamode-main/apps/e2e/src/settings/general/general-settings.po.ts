import { Page } from '@playwright/test';

export class GeneralSettingsPageObject {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/settings/general', {
      waitUntil: 'commit',
    });
  }

  getForm() {
    return this.page.getByTestId('general-settings-form');
  }

  getLanguageSelectorTrigger() {
    return this.page.getByTestId('language-selector-trigger');
  }

  getLanguageSelectorItem(locale: string) {
    return this.page.getByTestId(`language-selector-item-${locale}`);
  }

  async selectLanguage(locale: string) {
    await this.getLanguageSelectorTrigger().click();
    await this.getLanguageSelectorItem(locale).click();
  }

  getTimezoneSelectorTrigger() {
    return this.page.getByTestId('timezone-selector-trigger');
  }

  getTimezoneSelectorItem(timezone: string) {
    return this.page.getByTestId(`timezone-selector-item-${timezone}`);
  }

  async selectTimezone(timezone: string) {
    await this.getTimezoneSelectorTrigger().click();
    await this.page.getByTestId('timezone-selector-input').fill(timezone);
    await this.getTimezoneSelectorItem(timezone).click();
  }

  getSubmitButton() {
    return this.getForm().getByRole('button', {
      name: 'Save',
    });
  }

  async submit() {
    await this.getSubmitButton().click();
  }
}
