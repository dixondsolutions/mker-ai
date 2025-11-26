import { SupabaseClient } from '@supabase/supabase-js';

import { ServerDataLoader } from '@makerkit/data-loader-supabase-nextjs';
import { PlusCircleIcon } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { ChatbotsTable } from '~/home/[account]/chatbots/[chatbot]/_components/chatbots-table';
import { CreateChatbotModal } from '~/home/[account]/chatbots/[chatbot]/_components/create-chatbot-modal';
import { Database } from '~/lib/database.types';
import { withI18n } from '~/lib/i18n/with-i18n';

export const metadata = {
  title: 'Chatbots',
};

interface ChatbotsPageProps {
  params: Promise<{
    account: string;
  }>;

  searchParams: Promise<{
    page?: string;
  }>;
}

async function ChatbotsPage(props: ChatbotsPageProps) {
  const client = getSupabaseServerClient<Database>();

  const [params, searchParams] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const page = searchParams.page ? +searchParams.page : 1;

  const { canCreateChatbot, accountId } = await loadData(
    client,
    params.account,
  );

  return (
    <>
      <PageHeader description={<AppBreadcrumbs />}>
        <CreateChatbotModal
          accountId={accountId}
          canCreateChatbot={canCreateChatbot}
        >
          <Button>
            <PlusCircleIcon className={'mr-2 w-4'} />

            <span>Add Chatbot</span>
          </Button>
        </CreateChatbotModal>
      </PageHeader>

      <PageBody>
        <ServerDataLoader
          client={client}
          table={'chatbots'}
          page={page}
          where={{
            account_id: {
              eq: accountId,
            },
          }}
        >
          {(props) => {
            if (!props.data.length && canCreateChatbot) {
              return <ChatbotsEmptyState accountId={accountId} />;
            }

            return <ChatbotsTable {...props} />;
          }}
        </ServerDataLoader>
      </PageBody>
    </>
  );
}

export default withI18n(ChatbotsPage);

function ChatbotsEmptyState({ accountId }: { accountId: string }) {
  return (
    <EmptyState>
      <EmptyStateHeading>
        <Trans i18nKey={'chatbot:chatbotsEmptyStateHeading'} />
      </EmptyStateHeading>

      <EmptyStateText>
        <Trans i18nKey={'chatbot:chatbotsEmptyStateSubheading'} />
      </EmptyStateText>

      <CreateChatbotModal accountId={accountId} canCreateChatbot={true}>
        <EmptyStateButton>
          <PlusCircleIcon className={'mr-2 h-4'} />

          <span>
            <Trans i18nKey={'chatbot:chatbotsEmptyStateButton'} />
          </span>
        </EmptyStateButton>
      </CreateChatbotModal>
    </EmptyState>
  );
}

async function loadData(client: SupabaseClient<Database>, slug: string) {
  const { account } = await loadTeamWorkspace(slug);

  const canCreateChatbot = await client
    .rpc('can_create_chatbot', {
      target_account_id: account.id,
    })
    .then((response) => {
      if (response.error) {
        console.error(response.error);

        return false;
      }

      return response.data;
    });

  return { canCreateChatbot, accountId: account.id };
}
