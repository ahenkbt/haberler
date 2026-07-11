export type KnowledgeTopic = {
  label: string;
  wikiTitle: string;
};

export type KnowledgeCategory = {
  title: string;
  slug: string;
  icon: string;
  desc: string;
  examples: KnowledgeTopic[];
  accent: string;
  gradient: string;
  image: string;
};

export function knowledgeTopic(label: string, wikiTitle = label): KnowledgeTopic {
  return { label, wikiTitle };
}

export function knowledgeTopicLabel(topic: KnowledgeTopic): string {
  return topic.label;
}

export function knowledgeTopicWikiTitle(topic: KnowledgeTopic): string {
  return topic.wikiTitle || topic.label;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { title: "Gezi Seyahat", slug: "gezi-seyahat", icon: "🧭", desc: "Şehirler, ülkeler, rotalar ve keşif rehberleri.", examples: [knowledgeTopic("İstanbul"), knowledgeTopic("Kapadokya"), knowledgeTopic("Antalya"), knowledgeTopic("Paris"), knowledgeTopic("Roma"), knowledgeTopic("Tokyo")], accent: "#0891b2", gradient: "linear-gradient(135deg, #164e63 0%, #06b6d4 48%, #f59e0b 100%)", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80" },
  { title: "Bilim", slug: "bilim", icon: "🔬", desc: "Evren, canlılar, deneyler ve keşifler.", examples: [knowledgeTopic("Fizik"), knowledgeTopic("Astronomi"), knowledgeTopic("Biyoloji"), knowledgeTopic("Kimya"), knowledgeTopic("Matematik"), knowledgeTopic("Kuantum mekaniği")], accent: "#0ea5e9", gradient: "linear-gradient(135deg, #0f766e 0%, #0ea5e9 100%)", image: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&q=80" },
  { title: "Tarih", slug: "tarih", icon: "🏛️", desc: "Medeniyetler, savaşlar, dönemler ve liderler.", examples: [knowledgeTopic("Osmanlı İmparatorluğu"), knowledgeTopic("Kurtuluş Savaşı"), knowledgeTopic("Antik Çağ"), knowledgeTopic("Roma İmparatorluğu"), knowledgeTopic("Selçuklu Devleti", "Büyük Selçuklu İmparatorluğu"), knowledgeTopic("Cumhuriyet tarihi", "Türkiye Cumhuriyeti tarihi")], accent: "#b45309", gradient: "linear-gradient(135deg, #78350f 0%, #f59e0b 100%)", image: "https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&q=80" },
  { title: "Coğrafya", slug: "cografya", icon: "🗺️", desc: "Ülkeler, şehirler, haritalar ve yeryüzü.", examples: [knowledgeTopic("Türkiye"), knowledgeTopic("Ankara"), knowledgeTopic("İstanbul"), knowledgeTopic("Anadolu"), knowledgeTopic("Akdeniz"), knowledgeTopic("Karadeniz"), knowledgeTopic("Kapadokya")], accent: "#2563eb", gradient: "linear-gradient(135deg, #1d4ed8 0%, #38bdf8 100%)", image: "https://images.unsplash.com/photo-1524661135-423995f22d0b?w=1200&q=80" },
  { title: "Doğa", slug: "doga", icon: "🌿", desc: "Ekosistemler, hayvanlar, bitkiler ve iklim.", examples: [knowledgeTopic("Orman"), knowledgeTopic("Akdeniz iklimi"), knowledgeTopic("Biyoçeşitlilik"), knowledgeTopic("Ekosistem"), knowledgeTopic("Yaban hayatı"), knowledgeTopic("İklim değişikliği")], accent: "#16a34a", gradient: "linear-gradient(135deg, #14532d 0%, #22c55e 100%)", image: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80" },
  { title: "Teknoloji", slug: "teknoloji", icon: "💡", desc: "Yapay zeka, yazılım, cihazlar ve yenilik.", examples: [knowledgeTopic("Yapay zekâ"), knowledgeTopic("İnternet"), knowledgeTopic("Robotik"), knowledgeTopic("Bilgisayar"), knowledgeTopic("Siber güvenlik"), knowledgeTopic("Uzay teknolojisi")], accent: "#7c3aed", gradient: "linear-gradient(135deg, #4c1d95 0%, #a855f7 100%)", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80" },
  { title: "Kültür", slug: "kultur", icon: "🎭", desc: "Gelenekler, toplumlar, yaşam biçimleri.", examples: [knowledgeTopic("Türk kültürü"), knowledgeTopic("Mutfak kültürü", "Mutfak"), knowledgeTopic("Bayram"), knowledgeTopic("Folklor"), knowledgeTopic("Gelenek"), knowledgeTopic("Anadolu kültürü", "Anadolu")], accent: "#db2777", gradient: "linear-gradient(135deg, #831843 0%, #f472b6 100%)", image: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80" },
  { title: "Sanat", slug: "sanat", icon: "🎨", desc: "Resim, müzik, edebiyat ve tasarım.", examples: [knowledgeTopic("Edebiyat"), knowledgeTopic("Müzik"), knowledgeTopic("Mimarlık"), knowledgeTopic("Resim"), knowledgeTopic("Sinema"), knowledgeTopic("Tiyatro")], accent: "#ea580c", gradient: "linear-gradient(135deg, #9a3412 0%, #fb923c 100%)", image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80" },
  { title: "Sağlık", slug: "saglik", icon: "⚕️", desc: "Tıp, beslenme, yaşam ve insan bedeni.", examples: [knowledgeTopic("Tıp"), knowledgeTopic("Beslenme"), knowledgeTopic("Bağışıklık sistemi"), knowledgeTopic("Anatomi"), knowledgeTopic("Halk sağlığı"), knowledgeTopic("Psikoloji")], accent: "#059669", gradient: "linear-gradient(135deg, #047857 0%, #34d399 100%)", image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80" },
  { title: "Ekonomi", slug: "ekonomi", icon: "📈", desc: "Piyasalar, finans, üretim ve ticaret.", examples: [knowledgeTopic("Ekonomi"), knowledgeTopic("Enflasyon"), knowledgeTopic("Borsa"), knowledgeTopic("Ticaret"), knowledgeTopic("Girişimcilik"), knowledgeTopic("Merkez bankası")], accent: "#ca8a04", gradient: "linear-gradient(135deg, #854d0e 0%, #facc15 100%)", image: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80" },
  { title: "Spor", slug: "spor", icon: "🏅", desc: "Branşlar, turnuvalar, sporcular ve rekorlar.", examples: [knowledgeTopic("Futbol"), knowledgeTopic("Olimpiyat Oyunları"), knowledgeTopic("Basketbol"), knowledgeTopic("Voleybol"), knowledgeTopic("Atletizm"), knowledgeTopic("Tenis")], accent: "#dc2626", gradient: "linear-gradient(135deg, #991b1b 0%, #f87171 100%)", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80" },
  { title: "Eğitim", slug: "egitim", icon: "📚", desc: "Okullar, üniversiteler, sınavlar ve öğrenme.", examples: [knowledgeTopic("Eğitim"), knowledgeTopic("Üniversite"), knowledgeTopic("Lise"), knowledgeTopic("Yükseköğretim"), knowledgeTopic("Öğretmen"), knowledgeTopic("Pedagoji")], accent: "#4f46e5", gradient: "linear-gradient(135deg, #312e81 0%, #818cf8 100%)", image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80" },
  { title: "Felsefe", slug: "felsefe", icon: "🧠", desc: "Düşünce, etik, mantık ve filozoflar.", examples: [knowledgeTopic("Felsefe"), knowledgeTopic("Etik"), knowledgeTopic("Mantık"), knowledgeTopic("Platon"), knowledgeTopic("Aristoteles"), knowledgeTopic("Varoluşçuluk")], accent: "#6366f1", gradient: "linear-gradient(135deg, #3730a3 0%, #a5b4fc 100%)", image: "https://images.unsplash.com/photo-1456513080920-11dd9596bb24?w=1200&q=80" },
  { title: "Medya", slug: "medya", icon: "📺", desc: "Gazetecilik, televizyon, dijital iletişim.", examples: [knowledgeTopic("Gazetecilik"), knowledgeTopic("Televizyon"), knowledgeTopic("Radyo"), knowledgeTopic("Basın"), knowledgeTopic("Sosyal medya"), knowledgeTopic("Haber")], accent: "#0d9488", gradient: "linear-gradient(135deg, #115e59 0%, #2dd4bf 100%)", image: "https://images.unsplash.com/photo-1504711434967-e33886168f5c?w=1200&q=80" },
];

export function findKnowledgeCategory(slug?: string | null): KnowledgeCategory | undefined {
  const normalized = String(slug ?? "").trim();
  if (!normalized) return undefined;
  return KNOWLEDGE_CATEGORIES.find((category) => category.slug === normalized);
}

export function knowledgeCategoryHref(base: string, category: KnowledgeCategory): string {
  return `${base}/kategori/${encodeURIComponent(category.slug)}`;
}
