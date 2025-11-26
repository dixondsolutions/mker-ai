import { cache } from 'react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody, PageHeader } from '@kit/ui/page';

import { Database } from '~/lib/database.types';
import { getBoardById } from '~/lib/kanban/boards/queries';
import { getTags } from '~/lib/kanban/tags/queries';
import { getTasks } from '~/lib/kanban/tasks/queries';

import { KanbanBoardContainer } from './_components/kanban-board-container';

type BoardUUID = string;

interface BoardPageProps {
  params: Promise<{
    account: string;
    board: BoardUUID;
  }>;

  searchParams: Promise<{
    tags?: string;
    task?: string;
  }>;
}

const fetchData = cache(async (board: string, tags: string[]) => {
  return fetchBoardData(board, {
    tags,
  });
});

export const generateMetadata = async (props: BoardPageProps) => {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const tags = searchParams.tags?.split(',').filter(Boolean) ?? [];
  const data = await fetchData(params.board, tags);

  return {
    title: `Kanban Board: ${data.board.name}`,
  };
};

async function BoardPage(props: BoardPageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const tags = searchParams.tags?.split(',').filter(Boolean) ?? [];
  const data = await fetchData(params.board, tags);

  return (
    <div className={'flex flex-1 flex-col overflow-y-hidden'}>
      <PageHeader
        description={
          <AppBreadcrumbs
            values={{
              [data.board.id]: data.board.name,
            }}
          />
        }
      />

      <PageBody>
        <KanbanBoardContainer
          accountId={data.board.accountId}
          filters={{
            tags: data.tags,
          }}
          columns={data.board.columns}
          tasks={data.tasks}
          openTask={searchParams.task}
        />
      </PageBody>
    </div>
  );
}

export default BoardPage;

async function fetchBoardData(
  boardUid: string,
  params: {
    tags: string[];
  },
) {
  const client = getSupabaseServerClient<Database>();

  const board = getBoardById(client, boardUid);
  const tasks = getTasks(client, boardUid, params);
  const tags = getTags(client, boardUid);

  const results = await Promise.all([board, tasks, tags]);

  const [boardResponse, tasksResponse, tagsResponse] = results;

  if (!boardResponse.data || boardResponse.error) {
    throw new Error(boardResponse.error?.message ?? 'Board not found');
  }

  if (tasksResponse.error) {
    throw new Error(tasksResponse.error.message);
  }

  return {
    board: boardResponse.data,
    tasks: tasksResponse.data,
    tags: tagsResponse.data ?? [],
  };
}
