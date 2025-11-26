import { EditIcon } from 'lucide-react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import {
  BorderedNavigationMenu,
  BorderedNavigationMenuItem,
} from '@kit/ui/bordered-navigation-menu';
import { Button } from '@kit/ui/button';
import { PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { EditChatDialog } from '~/home/[account]/chatbots/_components/edit-chat-dialog';
import { loadChatbot } from '~/home/[account]/chatbots/_lib/server/load-chatbot';
import { withI18n } from '~/lib/i18n/with-i18n';

interface ChatbotLayoutProps {
  params: Promise<{
    account: string;
    chatbot: string;
  }>;
}

async function ChatbotLayout(
  props: React.PropsWithChildren<ChatbotLayoutProps>,
) {
  const params = await props.params;
  const chatbot = await loadChatbot(params.chatbot);

  const path = (path = '') => {
    const { account, chatbot } = params;

    return ['/home', account, 'chatbots', chatbot, path]
      .filter(Boolean)
      .join('/');
  };

  return (
    <div className={'flex h-full flex-col space-y-4'}>
      <div>
        <PageHeader
          description={
            <AppBreadcrumbs
              values={{
                [chatbot.id]: chatbot.name,
              }}
            />
          }
        >
          <div className={'flex space-x-2'}>
            <EditChatDialog chatbot={chatbot}>
              <Button variant={'outline'}>
                <EditIcon className={'mr-2 h-4'} />

                <span>
                  <Trans i18nKey={'chatbot:editChatbotTitle'} />
                </span>
              </Button>
            </EditChatDialog>
          </div>
        </PageHeader>

        <div className={'border-b px-4 pb-2.5'}>
          <BorderedNavigationMenu>
            <BorderedNavigationMenuItem
              {...{
                path: path('documents'),
                label: 'chatbot:documentsTab',
              }}
            />

            <BorderedNavigationMenuItem
              {...{
                path: path('training'),
                label: 'chatbot:trainingTab',
              }}
            />

            <BorderedNavigationMenuItem
              {...{
                path: path('design'),
                label: 'chatbot:designTab',
              }}
            />

            <BorderedNavigationMenuItem
              {...{
                path: path('playground'),
                label: 'chatbot:playgroundTab',
              }}
            />

            <BorderedNavigationMenuItem
              {...{
                path: path('publish'),
                label: 'chatbot:publishTab',
              }}
            />
          </BorderedNavigationMenu>
        </div>
      </div>

      {props.children}
    </div>
  );
}

export default withI18n(ChatbotLayout);
