'use client';

import { useEffect, useMemo, useState } from 'react';

import { useMutation } from '@tanstack/react-query';
import {
  EMPTY,
  ReplaySubject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  from,
  mergeMap,
  tap,
} from 'rxjs';

import { useSupabase } from '@kit/supabase/hooks/use-supabase';
import { TextEditor } from '@kit/text-editor';
import { Badge } from '@kit/ui/badge';
import { If } from '@kit/ui/if';
import { Trans } from '@kit/ui/trans';

import { revalidatePostPageOnSaveAction } from '~/home/(user)/posts/[id]/_lib/server/server-actions';
import { Database } from '~/lib/database.types';

export function BlogPostContentEditor(props: { id: string; content: string }) {
  const save$ = useMemo(() => new ReplaySubject<string>(1), []);
  const [pendingText, setPendingText] = useState<string>();

  const [wordCount, setWordCount] = useState<number>(
    props.content.split(' ').length,
  );

  const { mutateAsync } = useUpdatePost(props.id);

  useEffect(() => {
    const subscription = save$
      .pipe(
        distinctUntilChanged(),
        filter(Boolean),
        debounceTime(500),
        tap((content) => {
          setPendingText('posts:editingPost');
          setWordCount((content ?? '').split(' ').filter(Boolean).length);
        }),
        debounceTime(3000),
        mergeMap((content) => {
          setPendingText('posts:savingPost');

          return from(mutateAsync(content)).pipe(
            catchError((error) => {
              console.error('Failed to save post:', error);
              setPendingText('posts:saveError');
              return EMPTY;
            }),
          );
        }),
        tap(() => {
          setPendingText('posts:saveSuccess');
          setTimeout(() => setPendingText(''), 2000);
        }),
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [save$, mutateAsync]);

  return (
    <div className={'flex flex-1 flex-col space-y-4 pb-16'}>
      <div className={'flex items-center space-x-4'}>
        <Badge variant={'outline'}>{wordCount} words</Badge>

        <div className={'flex items-center'}>
          <If condition={pendingText}>
            <span
              className={
                'text-muted-foreground animate-in fade-in text-xs duration-200'
              }
            >
              <Trans i18nKey={pendingText} />
            </span>
          </If>
        </div>
      </div>

      <div className={'relative flex flex-1 flex-col'}>
        <TextEditor
          content={props.content}
          onChange={(content) => {
            save$.next(content ?? '');
          }}
        />
      </div>
    </div>
  );
}

export default BlogPostContentEditor;

function useUpdatePost(id: string) {
  const client = useSupabase<Database>();
  const mutationKey = ['posts', id];

  const mutationFn = async (content: string) => {
    const { error } = await client
      .from('posts')
      .update({
        content,
      })
      .match({
        id,
      });

    if (error) {
      throw error;
    }

    return revalidatePostPageOnSaveAction({});
  };

  return useMutation({
    mutationKey,
    mutationFn,
  });
}
