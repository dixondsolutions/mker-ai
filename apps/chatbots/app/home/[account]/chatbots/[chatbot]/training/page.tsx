import { ServerDataLoader } from '@makerkit/data-loader-supabase-nextjs';
import { PlusCircleIcon } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { Button } from '@kit/ui/button';
import {
  EmptyState,
  EmptyStateButton,
  EmptyStateHeading,
  EmptyStateText,
} from '@kit/ui/empty-state';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { loadChatbot } from '~/home/[account]/chatbots/_lib/server/load-chatbot';
import { Database } from '~/lib/database.types';
import { withI18n } from '~/lib/i18n/with-i18n';

import { CrawlWebsiteModal } from '../_components/crawl-website-modal';
import { JobsTable } from './_components/jobs-table';

interface ChatbotTrainingPageParams {
  params: Promise<{
    account: string;
    chatbot: string;
  }>;

  searchParams: Promise<{
    page?: string;
  }>;
}

export const metadata = {
  title: 'Training',
};

async function ChatbotTrainingPage(props: ChatbotTrainingPageParams) {
  const params = await props.params;
  const searchParams = await props.searchParams;

  const client = getSupabaseServerClient<Database>();
  const page = searchParams.page ? +searchParams.page : 1;
  const chatbot = await loadChatbot(params.chatbot);

  return (
    <PageBody className={'space-y-4'}>
      <div className={'flex items-end justify-end space-x-4'}>
        <div>
          <TrainingButton
            accountId={chatbot.account_id}
            chatbotId={chatbot.id}
            url={chatbot.url}
          />
        </div>
      </div>

      <ServerDataLoader
        client={client}
        table={'jobs'}
        camelCase
        page={page}
        where={{
          chatbot_id: {
            eq: chatbot.id,
          },
        }}
      >
        {({ data, count, pageSize }) => {
          if (!count) {
            return (
              <TrainingEmptyState
                accountId={chatbot.account_id}
                chatbotId={chatbot.id}
                url={chatbot.url}
              />
            );
          }

          return (
            <JobsTable
              jobs={data}
              page={page}
              perPage={pageSize}
              count={count}
            />
          );
        }}
      </ServerDataLoader>
    </PageBody>
  );
}

export default withI18n(ChatbotTrainingPage);

function TrainingButton(props: {
  chatbotId: string;
  url: string;
  accountId: string;
}) {
  return (
    <div className={'flex'}>
      <CrawlWebsiteModal {...props}>
        <Button variant={'outline'}>
          <PlusCircleIcon className={'mr-2 h-4 w-4'} />

          <span>
            <Trans i18nKey={'chatbot:trainChatbotButton'} />
          </span>
        </Button>
      </CrawlWebsiteModal>
    </div>
  );
}

function TrainingEmptyState(props: {
  chatbotId: string;
  url: string;
  accountId: string;
}) {
  return (
    <EmptyState>
      <EmptyStateHeading>
        <Trans i18nKey={'chatbot:noJobsFound'} />
      </EmptyStateHeading>

      <EmptyStateText>
        <Trans i18nKey={'chatbot:noJobsFoundDescription'} />
      </EmptyStateText>

      <CrawlWebsiteModal {...props}>
        <EmptyStateButton>
          <Trans i18nKey={'chatbot:importDocumentsButton'} />
        </EmptyStateButton>
      </CrawlWebsiteModal>
    </EmptyState>
  );
}
