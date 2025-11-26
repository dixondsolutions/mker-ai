import { ChatbotSettings } from '@kit/chatbot-widget/chatbot';
import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { loadChatbot } from '~/home/[account]/chatbots/_lib/server/load-chatbot';
import { withI18n } from '~/lib/i18n/with-i18n';

import { DesignChatbotContainer } from './_components/design-chatbot-container';

interface ChatbotDesignPageParams {
  params: Promise<{
    account: string;
    chatbot: string;
  }>;
}

export const metadata = {
  title: 'Design',
};

async function ChatbotDesignPage(props: ChatbotDesignPageParams) {
  const params = await props.params;
  const chatbot = await loadChatbot(params.chatbot);
  const settings = chatbot.settings as unknown as ChatbotSettings;

  return (
    <PageBody className={'space-y-4'}>
      <div className={'flex flex-col space-y-2'}>
        <p className={'text-sm'}>
          <Trans i18nKey={'chatbot:designTabSubheading'} />
        </p>
      </div>

      <DesignChatbotContainer
        settings={settings}
        siteName={chatbot.site_name}
        chatbotId={params.chatbot}
      />
    </PageBody>
  );
}

export default withI18n(ChatbotDesignPage);
