import { Link } from "wouter";
import { Package, Minus, Plus, ShoppingBag, Trash2, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/useCart";
import { resolveClientMediaSrc } from "@/lib/apiBase";
import { SellzyContainer } from "@/themes/sellzy/SellzyContainer";
import { SADE_PUBLIC_POST_HERO_BODY_CLASS } from "@/lib/yekpareSadeTheme";

function currency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n)
    ? n.toLocaleString("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 })
    : "₺0";
}

export default function MagazaSepet() {
  const { items, removeItem, updateQty, total, count } = useCart();
  const tax = total * 0.2;
  const grandTotal = total + tax;
  const vendorHrefs = Array.from(new Set(items.map((item) => item.product.storefrontHref).filter(Boolean))) as string[];
  const singleVendorCheckout = vendorHrefs.length === 1 ? vendorHrefs[0] : null;

  return (
    <main className={`w-full pb-10 md:pb-14 ${SADE_PUBLIC_POST_HERO_BODY_CLASS}`}>
      <SellzyContainer className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-700">Pazaryeri sepeti</p>
              <h1 className="text-3xl font-black">Sepetim</h1>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{count} ürün</span>
          </div>

          {items.length > 1 && vendorHrefs.length > 1 ? (
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
              Sepetinizde birden fazla mağaza var. Ödeme ve teslimat her mağazanın kendi vitrini üzerinden tamamlanır.
            </div>
          ) : null}

          {items.length ? (
            <div className="space-y-3">
              {items.map((item) => {
                const img = resolveClientMediaSrc(item.product.imageUrl);
                const unit = Number(item.product.salePrice ?? item.product.price);
                const storeHref = item.product.storefrontHref;
                return (
                  <article key={`${item.product.id}-${item.variant ?? ""}`} className="grid gap-4 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-3 sm:grid-cols-[96px_1fr_auto] sm:items-center">
                    <Link href={`/magaza/urun/${item.product.slug}`} className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-white">
                      {img ? <img src={img} alt={item.product.name} className="h-full w-full object-contain p-2" /> : <Package className="h-9 w-9 text-slate-200" />}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/magaza/urun/${item.product.slug}`} className="line-clamp-2 font-black hover:text-emerald-700">{item.product.name}</Link>
                      {item.product.vendorName ? <p className="mt-1 text-xs font-semibold text-slate-400">{item.product.vendorName}</p> : null}
                      {item.variant ? <p className="mt-1 text-xs font-semibold text-slate-400">{item.variant}</p> : null}
                      <p className="mt-2 text-sm font-black text-emerald-700">{currency(unit)}</p>
                      {storeHref ? (
                        <Link href={storeHref} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#0f766e] hover:underline">
                          <Store className="h-3.5 w-3.5" /> Mağazada öde
                        </Link>
                      ) : null}
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <button onClick={() => updateQty(item.product.id, item.qty - 1, item.variant)} className="flex h-10 w-10 items-center justify-center hover:bg-slate-50"><Minus className="h-4 w-4" /></button>
                        <span className="flex h-10 w-11 items-center justify-center text-sm font-black">{item.qty}</span>
                        <button onClick={() => updateQty(item.product.id, Math.min((item.product.stock || 99), item.qty + 1), item.variant)} className="flex h-10 w-10 items-center justify-center hover:bg-slate-50"><Plus className="h-4 w-4" /></button>
                      </div>
                      <button onClick={() => removeItem(item.product.id, item.variant)} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 p-12 text-center">
              <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-slate-200" />
              <h2 className="text-xl font-black">Sepetin boş</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">Yekpare pazaryeri ürünlerini inceleyerek sepete ekleyebilirsin.</p>
              <Link href="/magaza/urunler" className="mt-5 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700">Ürünleri keşfet</Link>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-xl font-black">Sipariş özeti</h2>
          <div className="mt-5 space-y-3 text-sm font-semibold text-slate-500">
            <div className="flex justify-between"><span>Ara toplam</span><span className="text-slate-900">{currency(total)}</span></div>
            <div className="flex justify-between"><span>KDV</span><span className="text-slate-900">{currency(tax)}</span></div>
            <div className="border-t border-slate-100 pt-3">
              <div className="flex justify-between text-lg font-black text-slate-950"><span>Toplam</span><span>{currency(grandTotal)}</span></div>
            </div>
          </div>
          {items.length ? (
            <Button asChild className="mt-6 h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700">
              <Link href="/magaza/odeme">Ödemeye geç</Link>
            </Button>
          ) : (
            <Button asChild disabled className="mt-6 h-12 w-full rounded-2xl bg-emerald-600 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
              <Link href="/magaza/urunler">Ürünlere dön</Link>
            </Button>
          )}
          {singleVendorCheckout && items.length ? (
            <Link href={singleVendorCheckout} className="mt-3 block text-center text-xs font-bold text-[#0f766e] hover:underline">
              Yalnızca bu mağazanın vitrininden öde
            </Link>
          ) : null}
          <p className="mt-3 text-xs font-medium leading-relaxed text-slate-400">
            Çok satıcılı sepetlerde her mağaza için ayrı sipariş oluşturulur; kargo ücreti mağaza bazında hesaplanır.
          </p>
        </aside>
      </SellzyContainer>
    </main>
  );
}
