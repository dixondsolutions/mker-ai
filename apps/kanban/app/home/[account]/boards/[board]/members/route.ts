import { NextResponse } from 'next/server';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { createTeamAccountsApi } from '@kit/team-accounts/api';

export async function GET(
  _: Request,
  params: {
    account: string;
  },
) {
  const client = getSupabaseServerClient();
  const teamAccountApi = createTeamAccountsApi(client);

  const members = await teamAccountApi.getMembers(params.account);

  return NextResponse.json(members);
}
