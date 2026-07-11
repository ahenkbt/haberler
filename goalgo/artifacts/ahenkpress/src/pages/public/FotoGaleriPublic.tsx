import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link, useLocation, useRoute } from "wouter";
import { useMemo, useState } from "react";
import { useHmPublicHref, useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { Images, ChevronLeft, ChevronRight, X, Eye } from "lucide-react";


function LightBox({ items, startIndex, onClose }: { items: any[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex);
  const prev = () => setIdx((i) => (i - 1 + items.length) % items.length);
  const next = () => setIdx((i) => (i + 1) % items.length);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 right-4 text-white/80 hover:text-white" onClick={onClose}>
        <X className="w-8 h-8" />
      </button>
      <button className="absolute left-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10" onClick={(e) => { e.stopPropagation(); prev(); }}>
        <ChevronLeft className="w-10 h-10" />
      </button>
      <div className="max-w-4xl max-h-[90vh] mx-12" onClick={(e) => e.stopPropagation()}>
        <img src={items[idx].imageUrl} alt={items[idx].caption} className="max-w-full max-h-[80vh] object-contain rounded-lg" />
        {items[idx].caption && (
          <p className="text-white/80 text-center mt-3 text-sm">{items[idx].caption}</p>
        )}
        <p className="text-white/50 text-center text-xs mt-1">{idx + 1} / {items.length}</p>
      </div>
      <button className="absolute right-4 top-1/2 -translate-y-1/2 text-white/80 hover:text-white z-10" onClick={(e) => { e.stopPropagation(); next(); }}>
        <ChevronRight className="w-10 h-10" />
      </button>
    </div>
  );
}

export default function FotoGaleriPublic() {
  const [loc] = useLocation();
  const path = useMemo(() => (loc.split("?")[0] ?? "").trim(), [loc]);
  const hmFoto = useMemo(
    () => path.match(/^\/(?:hm|tr)\/([^/]+)\/foto-galeri(?:\/(\d+))?$/),
    [path],
  );
  const [_matchLegacy, legacyParams] = useRoute("/foto-galeri/:id");
  const galleryId = hmFoto?.[2] ?? (_matchLegacy ? String((legacyParams as { id?: string })?.id ?? "") : "");
  const galleryIdOrEmpty = galleryId || undefined;
  const h = useHmPublicHref();
  const hmCtx = useHmPublicLinkContextOptional();
  const listHref = hmCtx ? h("/foto-galeri") : "/foto-galeri";
  const detailHref = (id: number) => (hmCtx ? h(`/foto-galeri/${id}`) : `/foto-galeri/${id}`);

  const [lightbox, setLightbox] = useState<{ items: any[]; index: number } | null>(null);

  const { data: galleries = [], isLoading: loadingList } = useQuery<any[]>({
    queryKey: ["/api/foto-galeri"],
    queryFn: () => apiRequest("/api/foto-galeri"),
    enabled: !galleryIdOrEmpty,
  });

  const { data: gallery } = useQuery<any>({
    queryKey: ["/api/foto-galeri", galleryIdOrEmpty],
    queryFn: () => apiRequest("/api/foto-galeri").then((gs: any[]) => gs.find((g) => g.id === Number(galleryIdOrEmpty))),
    enabled: !!galleryIdOrEmpty,
  });

  const { data: items = [], isLoading: loadingItems } = useQuery<any[]>({
    queryKey: ["/api/foto-galeri", galleryIdOrEmpty, "items"],
    queryFn: () => apiRequest(`/api/foto-galeri/${galleryIdOrEmpty}/items`),
    enabled: !!galleryIdOrEmpty,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-screen-xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href={hmCtx ? h("/") : "/"} className="hover:text-primary">
            Anasayfa
          </Link>
          <span>/</span>
          <Link href={listHref} className="hover:text-primary">
            Foto Galeri
          </Link>
          {galleryIdOrEmpty && gallery && (
            <>
              <span>/</span>
              <span className="text-gray-900 font-medium">{gallery.title}</span>
            </>
          )}
        </div>

        {!galleryIdOrEmpty ? (
          /* Gallery list */
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-8 bg-primary rounded-full" />
              <h1 className="text-2xl font-bold text-gray-900">Foto Galeri</h1>
            </div>

            {loadingList ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : galleries.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Images className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Henüz galeri yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {galleries.filter((g: any) => g.status === "active").map((g: any) => (
                  <Link key={g.id} href={detailHref(g.id)}>
                    <div className="rounded-xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow group cursor-pointer">
                      <div className="aspect-video bg-gray-100 relative overflow-hidden">
                        {g.coverImage ? (
                          <img src={g.coverImage} alt={g.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <Images className="w-10 h-10 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                          <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">{g.title}</h3>
                        {g.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{g.description}</p>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          /* Gallery detail */
          <>
            <Link href={listHref} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
              <ChevronLeft className="w-4 h-4" />
              Tüm Galeriler
            </Link>

            {gallery && (
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-primary rounded-full" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{gallery.title}</h1>
                  {gallery.description && <p className="text-sm text-gray-500 mt-0.5">{gallery.description}</p>}
                </div>
              </div>
            )}

            {loadingItems ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (items as any[]).length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <Images className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Bu galeride henüz fotoğraf yok</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(items as any[]).map((item: any, idx: number) => (
                  <div
                    key={item.id}
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 cursor-pointer group relative"
                    onClick={() => setLightbox({ items: items as any[], index: idx })}
                  >
                    <img src={item.imageUrl} alt={item.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                      {item.caption && (
                        <p className="text-white text-xs p-2 opacity-0 group-hover:opacity-100 transition-opacity line-clamp-2">{item.caption}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {lightbox && (
        <LightBox
          items={lightbox.items}
          startIndex={lightbox.index}
          onClose={() => setLightbox(null)}
        />
      )}

      {!hmCtx ? (
        <footer className="bg-zinc-900 text-white mt-12 py-8">
          <div className="container mx-auto px-4 text-center text-sm text-zinc-400">
            © {new Date().getFullYear()} Yekpare. Tüm hakları saklıdır.
          </div>
        </footer>
      ) : null}
    </div>
  );
}
