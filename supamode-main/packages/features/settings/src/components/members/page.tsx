import { useMemo } from 'react';

import { Form, useLoaderData } from 'react-router';

import { useTranslation } from 'react-i18next';

import { Heading } from '@kit/ui/heading';
import { SearchInput } from '@kit/ui/search-input';
import { Trans } from '@kit/ui/trans';

import { membersLoader } from '../../loaders';
import { MembersTable } from './members-table';

export function MembersSettingsPage() {
  const { t } = useTranslation();

  const loaderData = useLoaderData<typeof membersLoader>() as Awaited<
    ReturnType<typeof membersLoader>
  > & { search: string };

  const members = useMemo(() => {
    return (loaderData.members || []).sort(
      (a, b) => b.highestRoleRank - a.highestRoleRank,
    );
  }, [loaderData.members]);

  const { pageSize, pageIndex, pageCount } = useMemo(
    () => loaderData || {},
    [loaderData],
  );

  const search = loaderData.search;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col">
          <Heading level={5}>
            <Trans i18nKey="settings:member.pageTitle" />
          </Heading>

          <Heading level={6} className={'text-muted-foreground font-normal'}>
            <Trans i18nKey="settings:member.pageDescription" />
          </Heading>
        </div>

        <Form method="get" action="." className="w-full">
          <SearchInput
            data-testid="members-search-input"
            defaultValue={search}
            placeholder={t('settings:member.searchMembers')}
            name="search"
          />

          {/* Hidden input to reset pagination when searching */}
          <input type="hidden" name="page" value="1" />
        </Form>
      </div>

      <MembersTable
        members={members}
        pageSize={pageSize}
        pageIndex={pageIndex}
        pageCount={pageCount}
      />
    </div>
  );
}
