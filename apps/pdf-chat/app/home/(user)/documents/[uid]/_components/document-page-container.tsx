'use client';

import { useCallback, useEffect, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Badge } from '@kit/ui/badge';
import { Heading } from '@kit/ui/heading';
import { If } from '@kit/ui/if';

import { Database } from '~/lib/database.types';

import { useFetchAvailableTokens } from '../../_lib/hooks/use-fetch-remaining-tokens';
import { ChatContainer } from './chat-container';
import { ConversationsSidebar } from './conversation-sidebar';
import { DocumentActionsDropdown } from './document-actions-dropdown';

interface Conversation {
  id: string;
  name: string;
}

export function DocumentPageContainer(
  props: React.PropsWithChildren<{
    doc: {
      id: string;
      name: string;
    };

    conversation: Conversation | undefined;
    conversations: Conversation[];
  }>,
) {
  const queryClient = useQueryClient();
  const supabase = useSupabase<Database>();
  const [activeConversation, setActiveConversation] = useState(
    props.conversation,
  );

  // Use React Query for conversations list
  const { data: conversations = props.conversations } = useQuery({
    queryKey: ['conversations', props.doc.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select('reference_id, name')
        .eq('document_id', props.doc.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((conv) => ({
        id: conv.reference_id,
        name: conv.name,
      }));
    },
    initialData: props.conversations,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Handle conversation creation with optimistic update
  const onCreateConversation = useCallback(
    (newConversation: Conversation) => {
      // Optimistic update with React Query
      queryClient.setQueryData(
        ['conversations', props.doc.id],
        (old: Conversation[] = []) => [newConversation, ...old],
      );
      setActiveConversation(newConversation);
    },
    [props.doc.id, queryClient],
  );

  const credits = useFetchAvailableTokens();

  // Update active conversation when list changes
  useEffect(() => {
    if (activeConversation && conversations) {
      const exists = conversations.some(
        (conv) => conv.id === activeConversation.id,
      );
      if (!exists) {
        setActiveConversation(undefined);
      }
    }
  }, [conversations, activeConversation]);

  return (
    <>
      <div className={'flex h-full w-2/12 max-w-72 flex-1 flex-col p-4'}>
        <ConversationsSidebar
          conversations={conversations}
          conversation={activeConversation}
          setConversation={setActiveConversation}
        />
      </div>

      <div className={'flex w-9/12 flex-1 flex-col divide-y'}>
        <div className="flex items-center justify-between p-4">
          <div className={'items-enter flex w-full justify-between space-x-2'}>
            <Heading className={'text-sm'} level={6}>
              {props.doc.name}
            </Heading>

            <If condition={credits.isSuccess}>
              <Badge variant={'outline'}>
                {credits.data} credits remaining
              </Badge>
            </If>
          </div>

          <If condition={activeConversation}>
            {({ id }) => <DocumentActionsDropdown conversationId={id} />}
          </If>
        </div>

        <ChatContainer
          key={activeConversation?.id} // Force remount on conversation change
          documentId={props.doc.id}
          conversation={activeConversation}
          onCreateConversation={onCreateConversation}
        />
      </div>
    </>
  );
}
