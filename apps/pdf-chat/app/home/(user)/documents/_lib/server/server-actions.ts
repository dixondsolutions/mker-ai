'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { isWithinTokenLimit } from 'gpt-tokenizer';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import { enhanceAction } from '@kit/next/actions';
import { getLogger } from '@kit/shared/logger';
import { getSupabaseServerAdminClient } from '@kit/supabase/server-admin-client';
import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createConversationTitle } from '~/lib/ai/create-conversation-title';
import { extractSummary } from '~/lib/ai/extract-summary';
import { parsePdf } from '~/lib/ai/parse-pdf';
import { getVectorStore } from '~/lib/ai/vector-store';
import { Database } from '~/lib/database.types';

const AddDocumentSchema = z.object({
  path: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
});

const DOCUMENT_CHUNK_SIZE = process.env.DOCUMENT_CHUNK_SIZE
  ? Number(process.env.DOCUMENT_CHUNK_SIZE)
  : 1500;

const DOCUMENT_CHUNK_OVERLAP = process.env.DOCUMENT_CHUNK_OVERLAP
  ? Number(process.env.DOCUMENT_CHUNK_OVERLAP)
  : 200;

export const addDocumentAction = enhanceAction(
  async (params, user) => {
    const logger = await getLogger();
    const client = getSupabaseServerClient<Database>();
    const { path, title } = params;

    logger.info(params, `Uploading document...`);

    const storageDocument = await client.storage
      .from('documents')
      .download(path);

    if (storageDocument.error) {
      throw storageDocument.error;
    }

    const documentData = await storageDocument.data.arrayBuffer();
    const { text: pages } = await parsePdf(documentData);
    const accountId = user.id;

    const { data } = await client
      .from('credits_usage')
      .select('tokens_quota')
      .eq('account_id', accountId)
      .single();

    const remainingTokens = data?.tokens_quota ?? 0;

    if (!remainingTokens) {
      logger.info(
        {
          remainingTokens,
          accountId,
        },
        `No tokens left to index this document`,
      );

      throw new Error(`You can't index more documents`);
    }

    const text = pages.join('\n');
    const tokensCount = isWithinTokenLimit(text, remainingTokens);

    if (tokensCount === false) {
      logger.info(
        {
          remainingTokens,
          tokensCount,
          accountId,
        },
        `Not enough tokens to index this document`,
      );

      throw new Error(`You don't have enough tokens to index this document`);
    }

    if (tokensCount === 0) {
      logger.info(
        {
          remainingTokens,
          tokensCount,
          accountId,
        },
        `Document is empty. Likely parsing error.`,
      );

      throw new Error(`Document is empty`);
    }

    const adminClient = getSupabaseServerAdminClient<Database>();

    // we create a vector store using the admin client
    // because RLS is enabled on the documents table without policies
    // so we can always check if the user can index documents or not
    const vectorStore = await getVectorStore(adminClient);

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: DOCUMENT_CHUNK_SIZE,
      chunkOverlap: DOCUMENT_CHUNK_OVERLAP,
    });

    const splitDocs = await splitter.splitText(text);
    const summary = await extractSummary(text);

    // TODO: further processing of the summary using AI if it's too large

    logger.info(
      {
        title,
        accountId,
      },
      `Inserting document into database...`,
    );

    const documentResponse = await adminClient
      .from('documents')
      .insert({
        title,
        content: text,
        account_id: accountId,
        summary,
      })
      .select('id')
      .single();

    if (documentResponse.error) {
      throw documentResponse.error;
    }

    logger.info(
      {
        title,
        accountId,
        documentId: documentResponse.data.id,
      },
      `Document inserted into database`,
    );

    logger.info(
      {
        title,
        accountId,
        documentId: documentResponse.data.id,
      },
      `Inserting document embeddings...`,
    );

    const documentEmbeddings = splitDocs.map((item) => {
      return {
        pageContent: item,
        metadata: {
          name: title,
          account_id: accountId,
          document_id: documentResponse.data.id,
        },
      };
    });

    const docs = await vectorStore.addDocuments(documentEmbeddings);

    logger.info(
      {
        id: docs[0],
      },
      `Document uploaded successfully`,
    );

    logger.info(`Updating organization usage...`);

    const { error } = await adminClient
      .from('credits_usage')
      .update({ tokens_quota: remainingTokens - tokensCount })
      .eq('account_id', accountId);

    if (error) {
      logger.error(
        {
          error,
          accountId,
        },
        `Failed to update account usage`,
      );
    } else {
      logger.info(
        {
          accountId,
        },
        `Account usage updated successfully`,
      );
    }

    try {
      logger.info(
        {
          accountId,
          id: docs[0],
          storagePath: path,
        },
        `Removing document from storage after successful indexing`,
      );

      await client.storage.from('documents').remove([path]);
    } catch (e) {
      logger.error(
        {
          error: e,
          documentId: docs[0],
          storagePath: path,
          accountId,
        },
        `Failed to remove document from storage`,
      );
    }

    logger.info({}, `Redirecting to document page...`);

    return redirect(`/home/documents/${documentResponse.data.id}`);
  },
  {
    schema: AddDocumentSchema,
  },
);

export const deleteDocumentAction = enhanceAction(
  async ({ documentId }) => {
    const client = getSupabaseServerClient<Database>();

    const { error } = await client
      .from('documents')
      .delete()
      .match({ id: documentId });

    if (error) {
      throw error;
    }

    revalidatePath(`/home/documents`, 'page');

    return {
      success: true,
    };
  },
  {
    schema: z.object({
      documentId: z.string(),
    }),
  },
);

export const deleteConversationAction = enhanceAction(
  async (referenceId: string) => {
    const client = getSupabaseServerClient<Database>();

    const { error } = await client.from('conversations').delete().match({
      reference_id: referenceId,
    });

    if (error) {
      throw error;
    }

    revalidatePath(`/home/documents/[uid]`, 'page');

    return {
      success: true,
    };
  },
  {
    schema: z.string(),
  },
);

export const clearConversationAction = enhanceAction(
  async (referenceId: string) => {
    const client = getSupabaseServerClient<Database>();
    const conversation = await getConversationByReferenceId(referenceId);

    const { error } = await client.from('messages').delete().match({
      conversation_id: conversation.id,
    });

    if (error) {
      throw error;
    }

    revalidatePath(`/home/documents/[uid]`, 'page');

    return {
      success: true,
    };
  },
  {
    schema: z.string(),
  },
);

export async function getConversationByReferenceId(
  conversationReferenceId: string,
) {
  const client = getSupabaseServerClient<Database>();

  const { data, error } = await client
    .from('conversations')
    .select(
      `
      name,
      reference_id,
      id
    `,
    )
    .eq('reference_id', conversationReferenceId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Enhanced server actions for robust conversation management
const CreateConversationSchema = z.object({
  documentId: z.string().uuid(),
  initialMessage: z.string().optional(),
});

export const createConversationAction = enhanceAction(
  async function (data, user) {
    const logger = await getLogger();
    const client = getSupabaseServerClient<Database>();

    // Generate a longer, more unique reference_id server-side
    let referenceId: string = '';
    let attempts = 0;
    const maxAttempts = 3;

    // Retry logic for the extremely rare collision case
    while (attempts < maxAttempts) {
      referenceId = nanoid(20); // Longer ID = less collision chance

      const { data: existing } = await client
        .from('conversations')
        .select('id')
        .eq('reference_id', referenceId)
        .maybeSingle();

      if (!existing) break;

      attempts++;
      logger.warn(
        { referenceId, attempts },
        'Conversation reference ID collision detected, retrying...',
      );
    }

    if (attempts === maxAttempts) {
      throw new Error('Failed to generate unique conversation ID');
    }

    // Create conversation with title generation
    const title = data.initialMessage
      ? await createConversationTitle(data.initialMessage)
      : 'New Conversation';

    logger.info(
      {
        documentId: data.documentId,
        accountId: user.id,
        referenceId,
      },
      'Creating new conversation...',
    );

    const { data: conversation, error } = await client
      .from('conversations')
      .insert({
        reference_id: referenceId,
        name: title,
        document_id: data.documentId,
        account_id: user.id,
      })
      .select('id, reference_id, name')
      .single();

    if (error) {
      logger.error(
        { error, documentId: data.documentId },
        'Failed to create conversation',
      );
      throw error;
    }

    logger.info(
      {
        conversationId: conversation.id,
        referenceId: conversation.reference_id,
      },
      'Conversation created successfully',
    );

    return conversation;
  },
  {
    auth: true,
    schema: CreateConversationSchema,
  },
);

// Verify conversation ownership before operations
const VerifyConversationSchema = z.object({
  conversationId: z.string(),
});

export const verifyConversationOwnershipAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient<Database>();

    const { data: conversation, error } = await client
      .from('conversations')
      .select('id, account_id, document_id')
      .eq('reference_id', data.conversationId)
      .eq('account_id', user.id)
      .single();

    if (error || !conversation) {
      throw new Error('Conversation not found or access denied');
    }

    return {
      conversationId: conversation.id,
      documentId: conversation.document_id,
      referenceId: data.conversationId,
    };
  },
  {
    auth: true,
    schema: VerifyConversationSchema,
  },
);

// Get conversation messages with proper error handling
export const getConversationMessagesAction = enhanceAction(
  async function (data, user) {
    const client = getSupabaseServerClient<Database>();

    // First verify ownership
    const { data: conversation, error: convError } = await client
      .from('conversations')
      .select('id, account_id, document_id')
      .eq('reference_id', data.conversationId)
      .eq('account_id', user.id)
      .single();

    if (convError || !conversation) {
      throw new Error('Conversation not found or access denied');
    }

    const { data: messages, error } = await client
      .from('messages')
      .select('id, text, sender, created_at')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Convert to AI SDK format
    return (messages || []).map((message) => ({
      id: message.id.toString(),
      role: message.sender,
      parts: [{ type: 'text' as const, text: message.text }],
    }));
  },
  {
    auth: true,
    schema: z.object({
      conversationId: z.string(),
    }),
  },
);

// Check token availability before sending messages
export const checkTokenAvailabilityAction = enhanceAction(
  async function () {
    const client = getSupabaseServerClient<Database>();
    const logger = await getLogger();

    const { data: tokens, error } = await client.rpc('get_remaining_tokens');

    if (error) {
      logger.error({ error }, 'Failed to get remaining tokens');
      throw error;
    }

    const minimumRequired = 100;

    if (!tokens || tokens < minimumRequired) {
      return {
        canSend: false,
        message: 'Insufficient credits. Please upgrade your plan.',
        remaining: tokens || 0,
      };
    }

    return {
      canSend: true,
      remaining: tokens,
    };
  },
  {
    auth: true,
  },
);
