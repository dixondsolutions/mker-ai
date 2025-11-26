import { ChatbotSettings } from '@kit/chatbot-widget/chatbot';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { loadChatbot } from '~/home/[account]/chatbots/_lib/server/load-chatbot';
import { withI18n } from '~/lib/i18n/with-i18n';

import { ChatBotWidgetContainer } from './_components/chatbot-widget-container';

interface ChatbotPlaygroundPageParams {
  params: Promise<{
    organization: string;
    chatbot: string;
  }>;
}

const LOCAL_STORAGE_KEY = 'chatbot-playground';

export const metadata = {
  title: 'Playground',
};

async function ChatbotPlaygroundPage(props: ChatbotPlaygroundPageParams) {
  const params = await props.params;
  const chatbot = await loadChatbot(params.chatbot);
  const settings = chatbot.settings as unknown as ChatbotSettings;

  return (
    <>
      <PageBody className={'space-y-2'}>
        <p className={'text-sm'}>
          <Trans i18nKey={'chatbot:playgroundTabSubheading'} />
        </p>
      </PageBody>

      <ChatBotWidgetContainer
        isOpen
        chatbotId={chatbot.id}
        siteName={chatbot.site_name}
        settings={settings}
        storageKey={LOCAL_STORAGE_KEY}
      />
    </>
  );
}

export default withI18n(ChatbotPlaygroundPage);
