import { useEffect, useMemo, useState } from 'react';

import { useMutation, useQuery } from '@tanstack/react-query';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { useShallow } from 'zustand/react/shallow';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { Dialog, DialogContent, DialogTitle } from '@kit/ui/dialog';
import { LoadingOverlay } from '@kit/ui/loading-overlay';
import { toast } from '@kit/ui/sonner';
import { cn } from '@kit/ui/utils';

import { Database } from '~/lib/database.types';
import { useKanbanStore } from '~/lib/kanban/kanban-store';
import { assignTaskTags } from '~/lib/kanban/tags/mutations';
import { UpdateTaskPayload, updateTask } from '~/lib/kanban/tasks/mutations';
import { getTaskById } from '~/lib/kanban/tasks/queries';

import { useBoardContextStore } from '../board-context-store';
import { TagsFilterDropdown } from './tag-filters-dropdown';

export function TaskDialog(
  props: React.PropsWithChildren<{
    isOpen: boolean;
    setIsOpen: (value: boolean) => void;
    taskId: string;
  }>,
) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.setIsOpen}>
      <DialogContent>
        <TaskDialogContent taskId={props.taskId} />
      </DialogContent>
    </Dialog>
  );
}

function TaskDialogContent({ taskId }: { taskId: string }) {
  const { isLoading, data: task, error } = useQueryTask(taskId);

  if (isLoading || !task) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen />;
  }

  const tags = task.tags.map((tag) => tag.name);

  return (
    <div className={'flex h-full flex-col space-y-6'}>
      <div className={'flex items-center justify-between'}>
        <DialogTitle className={'w-full text-lg font-medium'}>
          <TaskTitleInput id={task.id} name={task.name} />
        </DialogTitle>
      </div>

      <TaskBodyTextareaContainer taskId={task.id} body={task.body} />

      <div>
        <TaskTagsContainer taskId={task.id} selected={tags} />
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <>
      <DialogTitle>
        <span>Loading...</span>
      </DialogTitle>

      <LoadingOverlay fullPage={false}>Loading Task...</LoadingOverlay>
    </>
  );
}

function TaskTagsContainer(
  props: React.PropsWithChildren<{
    selected: string[];
    taskId: string;
  }>,
) {
  const tags = useBoardContextStore(useShallow((state) => state.tags));

  const updateTaskTags = useKanbanStore(
    useShallow((state) => state.updateTaskTags),
  );

  const [selected, setSelected] = useState(props.selected);
  const updateTagsMutation = useUpdateTags(props.taskId);

  return (
    <TagsFilterDropdown
      selected={selected}
      models={tags ?? []}
      onChange={(assignedTags) => {
        const added = assignedTags
          .filter((item) => {
            return !props.selected.includes(item.name);
          })
          .map((item) => item.id);

        const removed = props.selected
          .filter((item) => {
            return !assignedTags.find((tag) => tag.name === item);
          })
          .map((item) => {
            const tag = tags.find((tag) => tag.name === item);

            if (!tag) {
              return null;
            }

            return tag.id;
          })
          .filter(Boolean) as number[];

        return updateTagsMutation.mutateAsync(
          { added, removed },
          {
            onSuccess: () => {
              setSelected(assignedTags.map((tag) => tag.name));
              updateTaskTags(props.taskId, assignedTags);
            },
          },
        );
      }}
    />
  );
}

function ErrorScreen() {
  return (
    <>
      <DialogTitle>
        <span>Error</span>
      </DialogTitle>

      <span>Sorry, we encountered an error while fetching this task.</span>
    </>
  );
}

function useUpdateTags(taskId: string) {
  const client = useSupabase<Database>();
  const mutationKey = [`task-tags`, taskId];

  type TagId = number;

  return useMutation({
    mutationKey,
    mutationFn: (params: { added: TagId[]; removed: TagId[] }) => {
      return assignTaskTags(client, {
        taskId,
        added: params.added,
        removed: params.removed,
      });
    },
  });
}

function useQueryTask(taskId: string) {
  const client = useSupabase<Database>();
  const queryKey = [`task-detail`, taskId];
  const queryFn = async () => {
    const { data, error } = await getTaskById(client, taskId);

    if (error) {
      throw error;
    }

    return data;
  };

  return useQuery({
    queryKey,
    queryFn,
  });
}

function useUpdateTask(taskId: string) {
  const mutationKey = [`task-detail`, taskId];
  const client = useSupabase<Database>();

  const mutationFn = async (params: UpdateTaskPayload) => {
    const { error } = await updateTask(client, taskId, params);

    if (error) {
      throw error;
    }
  };

  return useMutation({
    mutationKey,
    mutationFn,
  });
}

function TaskTitleInput(
  props: React.PropsWithChildren<{
    name: string;
    id: string;
  }>,
) {
  const updateTaskMutation = useUpdateTask(props.id);
  const store = useKanbanStore();

  return (
    <input
      required
      type="text"
      defaultValue={props.name}
      className={cn(
        'focus:border-border w-full border border-transparent outline-none' +
          'hover:border-muted p-0.5 outline-none' +
          ' bg-background',
        {
          'opacity-50': updateTaskMutation.isPending,
        },
      )}
      onBlur={(e) => {
        const input = e.currentTarget;
        const name = input.value?.trim();

        if (!name) {
          input.value = props.name;
          return;
        }

        if (name === props.name?.trim() || !input.validity.valid) {
          return;
        }

        toast.promise(
          updateTaskMutation.mutateAsync(
            {
              name,
            },
            {
              onSuccess: () => {
                store.updateTask({
                  id: props.id,
                  name,
                });
              },
            },
          ),
          {
            loading: 'Updating task...',
            success: 'Task updated',
            error: 'Failed to update task',
            position: 'bottom-right',
          },
        );
      }}
    />
  );
}

function TaskBodyTextareaContainer(
  props: React.PropsWithChildren<{
    taskId: string;
    body: string | null;
  }>,
) {
  const subject$ = useMemo(() => new Subject<string>(), []);
  const updateTaskMutation = useUpdateTask(props.taskId);

  useEffect(() => {
    const delayTime = 2000;

    const subscription = subject$
      .asObservable()
      .pipe(debounceTime(delayTime), distinctUntilChanged())
      .subscribe({
        next: (body) => {
          return updateTaskMutation.mutate({
            body,
          });
        },
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [subject$, updateTaskMutation]);

  return (
    <textarea
      onInput={(e) => subject$.next(e.currentTarget.value)}
      defaultValue={props.body ?? ''}
      className={cn(
        'bg-background h-auto min-h-[10rem] w-full p-1 outline-none' +
          'hover:border-muted resize-none outline-none' +
          ' focus:border-border border border-transparent',
        {
          ['opacity-50']: updateTaskMutation.isPending,
        },
      )}
      placeholder={'Add Description...'}
    />
  );
}
