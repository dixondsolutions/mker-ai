import { UIMessage } from 'ai';

import { ChatBotMessageRole } from './message-role.enum';

const LOCAL_STORAGE_KEY = createLocalStorageKey();

export const chatBotMessagesStore = {
  loadMessages(key = LOCAL_STORAGE_KEY, siteName: string): UIMessage[] {
    const emptyMessages: UIMessage[] = [
      {
        id: 'initial-message',
        parts: [
          {
            type: 'text',
            text: `Hi, I'm the ${siteName} chatbot! How can I help you?`,
          },
        ],
        role: ChatBotMessageRole.Assistant,
      },
    ];

    if (typeof document === 'undefined') {
      return emptyMessages;
    }

    const messages = localStorage.getItem(key);

    try {
      if (messages) {
        const parsed = (JSON.parse(messages) ?? []) as UIMessage[];

        if (!parsed.length) {
          return emptyMessages;
        }

        return parsed;
      }
    } catch {
      return emptyMessages;
    }

    return emptyMessages;
  },
  saveMessages(messages: UIMessage[], key = LOCAL_STORAGE_KEY) {
    localStorage.setItem(key, JSON.stringify(messages));
  },
  removeMessages(storageKey: string | undefined) {
    localStorage.removeItem(storageKey ?? LOCAL_STORAGE_KEY);
  },
};

function createLocalStorageKey() {
  if (typeof window === 'undefined') {
    return 'chatbot-messages';
  }

  const domain = window.location.hostname.split('.').join('-');

  return `${domain}-chatbot-messages`;
}
