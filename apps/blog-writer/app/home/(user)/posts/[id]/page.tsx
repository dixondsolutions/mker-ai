import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchDataFromSupabase } from '@makerkit/data-loader-supabase-core';
import { ArrowLeftIcon } from 'lucide-react';

import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { Button } from '@kit/ui/button';
import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import BlogPostContentEditor from '~/home/(user)/posts/[id]/components/blog-post-content-editor';
import { Database } from '~/lib/database.types';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

interface PostPageProps {
  params: Promise<{
    organization: string;
    id: string;
  }>;
}

async function PostPage(props: PostPageProps) {
  const params = await props.params;
  const client = getSupabaseServerClient<Database>();
  const user = await requireUserInServerComponent();

  const post = await fetchDataFromSupabase({
    client,
    table: 'posts',
    select: ['id', 'title', 'content'],
    single: true,
    where: {
      id: {
        eq: params.id,
      },
      account_id: {
        eq: user.id,
      },
    },
  });

  if (!post) {
    return notFound();
  }

  return (
    <div className={'flex h-screen flex-1 flex-col'}>
      <PageHeader
        description={
          <AppBreadcrumbs
            values={{
              [post.data.id]: post.data.title,
            }}
          />
        }
      >
        <Button asChild size={'sm'} variant={'outline'}>
          <Link href={'/home'}>
            <ArrowLeftIcon className="mr-2 w-4" />

            <span>
              <Trans i18nKey="posts:backButtonLabel" />
            </span>
          </Link>
        </Button>
      </PageHeader>

      <PageBody>
        <BlogPostContentEditor content={post.data.content} id={post.data.id} />
      </PageBody>
    </div>
  );
}

export default withI18n(PostPage);
