import type { SupabaseClient } from '@supabase/supabase-js';

import { SupabaseHybridSearch } from '@langchain/community/retrievers/supabase';
import { SupabaseVectorStore } from '@langchain/community/vectorstores/supabase';
import { OpenAIEmbeddings } from '@langchain/openai';

import { Database } from '~/lib/database.types';

const SIMILARITY_K = process.env.SIMILARITY_K
  ? Number(process.env.SIMILARITY_K)
  : 2;

const KEYWORD_K = process.env.KEYWORD_K ? Number(process.env.KEYWORD_K) : 2;

/**
 * Get a vector store for storing and retrieving documents.
 * @param client
 */
export async function getVectorStore(client: SupabaseClient<Database>) {
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  });

  return SupabaseVectorStore.fromExistingIndex(embeddings, {
    client,
    tableName: 'documents_embeddings',
    queryName: 'match_documents',
  });
}

/**
 * Get a vector retriever for the given document ID.
 * @param client
 * @param chatbotId
 * @param params
 */
export async function getVectorRetriever(
  client: SupabaseClient<Database>,
  chatbotId: string,
  params: {
    similarityK?: number;
    keywordK?: number;
  } = {},
) {
  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  });

  const similarityK = params.similarityK ?? SIMILARITY_K;
  const keywordK = params.keywordK ?? KEYWORD_K;

  const retriever = new SupabaseHybridSearch(embeddings, {
    client,
    similarityK,
    keywordK,
    tableName: 'documents',
    similarityQueryName: 'match_documents',
    keywordQueryName: 'kw_match_documents',
  });

  retriever.metadata = { chatbot_id: chatbotId };

  return retriever;
}
