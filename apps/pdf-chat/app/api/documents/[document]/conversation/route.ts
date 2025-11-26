import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

import { toUIMessageStream } from '@ai-sdk/langchain';
import { createUIMessageStreamResponse } from 'ai';
import { z } from 'zod';

import { getLogger } from '@kit/shared/logger';
import { requireUser } from '@kit/supabase/require-user';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { runConversationChain } from '~/lib/ai/run-conversation-chain';
import { Database } from '~/lib/database.types';

interface Params {
  document: string;
}

export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<Params>;
  },
) {
  const logger = await getLogger();
  const body = getBodySchema().parse(await request.json());
  const { messages, conversationId } = body;

  const client = getSupabaseServerClient<Database>();
  const auth = await requireUser(client);
  const documentId = (await params).document;

  if (!auth.data) {
    return redirect(auth.redirectTo);
  }

  // Process messages to handle both v4 and v5 formats
  const processedMessages = messages.map((message) => ({
    ...message,
    content: message.content || message.parts?.[0]?.text || '',
    role: message.role,
  }));

  // Check if conversation ID is provided
  if (!conversationId) {
    logger.error('No conversation ID provided');
    return new Response('Conversation ID is required', {
      status: 400,
    });
  }

  // Verify conversation ownership and get conversation details
  const { data: conversation, error: convError } = await client
    .from('conversations')
    .select('id, account_id')
    .eq('reference_id', conversationId)
    .eq('account_id', auth.data.id)
    .single();

  if (convError || !conversation) {
    logger.error(
      { error: convError, conversationId },
      'Conversation not found or access denied',
    );
    return new Response('Conversation not found', {
      status: 404,
    });
  }

  // Check token availability
  const { data: remainingTokens } = await client.rpc('get_remaining_tokens');
  const minimumTokensRequired = 100;

  if (!remainingTokens || remainingTokens < minimumTokensRequired) {
    logger.warn(
      { remainingTokens, accountId: auth.data.id },
      'Insufficient tokens',
    );
    return new Response('Insufficient credits', {
      status: 402,
    });
  }

  const adminClient = getSupabaseServerAdminClient<Database>();

  const stream = await runConversationChain({
    client,
    adminClient: adminClient,
    conversationId: conversation.id,
    accountId: conversation.account_id,
    documentId,
    chatHistory: processedMessages,
  });

  // if the AI can generate a response, we return a streaming response
  logger.info(
    {
      conversationId,
    },
    `Stream generated. Sending response...`,
  );

  return createUIMessageStreamResponse({
    stream: toUIMessageStream(stream),
  });
}

function getBodySchema() {
  return z.object({
    conversationId: z.string(),
    messages: z.array(
      z.object({
        id: z.string().optional(),
        role: z.enum(['user', 'assistant'] as const),
        parts: z
          .array(
            z.object({
              type: z.literal('text'),
              text: z.string(),
            }),
          )
          .optional(),
        // Keep backward compatibility with old format
        content: z.string().optional(),
      }),
    ),
  });
}
