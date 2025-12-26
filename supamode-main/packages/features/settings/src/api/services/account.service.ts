import { eq, sql } from 'drizzle-orm';
import { Context } from 'hono';

import { accountsInSupamode } from '@kit/supabase/schema';

/**
 * Create the account service
 * @param c - The context
 * @returns The account service
 */
export function createAccountService(c: Context) {
  return new AccountService(c);
}

/**
 * Update preferences service
 */
class AccountService {
  constructor(private readonly context: Context) {}

  /**
   * Get the preferences for the current user/account
   * @returns The preferences for the current user/account
   */
  async getAccount() {
    const client = this.context.get('drizzle');

    return client
      .runTransaction(async (tx) => {
        return tx
          .select()
          .from(accountsInSupamode)
          .where(eq(accountsInSupamode.authUserId, sql`auth.uid()`))
          .limit(1);
      })
      .then((result) => {
        return result[0] as typeof accountsInSupamode.$inferSelect;
      });
  }

  /**
   * Update the preferences field for the current user/account
   * @param preferences - The new preferences object
   * @returns The updated account
   */
  async updatePreferences(preferences: {
    language?: string;
    timezone?: string;
  }) {
    const client = this.context.get('drizzle');

    return client.runTransaction(async (tx) => {
      return tx.execute(
        sql`
          select supamode.update_user_preferences(${JSON.stringify(preferences)}::jsonb)
        `,
      );
    });
  }
}
