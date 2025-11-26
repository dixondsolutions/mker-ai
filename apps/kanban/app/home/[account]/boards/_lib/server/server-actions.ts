'use server';

import { redirect } from 'next/navigation';

import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';

import { Database } from '~/lib/database.types';
import { insertBoard } from '~/lib/kanban/boards/mutations';

export const createBoardAction = enhanceAction(
  async (data) => {
    const client = getSupabaseServerClient();
    const teamAccountsApi = createTeamAccountsApi(client);

    const account = await teamAccountsApi.getTeamAccount(data.accountSlug);

    const { data: board, error } = await insertBoard(
      getSupabaseServerClient<Database>(),
      {
        name: data.name,
        description: data.description,
        accountId: account.id,
      },
    )
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    redirect(`boards/${board.id}`);
  },
  {
    schema: z.object({
      name: z.string().min(2),
      description: z.string(),
      accountSlug: z.string().min(1),
    }),
  },
);
