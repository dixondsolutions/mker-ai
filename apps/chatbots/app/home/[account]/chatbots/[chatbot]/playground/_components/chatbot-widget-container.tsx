'use client';

import dynamic from 'next/dynamic';

const ChatBot = dynamic(
  () =>
    import('@kit/chatbot-widget/chatbot').then((m) => {
      return {
        default: m.ChatBot,
      };
    }),
  {
    ssr: false,
  },
);

export const ChatBotWidgetContainer = ChatBot;
