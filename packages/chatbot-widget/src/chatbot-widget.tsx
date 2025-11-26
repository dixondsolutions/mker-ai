import {
  Suspense,
  createContext,
  useCallback,
  useContext,
  useState,
} from 'react';

import { createRoot } from 'react-dom/client';
import { v4 as uuid } from 'uuid';

import { ChatBot } from './chatbot';
import { ChatbotSettings } from './chatbot';
import styles from './chatbot-widget.css';
import { IFrame } from './chatbot/iframe';

const SDK_NAME = process.env.CHATBOT_SDK_NAME;
const SETTINGS_ENDPOINT = process.env.WIDGET_SETTINGS_ENDPOINT;

const ChatbotWidgetContext = createContext<{
  conversationId: string;
  setConversationId: (conversationId: string) => void;
}>({
  conversationId: '',

  setConversationId: () => {},
});

// initialize the widget
initializeWidget();

function initializeWidget() {
  console.log('initializing Chatbot widget');
  if (document.readyState !== 'loading') {
    void onReady();
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      void onReady();
    });
  }
}

/**
 * Initializes the Chatbot by fetching settings, creating necessary elements,
 * injecting styles, and hydrating the root component.
 **/
async function onReady() {
  try {
    const { settings, siteName, conversationId } = await fetchChatbotSettings();
    const id = getChatbotId();
    const element = document.createElement('div');

    const component = (
      <IFrame>
        <ChatbotWidgetContextProvider conversationId={conversationId}>
          <ChatbotRenderer
            chatbotId={id}
            siteName={siteName}
            settings={settings}
          />
        </ChatbotWidgetContextProvider>
      </IFrame>
    );

    const root = createRoot(element);

    root.render(component);

    document.body.appendChild(element);
  } catch (error) {
    console.warn(`Could not initialize Chatbot`);
    console.warn(error);
  }
}

function ChatbotRenderer(props: {
  chatbotId: string;
  siteName: string;
  settings: ChatbotSettings;
}) {
  const { conversationId } = useContext(ChatbotWidgetContext);
  const storageKey = getStorageKey(props.chatbotId, conversationId);
  const clearConversation = useClearConversation();

  return (
    <Suspense fallback={null}>
      <style suppressHydrationWarning>{styles}</style>

      <ChatBot
        {...props}
        conversationId={conversationId}
        storageKey={storageKey}
        onClear={clearConversation}
      />
    </Suspense>
  );
}

async function fetchChatbotSettings() {
  const chatbotId = getChatbotId();

  if (!SETTINGS_ENDPOINT) {
    throw new Error('Missing WIDGET_SETTINGS_ENDPOINT environment variable');
  }

  if (!chatbotId) {
    throw new Error('Missing data-chatbot-id attribute');
  }

  const conversationIdStorageKey = getConversationIdStorageKey();
  const conversationId = localStorage.getItem(conversationIdStorageKey);

  const url = `${SETTINGS_ENDPOINT}?id=${chatbotId}`;

  const response = await fetch(url, {
    headers: {
      ['x-conversation-id']: conversationId ?? '',
    },
  });

  const payload = (await response.json()) as unknown as {
    settings: ChatbotSettings;
    siteName: string;
    conversationId: string;
  };

  // if this is the first time we're loading the chatbot, store the conversation id
  if (!conversationId) {
    localStorage.setItem(conversationIdStorageKey, payload.conversationId);
  }

  return payload;
}

function getChatbotId() {
  const script = getCurrentScript();

  if (!script) {
    throw new Error('Script not found');
  }

  const chatbotId = script.getAttribute('data-chatbot');

  if (!chatbotId) {
    throw new Error('Missing data-chatbot-id attribute');
  }

  return chatbotId;
}

function getCurrentScript() {
  const currentScript = document.currentScript;

  if (!SDK_NAME) {
    throw new Error('Missing CHATBOT_SDK_NAME environment variable');
  }

  if (currentScript?.getAttribute('src')?.includes(SDK_NAME)) {
    return currentScript as HTMLScriptElement;
  }

  return Array.from(document.scripts).find((item) => {
    return item.src.includes(SDK_NAME);
  });
}

function ChatbotWidgetContextProvider(
  props: React.PropsWithChildren<{
    conversationId: string;
  }>,
) {
  const [conversationId, setConversationId] = useState(props.conversationId);

  return (
    <ChatbotWidgetContext.Provider
      value={{
        conversationId,
        setConversationId,
      }}
    >
      {props.children}
    </ChatbotWidgetContext.Provider>
  );
}

function getStorageKey(id: string, conversationId: string) {
  return `chatbot-${id}-${conversationId}`;
}

function useClearConversation() {
  const { setConversationId } = useContext(ChatbotWidgetContext);

  return useCallback(() => {
    const key = getConversationIdStorageKey();
    localStorage.removeItem(key);

    const conversationId = generateNewConversationId();
    localStorage.setItem(key, conversationId);

    setConversationId(conversationId);
  }, [setConversationId]);
}

function generateNewConversationId() {
  return uuid();
}

function getConversationIdStorageKey() {
  const chatbotId = getChatbotId();

  return `chatbot-${chatbotId}-conversation-id`;
}
