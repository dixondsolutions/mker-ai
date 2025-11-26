import Link from 'next/link';

import { ServerDataLoader } from '@makerkit/data-loader-supabase-nextjs';
import { PlusCircleIcon } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { Button } from '@kit/ui/button';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { PostsTable } from '~/home/(user)/posts/_components/posts-table';
import { Database } from '~/lib/database.types';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

interface PostPageProps {
  searchParams: Promise<{
    page?: string;
  }>;
}

async function PostsPage(props: PostPageProps) {
  const client = getSupabaseServerClient<Database>();
  const searchParams = await props.searchParams;
  const page = Number(searchParams.page ?? '1');
  const user = await requireUserInServerComponent();

  return (
    <>
      <PageHeader description={<Trans i18nKey="posts:postsTabDescription" />}>
        <Button size={'sm'} asChild>
          <Link href={'/home/posts/new'}>
            <PlusCircleIcon className="mr-2 h-3 w-3" />

            <span>
              <Trans i18nKey="posts:createPostButtonLabel" />
            </span>
          </Link>
        </Button>
      </PageHeader>

      <PageBody>
        <ServerDataLoader
          client={client}
          table={'posts'}
          select={['id', 'title']}
          page={page}
          where={{
            account_id: {
              eq: user.id,
            },
          }}
        >
          {({ data, pageSize, pageCount }) => {
            return (
              <PostsTable
                data={data}
                page={page}
                pageSize={pageSize}
                pageCount={pageCount}
              />
            );
          }}
        </ServerDataLoader>
      </PageBody>
    </>
  );
}

export default withI18n(PostsPage);
