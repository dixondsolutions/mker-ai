'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import { useChat } from '@ai-sdk/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DefaultChatTransport, UIMessage } from 'ai';

import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';
import { toast } from '@kit/ui/sonner';
import { cn } from '@kit/ui/utils';

import { useRevalidateAvailableTokens } from '../../_lib/hooks/use-fetch-remaining-tokens';
import {
  checkTokenAvailabilityAction,
  createConversationAction,
  getConversationMessagesAction,
} from '../../_lib/server/server-actions';
import { ChatTextField } from './chat-text-field';
import { LoadingBubble } from './loading-bubble';
import { MessageContainer } from './message-container';

export function ChatContainer({
  conversation,
  onCreateConversation,
  documentId,
}: {
  conversation:
    | {
        id: string;
        name: string;
      }
    | undefined;

  onCreateConversation?: (conversation: { name: string; id: string }) => void;
  documentId: string;
}) {
  const [currentConversation, setCurrentConversation] = useState(conversation);
  const [isPending, startTransition] = useTransition();

  // fetch the list of messages for this conversation
  const { data: messages, isLoading: messagesLoading } =
    useConversationMessages(currentConversation);

  // Update when conversation prop changes
  useEffect(() => {
    setCurrentConversation(conversation);
  }, [conversation]);

  return (
    <>
      <ChatBodyContainer
        className={cn('transition-opacity', {
          ['pointer-events-none opacity-40']: messagesLoading || isPending,
        })}
        conversation={currentConversation}
        documentId={documentId}
        messages={(messages as UIMessage[]) ?? []}
        onCreateConversation={onCreateConversation}
        isPending={isPending}
        startTransition={startTransition}
      />
    </>
  );
}

function ChatBodyContainer(props: {
  className?: string;
  conversation:
    | {
        id: string;
        name: string;
      }
    | undefined;
  documentId: string;
  messages: UIMessage[] | null;
  onCreateConversation?: (conversation: { name: string; id: string }) => void;
  isPending: boolean;
  startTransition: (callback: () => void | Promise<void>) => void;
}) {
  const scrollingDiv = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = useScrollToBottom(scrollingDiv.current);

  const queryClient = useQueryClient();
  const revalidateAvailableTokens = useRevalidateAvailableTokens();

  const [input, setInput] = useState('');

  const { messages, sendMessage, setMessages, status } = useChat({
    transport: new DefaultChatTransport({
      api: getApiEndpoint(props.documentId),
      body: {
        conversationId: props.conversation?.id,
      },
    }),
    messages: props.messages ?? undefined,
    onError: (error) => {
      console.error('Chat error:', error);
      if (error.message?.includes('404')) {
        toast.error('Conversation not found. Please create a new one.');
      } else if (error.message?.includes('402')) {
        toast.error('Insufficient credits. Please upgrade your plan.');
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    },
    onFinish: async (message) => {
      // scroll to the bottom when the message is sent
      scrollToBottom({ smooth: true });

      // Update the cache with the new messages
      if (props.conversation?.id) {
        const cacheKey = getConversationIdStorageKey(props.conversation.id);

        const userMessage: UIMessage = {
          // eslint-disable-next-line react-hooks/purity
          id: Date.now().toString(),
          parts: [{ type: 'text', text: input }],
          role: 'user',
        };

        const nextCache = [...(messages ?? []), userMessage, message];
        queryClient.setQueryData([cacheKey], nextCache);
      }

      // revalidate the number of available tokens
      await revalidateAvailableTokens();
    },
  });

  const isLoading =
    status === 'streaming' || status === 'submitted' || props.isPending;

  // Handle sending message with conversation creation if needed
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    // Check token availability before any message sending
    try {
      const tokenCheck = await checkTokenAvailabilityAction({});

      if (!tokenCheck.canSend) {
        toast.error(tokenCheck.message);

        return;
      }
    } catch {
      toast.error('Failed to check credit availability. Please try again.');
      return;
    }

    // If no conversation exists, create one first
    if (!props.conversation) {
      props.startTransition(async () => {
        try {
          // Create the conversation
          const newConversation = await createConversationAction({
            documentId: props.documentId,
            initialMessage: content,
          });

          // Notify parent component
          if (props.onCreateConversation) {
            props.onCreateConversation({
              id: newConversation.reference_id,
              name: newConversation.name,
            });
          }

          // Small delay to ensure state update
          setTimeout(() => {
            sendMessage({
              role: 'user',
              parts: [{ type: 'text', text: content }],
            });
          }, 100);
        } catch (error) {
          console.error('Failed to create conversation:', error);
          toast.error('Failed to create conversation. Please try again.');
        }
      });
    } else {
      // Send to existing conversation
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: content }],
      });
    }
  };

  useEffect(() => {
    // when the messages change, we need to update the state
    if (props.messages) {
      setMessages(props.messages);
      scrollToBottom({ smooth: true });
    }
  }, [props.messages, scrollToBottom, setMessages]);

  useEffect(() => {
    // scroll when loading state changes
    scrollToBottom({ smooth: true });
  }, [isLoading, scrollToBottom]);

  // Update messages when conversation changes
  useEffect(() => {
    if (!props.conversation) {
      setMessages([]);
    }
  }, [props.conversation, setMessages]);

  return (
    <div
      className={cn(
        'm-auto flex h-full w-full flex-1 flex-col space-y-4 pt-4',
        props.className,
      )}
    >
      <div
        className={'order-1 flex-[1_1_0] overflow-y-auto px-4'}
        ref={(ref) => {
          scrollingDiv.current = ref;
        }}
      >
        <div className={'mx-auto h-full w-full'}>
          <ChatMessagesContainer messages={messages} loading={isLoading} />
        </div>
      </div>

      <div className={'order-2 justify-end'}>
        <ChatTextField
          loading={isLoading}
          input={input}
          onInputChange={setInput}
          onSubmit={(content) => {
            setInput('');
            handleSendMessage(content);
          }}
        />
      </div>
    </div>
  );
}

function ChatMessagesContainer({
  messages,
  loading,
}: {
  messages: UIMessage[];
  loading: boolean;
}) {
  if (!messages.length) {
    if (loading) {
      return <LoadingBubble />;
    }

    return <NoMessageEmptySpace />;
  }

  return (
    <div className={'m-auto flex flex-col space-y-2'}>
      {messages.map((message) => {
        return <ChatMessageItem key={message.id} message={message} />;
      })}

      <If condition={loading}>
        <LoadingBubble />
      </If>
    </div>
  );
}

function ChatMessageItem({
  message,
}: React.PropsWithChildren<{ message: UIMessage }>) {
  return (
    <div className={cn(`flex h-fit w-full`)}>
      <div
        className={'m-auto flex w-full break-words whitespace-pre-wrap'}
        style={{
          wordBreak: 'break-word',
        }}
      >
        <MessageContainer message={message} />
      </div>
    </div>
  );
}

function NoMessageEmptySpace() {
  return (
    <div
      className={
        'm-auto flex h-full flex-1 flex-col items-center justify-center space-y-2.5'
      }
    >
      <div>
        <Heading level={3}>Hello, how can I help you?</Heading>
      </div>

      <span className={'text-gray-500 dark:text-gray-400'}>
        Ask me anything about this document - I&apos;ll do my best to help you.
      </span>
    </div>
  );
}

function useConversationMessages(
  conversation:
    | undefined
    | {
        id: string;
        name: string;
      },
) {
  const queryFn = async () => {
    if (!conversation) {
      return null;
    }

    try {
      return await getConversationMessagesAction({
        conversationId: conversation.id,
      });
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      // Return empty array on error to avoid breaking the UI
      return [];
    }
  };

  const queryKey = conversation?.id
    ? [getConversationIdStorageKey(conversation?.id)]
    : [];

  return useQuery({ queryFn, queryKey, refetchOnMount: false });
}

function getConversationIdStorageKey(conversationId: string | undefined) {
  return `conversation-${conversationId}`;
}

function useScrollToBottom(scrollingDiv: HTMLDivElement | null | undefined) {
  return useCallback(
    ({ smooth } = { smooth: false }) => {
      setTimeout(() => {
        if (scrollingDiv) {
          scrollingDiv?.scrollTo({
            behavior: smooth ? 'smooth' : 'auto',
            top: scrollingDiv.scrollHeight,
          });
        }
      }, 50);
    },
    [scrollingDiv],
  );
}

function getApiEndpoint(documentId: string) {
  return `/api/documents/${documentId}/conversation`;
}
