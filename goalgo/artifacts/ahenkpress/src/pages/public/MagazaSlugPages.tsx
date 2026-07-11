import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "wouter";
import { SellzyContainer } from "@/themes/sellzy/SellzyContainer";
import { SellzyProductCard, SellzyProductGrid } from "@/themes/sellzy/SellzyHomeSections";
import { useSellzyLayout } from "@/themes/sellzy/SellzyMarketplaceLayout";
import { resolveMarketplaceStoreCardHref, yekpareEcommerceStoreHref } from "@/lib/marketplaceStoreHref";
import { SADE_PUBLIC_POST_HERO_BODY_CLASS } from "@/lib/yekpareSadeTheme";
import type { SellzyProduct } from "@/themes/sellzy/types";

const API = "/api";

function PageShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className={`w-full pb-10 md:pb-14 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
      <SellzyContainer>
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-light-primary-text leading-tight">{title}</h1>
          {subtitle ? <p className="mt-2 text-light-secondary-text">{subtitle}</p> : null}
        </div>
        {children}
      </SellzyContainer>
    </main>
  );
}

function menuItemToProduct(
  item: Record<string, unknown>,
  vendor: { id?: number; name?: string; slug?: string },
): SellzyProduct {
  const id = Number(item.id ?? 0);
  const price = Number.parseFloat(String(item.price ?? "0").replace(",", "."));
  const saleRaw = item.salePrice ?? item.sale_price;
  const sale = saleRaw != null && saleRaw !== ""
    ? Number.parseFloat(String(saleRaw).replace(",", "."))
    : null;
  const slug = String(vendor.slug ?? "");
  const name = String(item.name ?? "");
  return {
    id,
    name,
    description: item.description ? String(item.description) : null,
    price: Number.isFinite(price) ? price : 0,
    salePrice: sale != null && Number.isFinite(sale) ? sale : null,
    imageUrl: item.imageUrl ?? item.image_url ? String(item.imageUrl ?? item.image_url) : null,
    href: `/magaza/urun/${id}-${encodeURIComponent(name.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"))}`,
    vendorName: String(vendor.name ?? ""),
    slug,
  };
}

export function MagazaKategoriDetay() {
  const { slug } = useParams<{ slug: string }>();
  const { payload, loading } = useSellzyLayout();
  const decoded = decodeURIComponent(slug ?? "");
  const products = useMemo(
    () =>
      payload.products.filter(
        (p) =>
          p.categorySlug === decoded ||
          p.categoryName?.toLocaleLowerCase("tr-TR") === decoded.toLocaleLowerCase("tr-TR"),
      ),
    [payload.products, decoded],
  );
  const category = payload.categories.find(
    (c) => c.slug === decoded || c.name.toLocaleLowerCase("tr-TR") === decoded.toLocaleLowerCase("tr-TR"),
  );

  return (
    <PageShell title={category?.name ?? decoded} subtitle="Kategori ürünleri">
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : products.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((p) => (
            <SellzyProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">Bu kategoride henüz ürün yok. <Link href="/magaza/urunler" className="text-primary underline">Tüm ürünler</Link></p>
      )}
    </PageShell>
  );
}

export function MagazaMarkaDetay() {
  const { slug } = useParams<{ slug: string }>();
  const decoded = decodeURIComponent(slug ?? "");
  const [products, setProducts] = useState<SellzyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/delivery/marketplace?lang=tr&limit=120`)
      .then((r) => r.json())
      .then((d) => {
        const all: SellzyProduct[] = d?.data?.products ?? [];
        setProducts(all.filter((p) => p.vendorName?.toLocaleLowerCase("tr-TR").includes(decoded.toLocaleLowerCase("tr-TR"))));
      })
      .finally(() => setLoading(false));
  }, [decoded]);

  return (
    <PageShell title={decoded} subtitle="Marka ürünleri">
      {loading ? <p className="text-muted-foreground">Yükleniyor...</p> : (
        products.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((p) => <SellzyProductCard key={p.id} product={p} />)}
          </div>
        ) : (
          <p className="text-muted-foreground">Marka ürünü bulunamadı.</p>
        )
      )}
    </PageShell>
  );
}

export function MagazaMagazaDetay() {
  const { slug } = useParams<{ slug: string }>();
  const decoded = decodeURIComponent(slug ?? "");
  const { payload, loading: layoutLoading } = useSellzyLayout();
  const vendor = payload.vendors.find((v) => v.slug === decoded);
  const [vendorDetail, setVendorDetail] = useState<{ name: string; slug: string; imageUrl?: string | null } | null>(null);
  const [vendorProducts, setVendorProducts] = useState<SellzyProduct[]>([]);
  const [loadingVendor, setLoadingVendor] = useState(true);

  const payloadProducts = useMemo(
    () => payload.products.filter((p) => (p as SellzyProduct & { vendorSlug?: string }).vendorSlug === decoded || p.vendorName === vendor?.name),
    [payload.products, decoded, vendor?.name],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingVendor(true);
    fetch(`${API}/delivery/vendors/${encodeURIComponent(decoded)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.vendor) return;
        const v = data.vendor as { id?: number; name?: string; slug?: string; imageUrl?: string | null };
        setVendorDetail({ name: String(v.name ?? decoded), slug: String(v.slug ?? decoded), imageUrl: v.imageUrl ?? null });
        const items = Array.isArray(data.menuItems) ? data.menuItems : [];
        setVendorProducts(items.map((item: Record<string, unknown>) => menuItemToProduct(item, v)));
      })
      .catch(() => {
        if (!cancelled) setVendorDetail(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingVendor(false);
      });
    return () => {
      cancelled = true;
    };
  }, [decoded]);

  const displayVendor = vendorDetail ?? (vendor ? { name: vendor.name, slug: vendor.slug, imageUrl: vendor.imageUrl } : null);
  const products = vendorProducts.length ? vendorProducts : payloadProducts;
  const loading = layoutLoading || loadingVendor;
  const storeHref = resolveMarketplaceStoreCardHref({
    slug: displayVendor?.slug ?? decoded,
    vendorType: "ecommerce",
    yekpareStoreHref: yekpareEcommerceStoreHref(displayVendor?.slug ?? decoded),
  });

  return (
    <PageShell title={displayVendor?.name ?? decoded} subtitle="Mağaza vitrini">
      {loading && !products.length ? <p>Yükleniyor...</p> : (
        <>
          {displayVendor ? (
            <div className="mb-8 rounded-2xl border border-light-divider bg-white p-6 flex items-center gap-4">
              {displayVendor.imageUrl ? <img src={displayVendor.imageUrl} alt="" className="size-16 rounded-xl object-cover" /> : null}
              <div>
                <p className="font-bold text-lg">{displayVendor.name}</p>
                <Link href={storeHref} className="text-sm text-primary">Tam vitrin →</Link>
              </div>
            </div>
          ) : null}
          <SellzyProductGrid title="Mağaza ürünleri" products={products} loading={loading && !products.length} />
          {!loading && !products.length ? (
            <p className="mt-4 text-muted-foreground">
              Bu mağazada henüz listelenecek ürün yok.{" "}
              <Link href={storeHref} className="text-primary underline">Mağaza sayfasına git</Link>
            </p>
          ) : null}
        </>
      )}
    </PageShell>
  );
}

export function MagazaBlogDetay() {
  const { slug } = useParams<{ slug: string }>();
  const decoded = decodeURIComponent(slug ?? "");
  const { payload } = useSellzyLayout();
  const post = payload.blogPosts?.find((b) => b.slug === decoded || b.href.includes(decoded));

  return (
    <PageShell title={post?.title ?? "Blog yazısı"} subtitle={post?.publishedAt ? new Date(post.publishedAt).toLocaleDateString("tr-TR") : undefined}>
      {post ? (
        <article className="prose max-w-3xl">
          {post.imageUrl ? <img src={post.imageUrl} alt="" className="rounded-2xl mb-6 w-full max-h-[400px] object-cover" /> : null}
          <p className="text-lg text-light-secondary-text">{post.excerpt}</p>
          <Link href="/magaza/blog" className="mt-6 inline-block text-primary font-semibold">← Tüm yazılar</Link>
        </article>
      ) : (
        <p className="text-muted-foreground">Blog yazısı bulunamadı.</p>
      )}
    </PageShell>
  );
}
