import { use } from 'react';

import { PageBody } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { withI18n } from '~/lib/i18n/with-i18n';

import { CopyToClipboardButton } from './_components/copy-to-clipboard-button';

interface ChatbotPublishPageParams {
  params: Promise<{
    account: string;
    chatbot: string;
  }>;
}

export const metadata = {
  title: 'Publish',
};

const widgetHostingUrl = process.env.NEXT_PUBLIC_WIDGET_HOSTING_URL;

function ChatbotPublishPage(props: ChatbotPublishPageParams) {
  const params = use(props.params);

  const script = `
    <script async data-chatbot='${params.chatbot}' src='${widgetHostingUrl}' />
  `.trim();

  return (
    <PageBody className={'space-y-4'}>
      <div className={'flex flex-col space-y-2'}>
        <p className={'text-sm'}>
          <Trans i18nKey={'chatbot:publishTabSubheading'} />
        </p>
      </div>

      <pre
        className={
          'bg-muted text-muted-foreground rounded-lg border p-4 text-sm'
        }
      >
        <code>{script}</code>
      </pre>

      <div>
        <CopyToClipboardButton text={script} />
      </div>
    </PageBody>
  );
}

export default withI18n(ChatbotPublishPage);
