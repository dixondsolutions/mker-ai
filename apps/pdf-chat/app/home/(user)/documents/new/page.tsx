import { use } from 'react';

import { AppBreadcrumbs } from '@kit/ui/app-breadcrumbs';
import { PageBody, PageHeader } from '@kit/ui/page';

import { withI18n } from '~/lib/i18n/with-i18n';
import { requireUserInServerComponent } from '~/lib/server/require-user-in-server-component';

import { UploadDocumentForm } from '../_components/upload-document-form';

function NewDocumentPage() {
  const { id } = use(requireUserInServerComponent());

  return (
    <>
      <PageHeader description={<AppBreadcrumbs />} />

      <PageBody>
        <UploadDocumentForm accountId={id} />
      </PageBody>
    </>
  );
}

export default withI18n(NewDocumentPage);
