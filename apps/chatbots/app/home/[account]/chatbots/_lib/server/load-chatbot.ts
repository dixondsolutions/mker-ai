import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';

import { createChatbotsService } from '~/home/[account]/chatbots/_lib/server/chatbots-service';
import { Database } from '~/lib/database.types';

/**
 * @name loadChatbot
 * @description Loads a chatbot from the database
 */
export const loadChatbot = cache((chatbotId: string) => {
  const client = getSupabaseServerClient<Database>();
  const service = createChatbotsService(client);

  return service.getChatbot(chatbotId);
});
