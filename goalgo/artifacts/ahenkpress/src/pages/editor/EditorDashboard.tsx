import { EditorLayout } from "@/components/EditorLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { Newspaper, Users, FileBox, Images, Video, LayoutGrid, Settings, Sparkles, Megaphone, Tags, ScrollText } from "lucide-react";
import { useHmEditorOptional } from "@/contexts/HmEditorContext";
import { normalizeHmVitrinTheme } from "@/lib/newsSiteLayout";

const cards = [
  { title: "Slider Yönetimi", desc: "Kurumsal vitrinin üst manuel slider haberleri.", href: "/editor/manset", icon: Sparkles, corporateOnly: false },
  { title: "Bant Yönetimi", desc: "Slider altındaki son dakika haber bandı.", href: "/editor/manset", icon: LayoutGrid, corporateOnly: false },
  { title: "Hızlı Erişim Yönetimi", desc: "Kurumsal slider altı koyu kısayol kutuları.", href: "/editor/genel-ayarlar#hm-corporate-quick-links", icon: Settings, corporateOnly: true },
  { title: "Menü yönetimi", desc: "Logo menü ve şerit menü — öğe ekle, sırala, aktif/pasif.", href: "/editor/menuler", icon: FileBox, corporateOnly: false },
  { title: "Genel ayarlar", desc: "Logo yükleme, renk, üst menü.", href: "/editor/genel-ayarlar", icon: Settings, corporateOnly: false },
  { title: "Vitrin ayarları", desc: "Haber ve kurumsal modüller, sıralama.", href: "/editor/vitrin", icon: LayoutGrid, corporateOnly: false },
  { title: "Reklam alanları", desc: "Yekpare ile aynı slot isimleri.", href: "/editor/reklam-alanlari", icon: Megaphone, corporateOnly: false },
  { title: "Kategoriler", desc: "Siteye özel kategori + vitrinde göster/gizle.", href: "/editor/kategoriler", icon: Tags, corporateOnly: false },
  { title: "Haberler", desc: "Manuel haber; yayında havuza düşer.", href: "/editor/haberler", icon: Newspaper, corporateOnly: false },
  { title: "Köşe makaleleri", desc: "AHB içe aktarma ile gelen köşe yazıları (hm_makaleler).", href: "/editor/makaleler", icon: ScrollText, corporateOnly: false },
  { title: "Köşe yazarları", desc: "Yazar ve yazılar; merkezi havuzla senkron.", href: "/editor/kose-yazarlari", icon: Users, corporateOnly: false },
  { title: "Sayfalar", desc: "Özel sayfalar + portal bağlantıları.", href: "/editor/sayfalar", icon: FileBox, corporateOnly: false },
  { title: "Foto galeri", desc: "Yalnızca bu sitede yayın (varsayılan).", href: "/editor/foto-galeri", icon: Images, corporateOnly: false },
  { title: "Video galeri", desc: "Yalnızca bu sitede yayın (varsayılan).", href: "/editor/video-galeri", icon: Video, corporateOnly: false },
];

export default function EditorDashboard() {
  const hm = useHmEditorOptional();
  const isCorporateSite = normalizeHmVitrinTheme(hm?.newsLayoutPrefs?.hmVitrinTheme) === "corporate";
  const visibleCards = cards.filter((card) => isCorporateSite || !card.corporateOnly);

  return (
    <EditorLayout title="Özet">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleCards.map((c) => (
          <Link key={c.href} href={c.href}>
            <Card className="h-full border-slate-200 hover:border-slate-300 hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <c.icon className="w-5 h-5 text-slate-700" />
                  <CardTitle className="text-base">{c.title}</CardTitle>
                </div>
                <CardDescription className="text-xs">{c.desc}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <span className="text-xs font-semibold text-red-600">Aç →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </EditorLayout>
  );
}
