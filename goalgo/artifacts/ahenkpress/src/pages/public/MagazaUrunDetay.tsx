import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { Package } from "lucide-react";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { applyProductStructuredData, applySocialShareMeta, resetSeoToSiteDefaults } from "@/lib/pageSeo";
import { SellzyProductDetailPage, type SellzyProductDetailData } from "@/themes/sellzy/SellzyProductDetail";
import type { SellzyProduct } from "@/themes/sellzy/types";

export default function MagazaUrunDetay() {
  const { slug } = useParams<{ slug: string }>();
  const [product, setProduct] = useState<SellzyProductDetailData | null>(null);
  const [related, setRelated] = useState<SellzyProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    fetch(`/api/delivery/marketplace/products/${encodeURIComponent(slug)}`)
      .then((r) => {
        if (!r.ok) throw new Error("not_found");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        const data = d?.success ? d.data : null;
        if (!data?.product) {
          setNotFound(true);
          return;
        }
        const raw = data.product as SellzyProductDetailData & {
          vendorId?: number;
          vendorName?: string;
          vendorSlug?: string;
          vendorRating?: number | null;
        };
        const vendorSlug = raw.vendor?.slug ?? raw.vendorSlug ?? "";
        const vendorName = raw.vendor?.name ?? raw.vendorName ?? "";
        setProduct({
          ...raw,
          vendor: {
            id: raw.vendor?.id ?? raw.vendorId ?? 0,
            name: vendorName,
            slug: vendorSlug,
            storefrontHref:
              raw.vendor?.storefrontHref ??
              (vendorSlug ? `/magaza/magaza/${encodeURIComponent(vendorSlug)}` : "/magaza/magazalar"),
            rating: raw.vendor?.rating ?? raw.vendorRating ?? null,
          },
        });
        setRelated(Array.isArray(data.related) ? data.related : []);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!product) return;
    const path = `/magaza/urun/${encodeURIComponent(product.slug || slug || "")}`;
    const image = product.imageUrl ? resolveClientMediaSrc(product.imageUrl) || product.imageUrl : null;
    const description = product.shortDescription || product.description || product.name;
    applySocialShareMeta({
      title: `${product.name} — ${product.vendor?.name || "Mağaza"}`,
      descriptionPrimary: description,
      canonicalPath: path,
      imageUrl: image,
    });
    applyProductStructuredData({
      name: product.name,
      description,
      canonicalPath: path,
      imageUrl: image,
      sku: product.sku ?? `YK-${product.id}`,
      brand: product.vendor?.name ?? null,
      price: product.price,
      salePrice: product.salePrice,
      availability: (product.stock ?? 0) > 0 ? "InStock" : "OutOfStock",
      sellerName: product.vendor?.name ?? null,
      sellerUrl: product.vendor?.storefrontHref ?? null,
      rating: product.averageRating ?? product.vendor?.rating ?? null,
      reviewCount: product.numReviews ?? null,
    });
    return () => resetSeoToSiteDefaults();
  }, [product, slug]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-white px-4 text-center">
        <Package className="h-16 w-16 text-muted-foreground/30" />
        <h1 className="text-2xl font-bold text-light-primary-text">Ürün bulunamadı</h1>
        <p className="text-light-secondary-text">Aradığınız ürün mevcut değil veya yayından kaldırılmış.</p>
        <Link href="/magaza" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary/90">Pazaryerine dön</Link>
      </div>
    );
  }

  return <SellzyProductDetailPage product={product} related={related} />;
}
