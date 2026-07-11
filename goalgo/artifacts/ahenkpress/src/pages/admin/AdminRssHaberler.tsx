import { useListCategories } from "@workspace/api-client-react";
import { AdminLayout } from "@/components/AdminLayout";
import { RssHaberlerPanel } from "@/components/RssHaberlerPanel";
import { Rss } from "lucide-react";

export default function AdminRssHaberler() {
  const { data: categories = [] } = useListCategories();

  const categoryOptions = categories
    .map((c) => ({
      slug: String(c.slug ?? "").trim(),
      label: String(c.name ?? c.slug ?? "").trim(),
    }))
    .filter((c) => c.slug.length > 0);

  return (
    <AdminLayout title="RSS Haberleri">
      <div className="p-4 md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
            <Rss className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">RSS Haberleri</h1>
            <p className="text-sm text-slate-500">
              Portal ve site RSS önbelleğindeki haberler — kategori sekmeleriyle listelenir, Yekpare havuzuna kaydedilebilir.
            </p>
          </div>
        </div>
        <RssHaberlerPanel mode="admin" newsEditorBase="/admin/haberler" editorCategories={categoryOptions} />
      </div>
    </AdminLayout>
  );
}
