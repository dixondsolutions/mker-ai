import { getSupabaseServerClient } from '@kit/supabase/server-client';
import { Alert, AlertDescription, AlertTitle } from '@kit/ui/alert';
import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody, PageHeader } from '@kit/ui/page';

import { AvatarsGenerationsTable } from '~/home/(user)/avatars/_components/avatars-table';
import { Database } from '~/lib/database.types';

interface Params {
  uuid: string;
}

interface SearchParams {
  page: string;
}

async function ModelPage(props: {
  params: Promise<Params>;
  searchParams: Promise<SearchParams>;
}) {
  const client = getSupabaseServerClient<Database>();

  const params = await props.params;
  const searchParams = await props.searchParams;

  const page = searchParams.page ? Number(searchParams.page) : 1;
  const pageSize = 8;
  const startOffset = (page - 1) * pageSize;
  const endOffset = page * pageSize - 1;

  const { data, error } = await client
    .from('avatars_models')
    .select(
      `
      id,
      uuid,
      name,
      generations: avatars_generations (
        accountId: account_id,
        uuid,
        name,
        status,
        createdAt: created_at
      )
    `,
    )
    .eq('uuid', params.uuid)
    .limit(pageSize, { referencedTable: 'avatars_generations' })
    .range(startOffset, endOffset, {
      referencedTable: 'avatars_generations',
    })
    .single();

  if (error) {
    return (
      <Alert variant={'destructive'}>
        <AlertTitle>Error fetching model data</AlertTitle>
        <AlertDescription>
          Sorry, we could&apos;t fetch the model data. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <PageHeader
        title={data.name}
        description={
          <AppBreadcrumbs
            values={{
              [params.uuid]: data.name,
            }}
          />
        }
      />

      <PageBody>
        <AvatarsGenerationsTable
          page={page}
          pageCount={1}
          pageSize={pageSize}
          data={data.generations}
          linkPrefix={'../avatars'}
        />
      </PageBody>
    </>
  );
}

export default ModelPage;
