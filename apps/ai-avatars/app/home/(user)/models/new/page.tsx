import { use } from 'react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody } from '@kit/ui/page';

import { HomeLayoutPageHeader } from '~/home/(user)/_components/home-page-header';
import { NewModelForm } from '~/home/(user)/models/new/_components/new-model-form';
import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

function CreateModelPage() {
  const { id } = use(requireUserInServerComponent());

  return (
    <>
      <HomeLayoutPageHeader
        title={'Create Model'}
        description={<AppBreadcrumbs />}
      />

      <PageBody>
        <NewModelForm accountId={id} />
      </PageBody>
    </>
  );
}

export default withI18n(CreateModelPage);
