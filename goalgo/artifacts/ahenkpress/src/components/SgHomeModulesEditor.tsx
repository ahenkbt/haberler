import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { uploadYekpareMediaFile } from "@/lib/yekpareMediaLibrary";
import type { NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";

/**
 * sehitgazi.org.tr ana sayfa modülleri (PHP: templates/sector/home.php, sg-home-v4 / sg-tiles v3).
 * layout_json anahtarları:
 *  - hmNewsSgPromoEnabled: boolean ("Unutmayan bir millet için" bölümleri)
 *  - hmNewsSgPromoItems: [{ title, eyebrow, subtitle, button, href, image, hidden }] (sıra = dizi sırası)
 *  - hmNewsSgTiles: [{ title, text, href, image, hidden }] (üstteki 4 rehber kartı)
 * Boş alan = temanın varsayılan metni/görseli.
 */
export type SgPromoItem = { key: string; title: string; eyebrow: string; subtitle: string; button: string; href: string; image: string; hidden?: boolean };
export type SgTileItem = { key: string; title: string; text: string; href: string; image: string; hidden?: boolean };

export const SG_PROMO_DEFAULTS: SgPromoItem[] = [
  { key: "savaslar", title: "Savaşlar ve Harekâtlar", eyebrow: "Millî Hafıza", subtitle: "Çanakkale'den Kore'ye, Kurtuluş Savaşı'ndan Kıbrıs Barış Harekâtı'na: milletimizin varlık mücadelesi.", button: "Savaşları keşfet", href: "/bilgi#savaslar-ve-harekatlar", image: "/brand/sector/wiki/p-savaslar-u.jpg" },
  { key: "sehitlikler", title: "Şehitlikler ve Anıtlar", eyebrow: "Vefa", subtitle: "Şehitlerimizin emanet edildiği topraklar: Çanakkale Şehitler Abidesi'nden Edirnekapı'ya.", button: "Şehitlikleri gör", href: "/bilgi#sehitlikler-ve-anitlar", image: "/brand/sector/wiki/p-sehitlikler-u.jpg" },
  { key: "tarihi", title: "Tarihi Alanlar", eyebrow: "Zafer Coğrafyası", subtitle: "Gelibolu Yarımadası'ndan Sakarya ve Başkomutan Tarihî Millî Parkı'na kahramanlık sahneleri.", button: "Alanları gez", href: "/bilgi#tarihi-alanlar", image: "/brand/sector/wiki/p-tarihi-u3.jpg" },
  { key: "kahramanlar", title: "Kahramanlar", eyebrow: "Destan Yazanlar", subtitle: "Seyit Onbaşı'dan Nene Hatun'a, adı dilden dile dolaşan kahramanlarımız.", button: "Kahramanları tanı", href: "/bilgi#kadin-kahramanlar", image: "/brand/sector/wiki/p-kahramanlar-u.jpg" },
  { key: "ataturk", title: "Atatürk ve Anıtkabir", eyebrow: "Başkomutan", subtitle: "Gazi Mustafa Kemal Atatürk'ün hayatı, ilkeleri ve ebedî istirahatgâhı Anıtkabir.", button: "Atatürk köşesi", href: "/bilgi#ataturk-ve-anitkabir", image: "/brand/sector/wiki/p-ataturk-u.jpg" },
  { key: "mevzuat", title: "Mevzuat", eyebrow: "Haklar", subtitle: "Şehit yakınları ve gazilere ilişkin kanun, yönetmelik ve genelgeler; resmî metinleriyle.", button: "Mevzuatı oku", href: "/mevzuat", image: "/brand/sector/wiki/p-mevzuat-u.jpg" },
  { key: "sss", title: "Sıkça Sorulan Sorular", eyebrow: "Rehber", subtitle: "Haklar, başvurular ve belgeler: en çok sorulanlar, sade ve kaynaklı cevaplarla.", button: "Cevapları bul", href: "/sss", image: "/brand/sector/wiki/p-sss-u2.jpg" },
  { key: "bilgi", title: "Bilgi Merkezi", eyebrow: "Arşiv", subtitle: "Haklardan millî günlere, kaynaklı ve özgün tüm rehberler tek çatı altında.", button: "Bilgi Merkezi'ne git", href: "/bilgi", image: "/brand/sector/wiki/p-bilgi-u.jpg" },
  { key: "milli", title: "Millî Günler", eyebrow: "Takvim", subtitle: "18 Mart'tan 30 Ağustos'a, 29 Ekim'den 10 Kasım'a: millî günlerimiz, anlamları ve anma programları.", button: "Millî günleri gör", href: "/milli-gunler", image: "/brand/sector/wiki/p-milli-u.jpg" },
  { key: "tsk", title: "TSK Şehitlerimiz", eyebrow: "Rahmetle", subtitle: "Millî Savunma Bakanlığı kayıtlarıyla şehitlerimiz: isim, rütbe, memleket ve şehadet bilgileri.", button: "Şehitlerimizi an", href: "/tsk-sehitlerimiz", image: "/brand/sector/wiki/p-tsk.jpg" },
];

export const SG_TILE_DEFAULTS: SgTileItem[] = [
  { key: "mevzuat", title: "Haklar ve Mevzuat", text: "Şehit yakını ve gazilere tanınan hakların dayandığı kanun, yönetmelik ve genelgeler; resmî kaynak bağlantılı.", href: "/mevzuat", image: "/brand/sector/wiki/tile-mevzuat-v2.jpg" },
  { key: "sss", title: "Sıkça Sorulan Sorular", text: "Genel Müdürlüğün SSS sayfası konu konu, sade bir dille; resmî kaynak her başlıkta belirtilir.", href: "/sss", image: "/brand/sector/wiki/tile-sss-v2.jpg" },
  { key: "bakanlik", title: "Bakanlık Haberleri", text: "Şehit Yakınları ve Gaziler Genel Müdürlüğü haberleri ve duyuruları, kaynağıyla birlikte.", href: "/kategori/sg-bakanlik-haberleri", image: "/brand/sector/wiki/tile-bakanlik-v2.jpg" },
  { key: "kurum", title: "Kurum Rehberi", text: "Şehit yakınları ve gazilerle ilgili resmî kurumlara hızlı erişim.", href: "/rehber/kurum", image: "/brand/sector/wiki/tile-kurum-v2.jpg" },
];

export function isSehitGaziSite(domains: Array<string | null | undefined>): boolean {
  return domains.some((d) => typeof d === "string" && /(^|\.)sehitgazi\.org\.tr$/i.test(d.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "")));
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");

/** Kayıtlı override'ları varsayılanlarla birleştirir (PHP ile aynı: dizin = varsayılan sıra). */
export function mergeSgPromo(saved: unknown): SgPromoItem[] {
  const arr = Array.isArray(saved) ? saved : [];
  return SG_PROMO_DEFAULTS.map((d, i) => {
    const o = (arr[i] && typeof arr[i] === "object" ? arr[i] : {}) as Record<string, unknown>;
    return { ...d, title: str(o.title) || d.title, eyebrow: str(o.eyebrow) || d.eyebrow, subtitle: str(o.subtitle) || d.subtitle, button: str(o.button) || d.button, href: str(o.href) || d.href, image: str(o.image, 600) || d.image, hidden: o.hidden === true };
  });
}

export function mergeSgTiles(saved: unknown): SgTileItem[] {
  const arr = Array.isArray(saved) ? saved : [];
  return SG_TILE_DEFAULTS.map((d, i) => {
    const o = (arr[i] && typeof arr[i] === "object" ? arr[i] : {}) as Record<string, unknown>;
    return { ...d, title: str(o.title) || d.title, text: str(o.text) || d.text, href: str(o.href) || d.href, image: str(o.image, 600) || d.image, hidden: o.hidden === true };
  });
}

function ImageField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  return (
    <div className="flex items-center gap-2">
      {value ? <img src={value} alt="" className="h-12 w-20 rounded object-cover border border-slate-200" /> : null}
      <Input value={value} disabled={disabled} placeholder="https://… veya /brand/…" onChange={(e) => onChange(e.target.value)} />
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        Yükle
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={disabled || busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setBusy(true);
            try {
              const { url } = await uploadYekpareMediaFile(f);
              onChange(url);
            } catch (err) {
              toast({ title: "Görsel yüklenemedi", description: String((err as Error)?.message ?? err).slice(0, 200), variant: "destructive" });
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
    </div>
  );
}

export function SgHomeModulesEditor({
  prefs,
  save,
}: {
  prefs: NewsSiteLayoutPrefs;
  save: (patch: Record<string, unknown>) => Promise<boolean>;
}) {
  const raw = prefs as unknown as Record<string, unknown>;
  const [on, setOn] = useState(raw.hmNewsSgPromoEnabled !== false);
  const [promo, setPromo] = useState<SgPromoItem[]>(() => mergeSgPromo(raw.hmNewsSgPromoItems));
  const [tiles, setTiles] = useState<SgTileItem[]>(() => mergeSgTiles(raw.hmNewsSgTiles));
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setOn(raw.hmNewsSgPromoEnabled !== false);
    setPromo(mergeSgPromo(raw.hmNewsSgPromoItems));
    setTiles(mergeSgTiles(raw.hmNewsSgTiles));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs]);

  const setP = (i: number, patch: Partial<SgPromoItem>) => setPromo((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const setT = (i: number, patch: Partial<SgTileItem>) => setTiles((prev) => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, d: -1 | 1) =>
    setPromo((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const n = [...prev];
      [n[i], n[j]] = [n[j]!, n[i]!];
      return n;
    });

  const onSave = async () => {
    setSaving(true);
    // PHP dizin sırasıyla okur; sıra değişince tüm alanlar (görsel dahil) açıkça yazılır.
    const ok = await save({
      hmNewsSgPromoEnabled: on,
      hmNewsSgPromoItems: promo.map(({ key: _k, ...r }) => ({ ...r, hidden: r.hidden === true })),
      hmNewsSgTiles: tiles.map(({ key: _k, ...r }) => ({ ...r, hidden: r.hidden === true })),
    });
    setSaving(false);
    void ok;
  };

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4" id="sg-anasayfa-modulleri">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-base font-black text-slate-900">Şehit Gazi ana sayfa modülleri</p>
          <p className="text-xs text-slate-500">Üstteki 4 rehber kartı ve “Unutmayan bir millet için” bölümleri. Boş alan varsayılanı kullanır.</p>
        </div>
        <Button type="button" className="gap-2 bg-slate-900 text-white" disabled={saving} onClick={() => void onSave()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Modülleri kaydet
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-slate-900">Rehber kartları (üst 4)</Label>
        {tiles.map((t, i) => (
          <div key={t.key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{i + 1}. {t.title}</p>
              <div className="flex items-center gap-2 text-xs">Göster <Switch checked={!t.hidden} disabled={saving} onCheckedChange={(c) => setT(i, { hidden: !c })} aria-label={`${t.title} göster`} /></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={t.title} disabled={saving} placeholder="Başlık" onChange={(e) => setT(i, { title: e.target.value })} />
              <Input value={t.href} disabled={saving} placeholder="Bağlantı (/mevzuat)" onChange={(e) => setT(i, { href: e.target.value })} />
            </div>
            <Textarea value={t.text} disabled={saving} placeholder="Açıklama" onChange={(e) => setT(i, { text: e.target.value })} />
            <ImageField value={t.image} disabled={saving} onChange={(v) => setT(i, { image: v })} />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">“Unutmayan bir millet için” bölümleri</p>
          <p className="text-[11px] text-slate-500">Kapalıysa ana sayfada hiç çıkmaz. Sırayı oklarla değiştirin.</p>
        </div>
        <Switch checked={on} disabled={saving} onCheckedChange={setOn} aria-label="Bölümler açık" />
      </div>

      {promo.map((r, i) => (
        <div key={r.key} className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{String(i + 1).padStart(2, "0")}. {r.title}</p>
            <div className="flex items-center gap-1">
              <Button type="button" size="icon" variant="ghost" disabled={saving || i === 0} onClick={() => move(i, -1)} aria-label="Yukarı"><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" size="icon" variant="ghost" disabled={saving || i === promo.length - 1} onClick={() => move(i, 1)} aria-label="Aşağı"><ArrowDown className="h-4 w-4" /></Button>
              <span className="ml-2 text-xs">Göster</span>
              <Switch checked={!r.hidden} disabled={saving} onCheckedChange={(c) => setP(i, { hidden: !c })} aria-label={`${r.title} göster`} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={r.title} disabled={saving} placeholder="Başlık" onChange={(e) => setP(i, { title: e.target.value })} />
            <Input value={r.eyebrow} disabled={saving} placeholder="Üst satır (altın)" onChange={(e) => setP(i, { eyebrow: e.target.value })} />
            <Input value={r.button} disabled={saving} placeholder="Düğme metni" onChange={(e) => setP(i, { button: e.target.value })} />
            <Input value={r.href} disabled={saving} placeholder="Düğme bağlantısı" onChange={(e) => setP(i, { href: e.target.value })} />
          </div>
          <Textarea value={r.subtitle} disabled={saving} placeholder="Alt başlık" onChange={(e) => setP(i, { subtitle: e.target.value })} />
          <ImageField value={r.image} disabled={saving} onChange={(v) => setP(i, { image: v })} />
        </div>
      ))}
    </section>
  );
}
