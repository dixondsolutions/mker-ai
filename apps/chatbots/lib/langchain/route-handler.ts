import { NextRequest } from 'next/server';

import { SupabaseClient } from '@supabase/supabase-js';

import { toUIMessageStream } from '@ai-sdk/langchain';
import { UIMessage, createUIMessageStreamResponse } from 'ai';
import { isbot } from 'isbot';
import { z } from 'zod';

import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';

import appConfig from '~/config/app.config';
import { Database } from '~/lib/database.types';
import {
  generateReplyFromChain,
  insertConversationMessages,
} from '~/lib/langchain/langchain';
import { getVectorRetriever } from '~/lib/langchain/vector-store';

const CONVERSATION_ID_STORAGE_KEY = getConversationIdHeaderName();
const isProduction = appConfig.production;

// Set this to true to use a fake data streamer for testing purposes.
let USE_FAKE_DATA_STREAMER = false;

// make sure to set this to false in production
if (isProduction) {
  USE_FAKE_DATA_STREAMER = false;
}

const USE_NORMAL_SEARCH = false;

// simple short-lived cache for site names
const siteNameCache = new Map<string, string>();

/**
 * Handles a chat bot request. This function should be exported from a
 * Next.js App Router route handler as a POST request.
 *
 * @example
 * file: app/api/chat/route.ts
 *
 * export const POST = handleChatBotRequest;
 *
 * */
export function handleChatBotRequest({
  responseHeaders,
}: {
  responseHeaders: Record<string, string>;
}) {
  return async function (req: NextRequest) {
    const logger = await getLogger();
    const userAgent = req.headers.get('user-agent');

    if (isbot(userAgent)) {
      return new Response(`No chatbot for you!`, {
        status: 403,
      });
    }

    // we parse the request body to get the messages sent by the user
    const zodSchema = z.object({
      messages: z.custom<UIMessage[]>(),
    });

    const chatbotId = z.string().uuid().parse(req.headers.get('x-chatbot-id'));
    const { messages } = zodSchema.parse(await req.json());

    const conversationReferenceId =
      req.headers.get(CONVERSATION_ID_STORAGE_KEY) ?? undefined;

    /**
     * If the conversation reference id is missing, we don't save the conversation.
     * This should never happen in production (unless the cookie gets cleared during a session)
     * but it's possible in development when using the playground.
     */
    if (!conversationReferenceId) {
      logger.warn(
        {
          chatbotId,
        },
        `Missing conversation reference id. This conversation will not be saved.`,
      );
    }

    logger.info(
      {
        conversationReferenceId,
        chatbotId,
      },
      `Received chatbot message. Responding...`,
    );

    // if the user is using the fake data streamer, we return a fake response
    if (USE_FAKE_DATA_STREAMER) {
      return fakeDataStreamer();
    }

    const adminClient = getSupabaseServerAdminClient<Database>();

    const canGenerateAIResponse = await adminClient.rpc(
      'can_respond_to_message',
      {
        target_chatbot_id: chatbotId,
      },
    );

    if (canGenerateAIResponse.error) {
      logger.error(
        {
          error: canGenerateAIResponse.error,
          chatbotId,
        },
        `Error checking if AI can respond to message.`,
      );
    }

    // if it's the first message we insert a new conversation
    if (conversationReferenceId) {
      if (messages.length <= 2) {
        logger.info(
          {
            conversationReferenceId,
            chatbotId,
          },
          `Detected new conversation. Inserting conversation...`,
        );

        const { data, error } = await insertConversation(adminClient, {
          chatbotId,
          conversationReferenceId,
        });

        if (error) {
          logger.error(
            {
              conversationReferenceId,
              chatbotId,
            },
            `Error inserting conversation.`,
          );
        } else {
          logger.info(
            {
              conversationReferenceId,
              conversationId: data.id,
              chatbotId,
            },
            `Successfully inserted conversation.`,
          );
        }
      }
    }

    // this is the user's latest message - eg. the message we want to respond to
    const latestMessage = messages[messages.length - 1];

    const returnFallbackReply = () => {
      logger.info(
        {
          conversationReferenceId,
          chatbotId,
        },
        `Cannot generate AI Response. Falling back to search...`,
      );

      const query =
        latestMessage?.parts[0]!.type === 'text'
          ? latestMessage.parts[0]!.text
          : '';

      return fallbackSearchDocuments({
        client: adminClient,
        query,
        chatbotId,
        conversationReferenceId,
        responseHeaders,
      });
    };

    // if the Organization can't generate an AI response, we use a normal search
    if (!canGenerateAIResponse.data || USE_NORMAL_SEARCH) {
      return returnFallbackReply();
    }

    try {
      const siteName = await getChatbotSiteName(adminClient, chatbotId);

      const stream = await generateReplyFromChain({
        client: adminClient,
        messages,
        chatbotId,
        siteName,
        conversationReferenceId,
      });

      // if the AI can generate a response, we return a streaming response
      logger.info(
        {
          conversationReferenceId,
          chatbotId,
        },
        `Stream generated. Sending response...`,
      );

      return createUIMessageStreamResponse({
        stream: toUIMessageStream(stream),
        headers: responseHeaders,
      });
    } catch (error) {
      // if there's an error generating the response
      // we fallback to a normal search

      logger.warn(
        {
          conversationReferenceId,
          chatbotId,
          error,
        },
        `Error generating response.`,
      );

      return returnFallbackReply();
    }
  };
}

/**
 * Fallback search documents when the AI can't generate a response or
 * when the user has exhausted the number of messages in their plan
 */
async function fallbackSearchDocuments(params: {
  client: SupabaseClient<Database>;
  query: string;
  chatbotId: string;
  conversationReferenceId?: string;
  responseHeaders?: Record<string, string>;
}) {
  const { client, query, chatbotId, conversationReferenceId } = params;

  // in this case, use a normal search function
  const { text, stream } = await searchDocuments({
    client,
    query,
    filter: {
      chatbot_id: chatbotId,
    },
  });

  if (conversationReferenceId) {
    await insertConversationMessages({
      client,
      chatbotId,
      conversationReferenceId,
      text,
      previousMessage: query,
    });
  }

  return createUIMessageStreamResponse({
    stream: toUIMessageStream(stream),
    headers: params.responseHeaders,
  });
}

async function searchDocuments(params: {
  client: SupabaseClient<Database>;
  query: string;
  filter: {
    chatbot_id: string;
  };
}) {
  const { client, filter, query } = params;
  const store = await getVectorRetriever(client, filter.chatbot_id);
  const documents = await store.invoke(query);

  const content = documents
    .map((document) => {
      return `<a target='_blank' class='document-link block text-sm' href="${document.metadata.url}">${document.metadata.title}</a>`;
    })
    .join('\n\n');

  const contentResponse = `I found these documents that might help you:\n\n${content}`;

  const text = documents.length
    ? contentResponse
    : 'Sorry, I was not able to find an answer for you.';

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(text);
      controller.close();
    },
  });

  return {
    stream,
    text,
  };
}

/**
 * @returns {Response} - A fake data streamer response.
 */
function fakeDataStreamer() {
  let timerId: number | undefined;
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      // @ts-expect-error: ignore this
      timerId = setInterval(() => {
        if (closed) return;

        controller.enqueue(encoder.encode('TEXT'));
      }, 200);

      setTimeout(() => {
        controller.close();
        closed = true;
      }, 5_000);
    },
    cancel() {
      if (typeof timerId === 'number') {
        clearInterval(timerId);
      }
    },
  });

  return new Response(stream);
}

/**
 * Gets the site name for a chatbot
 * Stores the site name in a cache for faster access when hitting the same instance.
 * @param client
 * @param chatbotId
 */
async function getChatbotSiteName(
  client: SupabaseClient<Database>,
  chatbotId: string,
) {
  if (siteNameCache.get(chatbotId)) {
    return siteNameCache.get(chatbotId) as string;
  }

  const response = await client
    .from('chatbots')
    .select(`site_name`)
    .eq('id', chatbotId)
    .single();

  if (response.error) {
    throw response.error;
  }

  const siteName = response.data.site_name;

  siteNameCache.set(chatbotId, siteName);

  return siteName;
}

function insertConversation(
  client: SupabaseClient<Database>,
  params: {
    chatbotId: string;
    conversationReferenceId: string;
  },
) {
  return client
    .from('conversations')
    .insert({
      chatbot_id: params.chatbotId,
      reference_id: params.conversationReferenceId,
    })
    .select('id')
    .single();
}

function getConversationIdHeaderName() {
  return process.env.CONVERSATION_ID_STORAGE_KEY ?? `x-conversation-id`;
}
