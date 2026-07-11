import { useState } from "react";
import type { YektubeSource } from "@workspace/yektube-core";
import { AdminPageHeader, AdminTabBar } from "./ui/adminUi";
import { AdminSectionCategoriesTab } from "./AdminSectionCategoriesTab";
import { AdminSectionSourcesTab } from "./AdminSectionSourcesTab";
import { AdminSectionVideosTab } from "./AdminSectionVideosTab";

type TabId = "kaynaklar" | "kategoriler" | "videolar";

const MUZIK_SLUGS = new Set(["muzik", "müzik", "music"]);
const COCUK_SLUGS = new Set(["cocuk", "çocuk", "kids"]);

function isYektubeSource(s: YektubeSource): boolean {
  const slug = s.categorySlug?.trim().toLowerCase() ?? "";
  return !MUZIK_SLUGS.has(slug) && !COCUK_SLUGS.has(slug);
}

export function AdminYektubePage() {
  const [tab, setTab] = useState<TabId>("kategoriler");

  const tabs: { id: TabId; label: string }[] = [
    { id: "kategoriler", label: "Kategoriler" },
    { id: "kaynaklar", label: "Kaynaklar" },
    { id: "videolar", label: "Videolar" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <AdminPageHeader
        title="Yektube İçerik"
        description="Ana Yektube bölümü — kategori, kaynak ve video yönetimi (müzik/çocuk hariç)."
      />
      <AdminTabBar<TabId> tabs={tabs} active={tab} onChange={setTab} />
      {tab === "kategoriler" ? <AdminSectionCategoriesTab section="yektube" /> : null}
      {tab === "kaynaklar" ? (
        <AdminSectionSourcesTab
          title="Yektube kaynakları"
          filter={isYektubeSource}
          defaultCategorySlug="eglence"
          lockCategory={false}
        />
      ) : null}
      {tab === "videolar" ? <AdminSectionVideosTab section="yektube" /> : null}
    </div>
  );
}
