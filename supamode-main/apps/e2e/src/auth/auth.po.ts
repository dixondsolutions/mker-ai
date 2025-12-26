import { Page } from '@playwright/test';

import { getDrizzleSupabaseAdminClient } from '@kit/supabase/client';
import { getSupabaseAdminClient } from '@kit/supabase/hono';
import { accountsInSupamode } from '@kit/supabase/schema';

export class AuthPageObject {
  constructor(private readonly page: Page) {}

  /**
   * Login as root user
   */
  async loginAsRootUser() {
    await this.loginAsUser(
      process.env['TEST_ROOT_EMAIL']!,
      process.env['TEST_PASSWORD']!,
    );
  }

  /**
   * Login as admin user
   */
  async loginAsAdminUser() {
    await this.loginAsUser(
      process.env['TEST_ADMIN_EMAIL']!,
      process.env['TEST_PASSWORD']!,
    );
  }

  /**
   * Login as readonly user
   */
  async loginAsReadonlyUser() {
    await this.loginAsUser(
      process.env['TEST_READONLY_EMAIL']!,
      process.env['TEST_PASSWORD']!,
    );
  }

  /**
   * Login as user
   * @param email - The email of the user
   * @param password - The password of the user
   */
  async loginAsUser(email: string, password: string) {
    await this.page.goto('/auth/sign-in', {
      waitUntil: 'commit',
    });

    await this.page.getByTestId('email-input').fill(email);
    await this.page.getByTestId('password-input').fill(password);
    await this.page.getByTestId('auth-submit-button').click();

    await this.page.waitForURL('/', {
      waitUntil: 'commit',
    });
  }

  async createCredentials() {
    const randomSuffix = Math.random().toString(36).substring(7);
    const email = `test-${randomSuffix}@supamode.com`;

    return {
      email,
      password: 'password',
      name: `User ${randomSuffix}`,
    };
  }

  /**
   * Bootstrap a user
   * @param email - The email of the user
   * @param password - The password of the user
   * @param name
   * @returns The account
   */
  async bootstrapUser({
    email,
    password,
    name,
  }: {
    email: string;
    password: string;
    name: string;
  }) {
    const client = getSupabaseAdminClient();
    const drizzleClient = getDrizzleSupabaseAdminClient();

    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
    });

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    await client.auth.admin.updateUserById(data.user.id, {
      app_metadata: {
        supamode_access: 'true',
      },
    });

    return drizzleClient.insert(accountsInSupamode).values({
      authUserId: data.user.id,
      isActive: true,
      metadata: {
        display_name: name,
        email,
      },
    });
  }
}
