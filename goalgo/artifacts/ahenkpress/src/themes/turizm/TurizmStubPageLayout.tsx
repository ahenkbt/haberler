import type { ReactNode } from "react";
import { TurizmCategoryPageFooter } from "./TurizmCategoryIntro";
import { TurizmCategoryBlogRow } from "./TurizmCategoryBlogRow";
import { TurizmSidebarPromos } from "./TurizmSidebarPromos";
import type { TurizmCategorySlug } from "./turizmCategoryIntroConfig";
import { useTurizmCms } from "./useTurizmCms";

type Props = {
  slug: TurizmCategorySlug;
  children: ReactNode;
  pageTitle: string;
};

/** Uçuş / otobüs / etkinlik gibi filtre sidebar'ı olmayan sayfalar için sol promo şeridi */
export function TurizmStubPageLayout({ slug, children, pageTitle }: Props) {
  const { cms } = useTurizmCms(slug);

  return (
    <>
      <TurizmCategoryBlogRow slug={slug} title={null} />
      <div className="bc-stub-layout">
        <aside className="bc-stub-layout__sidebar">
          <TurizmSidebarPromos cards={cms.sidebarCards} />
        </aside>
        <div className="bc-stub-layout__main">{children}</div>
      </div>
      <TurizmCategoryPageFooter title={pageTitle} description={cms.pageDescription} />
    </>
  );
}
