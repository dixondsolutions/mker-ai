import { notFound } from 'next/navigation';

import { ServerDataLoader } from '@makerkit/data-loader-supabase-nextjs';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { PageBody } from '@kit/ui/page';

import { loadTeamWorkspace } from '~/home/[account]/_lib/server/team-account-workspace.loader';
import { CrawlWebsiteModal } from '~/home/[account]/chatbots/[chatbot]/_components/crawl-website-modal';
import { DocumentsTable } from '~/home/[account]/chatbots/[chatbot]/_components/documents-table';
import { DocumentDialog } from '~/home/[account]/chatbots/[chatbot]/documents/_components/document-dialog';
import { loadChatbot } from '~/home/[account]/chatbots/_lib/server/load-chatbot';
import { Database } from '~/lib/database.types';
import { withI18n } from '~/lib/i18n/with-i18n';

interface ChatbotPageParams {
  params: Promise<{
    account: string;
    chatbot: string;
  }>;

  searchParams: Promise<{
    page?: string;
    query?: string;
  }>;
}

export const metadata = {
  title: 'Documents',
};

async function ChatbotPage(props: ChatbotPageParams) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const client = getSupabaseServerClient<Database>();
  const chatbotId = params.chatbot;
  const page = searchParams.page ? +searchParams.page : 1;

  const [{ account }, chatbot] = await Promise.all([
    loadTeamWorkspace(params.account),
    loadChatbot(chatbotId),
  ]);

  if (!chatbot) {
    return notFound();
  }

  return (
    <PageBody>
      <ServerDataLoader
        client={client}
        page={page}
        table={'documents'}
        where={{
          chatbot_id: {
            eq: chatbotId,
          },
        }}
      >
        {(props) => {
          if (props.count === 0) {
            return (
              <ChatbotsEmptyState
                id={chatbotId}
                url={chatbot.url}
                accountId={account.id}
              />
            );
          }

          return <DocumentsTable {...props} />;
        }}
      </ServerDataLoader>

      <DocumentDialog />
    </PageBody>
  );
}

export default withI18n(ChatbotPage);

function ChatbotsEmptyState(props: {
  id: string;
  url: string;
  accountId: string;
}) {
  return (
    <EmptyState>
      <EmptyStateHeading>No documents found</EmptyStateHeading>

      <EmptyStateText>
        Get started by crawling your website to train your
      </EmptyStateText>

      <CrawlWebsiteModal
        accountId={props.accountId}
        chatbotId={props.id}
        url={props.url}
      >
        <EmptyStateButton>Train Chatbot with Website</EmptyStateButton>
      </CrawlWebsiteModal>
    </EmptyState>
  );
}
