import { PageBody, PageHeader } from '@kit/ui/page';
import { Trans } from '@kit/ui/trans';

import { withI18n } from '~/lib/i18n/with-i18n';

import { BlogPostWizard } from './_components/blog-post-wizard';

function NewPostPage() {
  return (
    <>
      <PageHeader
        description={<Trans i18nKey="posts:newPostTabDescription" />}
      />

      <PageBody>
        <div
          className={
            'mx-auto flex h-full w-full max-w-3xl flex-col items-center'
          }
        >
          <BlogPostWizard />
        </div>
      </PageBody>
    </>
  );
}

export default withI18n(NewPostPage);
