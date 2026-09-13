import { EditorLayout } from "@/components/EditorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Newspaper, Users, FileBox, Images, Video, LayoutGrid, Settings, Sparkles, Megaphone, Tags, ScrollText } from "lucide-react";
import { useHmEditorOptional } from "@/contexts/HmEditorContext";
import { isHmVatanThemeId } from "@/lib/hmVatanTheme";
import { normalizeHmVitrinTheme } from "@/lib/newsSiteLayout";

const cards = [
  { title: "Slider Yönetimi", desc: "Kurumsal vitrinin üst manuel slider haberleri.", href: "/editor/manset", vatanHref: "/editor/genel-ayarlar#hm-corporate-slider", icon: Sparkles, corporateOnly: false },
  { title: "Bant Yönetimi", desc: "Slider altındaki son dakika haber bandı.", href: "/editor/manset", vatanHref: "/editor/genel-ayarlar#hm-corporate-band", icon: LayoutGrid, corporateOnly: false },
  { title: "Hızlı Erişim Yönetimi", desc: "Kurumsal slider altı koyu kısayol kutuları.", href: "/editor/genel-ayarlar#hm-corporate-quick-links", icon: Settings, corporateOnly: true },
  { title: "Menü yönetimi", desc: "Logo menü ve şerit menü — öğe ekle, sırala, aktif/pasif.", href: "/editor/menuler", icon: FileBox, corporateOnly: false },
  { title: "Genel ayarlar", desc: "Logo yükleme, renk, üst menü.", href: "/editor/genel-ayarlar", icon: Settings, corporateOnly: false },
  { title: "Vitrin ayarları", desc: "Haber ve kurumsal modüller, sıralama.", href: "/editor/vitrin", vatanHref: "/editor/vitrin", icon: LayoutGrid, corporateOnly: false },
  { title: "Reklam alanları", desc: "Yekpare ile aynı slot isimleri.", href: "/editor/reklam-alanlari", icon: Megaphone, corporateOnly: false },
  { title: "Kategoriler", desc: "Siteye özel kategori + vitrinde göster/gizle.", href: "/editor/kategoriler", icon: Tags, corporateOnly: false },
  { title: "Haberler", desc: "Manuel haber; yayında havuza düşer.", href: "/editor/haberler", icon: Newspaper, corporateOnly: false },
  { title: "Köşe makaleleri", desc: "AHB içe aktarma ile gelen köşe yazıları (hm_makaleler).", href: "/editor/makaleler", icon: ScrollText, corporateOnly: false },
  { title: "Köşe yazarları", desc: "Yazar ve yazılar; merkezi havuzla senkron.", href: "/editor/kose-yazarlari", icon: Users, corporateOnly: false },
  { title: "Sayfalar", desc: "Özel sayfalar + portal bağlantıları.", href: "/editor/sayfalar", icon: FileBox, corporateOnly: false },
  { title: "Foto galeri", desc: "Yalnızca bu sitede yayın (varsayılan).", href: "/editor/foto-galeri", icon: Images, corporateOnly: false },
  { title: "Video galeri", desc: "Yalnızca bu sitede yayın (varsayılan).", href: "/editor/video-galeri", icon: Video, corporateOnly: false },
];

const vatanDescs: Record<string, string> = {
  "Slider Yönetimi": "Anasayfa kahraman slider görselleri ve buton linkleri (Tepe Manşet).",
  "Bant Yönetimi": "Anasayfa şehitlik mozaği — en az 2 görselli bant kartı kaydedin.",
  "Menü yönetimi": "Üst menü = header mega menü + footer sütunları. Footer menüsü doluysa footer onu kullanır.",
  "Vitrin ayarları": "Vatan anasayfa bölüm sırası ve aç/kapa (Vatan anasayfa sekmesi).",
  "Genel ayarlar": "Logo, bağış başlığı, slider, bant, sosyal medya.",
  "Sayfalar": "Özel sayfa HTML’i anında açılır. TSK listesi /terorle-mucadele, Çanakkale sorgusu /canakkale-sehitleri.",
};

export default function EditorDashboard() {
  const hm = useHmEditorOptional();
  const theme = normalizeHmVitrinTheme(hm?.newsLayoutPrefs?.hmVitrinTheme);
  const isCorporateSite = theme === "corporate" || theme === "vatan";
  const isVatanSite = isHmVatanThemeId(theme);
  const visibleCards = cards.filter((card) => isCorporateSite || !card.corporateOnly);

  return (
    <EditorLayout title="Özet">
      {isVatanSite ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Vatan vitrin bağlantısı</p>
          <p className="mt-1">
            Anasayfa slider, bant/mozaik, menü ve footer bu panelden yönetilir. Haber manşeti (/editor/manset)
            Vatan anasayfasını değiştirmez.
          </p>
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((c) => {
          const href = isVatanSite && "vatanHref" in c && c.vatanHref ? c.vatanHref : c.href;
          const desc = isVatanSite ? vatanDescs[c.title] ?? c.desc : c.desc;
          return (
            <Link key={`${c.title}-${href}`} href={href}>
              <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <c.icon className="w-5 h-5 text-slate-700" />
                    <CardTitle className="text-base">{c.title}</CardTitle>
                  </div>
                  <CardDescription className="text-xs">{desc}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <span className="text-xs font-semibold text-red-600">Aç →</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </EditorLayout>
  );
}
