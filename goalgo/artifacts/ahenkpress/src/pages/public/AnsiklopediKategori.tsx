import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { ChevronRight, Search } from "lucide-react";
import { BilgiAgaciShell } from "@/components/BilgiAgaciShell";
import { useHmPublicLinkContextOptional } from "@/contexts/HmPublicLinkContext";
import { apiUrl } from "@/lib/apiBase";
import { useAnsiklopediBasePath } from "@/lib/ansiklopediPaths";
import { wikiTitleToUrlSlug } from "@/lib/wikiArticleSlug";
import {
  KNOWLEDGE_CATEGORIES,
  findKnowledgeCategory,
  knowledgeCategoryHref,
  knowledgeTopic,
  knowledgeTopicLabel,
  knowledgeTopicWikiTitle,
  type KnowledgeTopic,
} from "@/lib/bilgiAgaciCategories";
import {
  applyCollectionPageStructuredData,
  applySocialShareMeta,
  resetSeoToSiteDefaults,
} from "@/lib/pageSeo";
import "@/styles/bilgiAgaciTheme.css";

const CATEGORY_MORE_TOPICS: Record<string, KnowledgeTopic[]> = {
  bilim: [knowledgeTopic("Evren"), knowledgeTopic("Güneş Sistemi"), knowledgeTopic("DNA"), knowledgeTopic("Jeoloji"), knowledgeTopic("Bilim tarihi"), knowledgeTopic("Nobel Ödülü")],
  tarih: [knowledgeTopic("Bizans İmparatorluğu"), knowledgeTopic("Anadolu Selçuklu Devleti"), knowledgeTopic("Çanakkale Savaşı"), knowledgeTopic("İpek Yolu"), knowledgeTopic("Hititler"), knowledgeTopic("Tarihyazımı")],
  cografya: [knowledgeTopic("Ege Bölgesi"), knowledgeTopic("Marmara Bölgesi"), knowledgeTopic("Doğu Anadolu Bölgesi"), knowledgeTopic("Dünya"), knowledgeTopic("Avrupa"), knowledgeTopic("Asya")],
  "gezi-seyahat": [knowledgeTopic("Ege kıyıları", "Ege Denizi"), knowledgeTopic("Likya Yolu"), knowledgeTopic("Nemrut Dağı"), knowledgeTopic("Londra"), knowledgeTopic("New York"), knowledgeTopic("Bali")],
  doga: [knowledgeTopic("Milli park", "Millî park"), knowledgeTopic("Kuşlar"), knowledgeTopic("Memeliler"), knowledgeTopic("Bitki"), knowledgeTopic("Deniz"), knowledgeTopic("Sürdürülebilirlik")],
  teknoloji: [knowledgeTopic("Makine öğrenimi"), knowledgeTopic("Veri bilimi"), knowledgeTopic("Elektronik"), knowledgeTopic("Akıllı telefon"), knowledgeTopic("Bulut bilişim"), knowledgeTopic("Blockchain", "Blok zinciri")],
  kultur: [knowledgeTopic("Kültürel miras"), knowledgeTopic("Halk oyunu", "Halk oyunları"), knowledgeTopic("Türk mutfağı"), knowledgeTopic("Dil"), knowledgeTopic("Mitoloji"), knowledgeTopic("El sanatları")],
  sanat: [knowledgeTopic("Heykel"), knowledgeTopic("Fotoğrafçılık"), knowledgeTopic("Opera"), knowledgeTopic("Roman"), knowledgeTopic("Şiir"), knowledgeTopic("Çağdaş sanat")],
  saglik: [knowledgeTopic("Hastalık"), knowledgeTopic("Vitamin"), knowledgeTopic("Spor hekimliği"), knowledgeTopic("Uyku"), knowledgeTopic("Kalp"), knowledgeTopic("Sağlıklı yaşam", "Sağlık")],
  ekonomi: [knowledgeTopic("Para"), knowledgeTopic("Finans"), knowledgeTopic("Vergi"), knowledgeTopic("İhracat"), knowledgeTopic("Muhasebe"), knowledgeTopic("Küreselleşme")],
  spor: [knowledgeTopic("Spor tarihi", "Spor"), knowledgeTopic("Formula 1"), knowledgeTopic("Yüzme"), knowledgeTopic("Güreş"), knowledgeTopic("Hentbol"), knowledgeTopic("Spor kulübü")],
};

const TOPIC_IMAGE_FALLBACKS: Record<string, string> = {
  "İstanbul": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80",
  "Kapadokya": "https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?w=1200&q=80",
  "Antalya": "https://images.unsplash.com/photo-1597532464075-332884b0f0d5?w=1200&q=80",
  "Paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
  "Roma": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80",
  "Tokyo": "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80",
  "Ege kıyıları": "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&q=80",
  "Ege Denizi": "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&q=80",
  "Likya Yolu": "https://images.unsplash.com/photo-1625924943768-128d4e705f23?w=1200&q=80",
  "Nemrut Dağı": "https://images.unsplash.com/photo-1542024019224-58f0f1fd9b9b?w=1200&q=80",
  "Londra": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=1200&q=80",
  "New York": "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?w=1200&q=80",
  "Bali": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80",
  "Fizik": "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=1200&q=80",
  "Astronomi": "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&q=80",
  "Biyoloji": "https://images.unsplash.com/photo-1530210124550-912dc1381cb8?w=1200&q=80",
  "Kimya": "https://images.unsplash.com/photo-1532187643603-ba119ca4109e?w=1200&q=80",
  "Matematik": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=1200&q=80",
  "Kuantum mekaniği": "https://images.unsplash.com/photo-1635070041409-e63e783ce3c1?w=1200&q=80",
  "Evren": "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&q=80",
  "Güneş Sistemi": "https://images.unsplash.com/photo-1614313913007-2b4ae8ce32d6?w=1200&q=80",
  "DNA": "https://images.unsplash.com/photo-1581093458791-9d15482442f6?w=1200&q=80",
  "Jeoloji": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
  "Bilim tarihi": "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=1200&q=80",
  "Nobel Ödülü": "https://images.unsplash.com/photo-1578269174936-2709b6aeb913?w=1200&q=80",
  "Osmanlı İmparatorluğu": "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=1200&q=80",
  "Kurtuluş Savaşı": "https://images.unsplash.com/photo-1564415315949-7a0c4c73aab4?w=1200&q=80",
  "Antik Çağ": "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=1200&q=80",
  "Roma İmparatorluğu": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200&q=80",
  "Selçuklu Devleti": "https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&q=80",
  "Cumhuriyet tarihi": "https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=80",
  "Bizans İmparatorluğu": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80",
  "Anadolu Selçuklu Devleti": "https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&q=80",
  "Çanakkale Savaşı": "https://images.unsplash.com/photo-1519817650390-64a93db51149?w=1200&q=80",
  "İpek Yolu": "https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200&q=80",
  "Hititler": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80",
  "Tarihyazımı": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80",
  "Türkiye": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80",
  "Anadolu": "https://images.unsplash.com/photo-1570939274717-7eda259b50ed?w=1200&q=80",
  "Akdeniz": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  "Karadeniz": "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=80",
  "Ege Bölgesi": "https://images.unsplash.com/photo-1533104816931-20fa691ff6ca?w=1200&q=80",
  "Marmara Bölgesi": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80",
  "Doğu Anadolu Bölgesi": "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&q=80",
  "Dünya": "https://images.unsplash.com/photo-1614730321146-b6fa6a46bcb4?w=1200&q=80",
  "Avrupa": "https://images.unsplash.com/photo-1491557345352-5929e343eb89?w=1200&q=80",
  "Asya": "https://images.unsplash.com/photo-1513415756790-2ac1db1297d0?w=1200&q=80",
  "Orman": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=80",
  "Akdeniz iklimi": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  "Biyoçeşitlilik": "https://images.unsplash.com/photo-1500829243541-74b677fecc30?w=1200&q=80",
  "Ekosistem": "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=1200&q=80",
  "Yaban hayatı": "https://images.unsplash.com/photo-1456926631375-92c8ce872def?w=1200&q=80",
  "İklim değişikliği": "https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=1200&q=80",
  "Milli park": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80",
  "Millî park": "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1200&q=80",
  "Kuşlar": "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=1200&q=80",
  "Memeliler": "https://images.unsplash.com/photo-1501706362039-c06b2d715385?w=1200&q=80",
  "Bitki": "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=1200&q=80",
  "Deniz": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=80",
  "Sürdürülebilirlik": "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1200&q=80",
  "Yapay zekâ": "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200&q=80",
  "İnternet": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
  "Robotik": "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=1200&q=80",
  "Bilgisayar": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&q=80",
  "Siber güvenlik": "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&q=80",
  "Uzay teknolojisi": "https://images.unsplash.com/photo-1517976487492-5750f3195933?w=1200&q=80",
  "Makine öğrenimi": "https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&q=80",
  "Veri bilimi": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80",
  "Elektronik": "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
  "Akıllı telefon": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80",
  "Bulut bilişim": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
  "Blockchain": "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1200&q=80",
  "Blok zinciri": "https://images.unsplash.com/photo-1639322537228-f710d846310a?w=1200&q=80",
  "Türk kültürü": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=1200&q=80",
  "Mutfak kültürü": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
  "Mutfak": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
  "Bayram": "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=80",
  "Folklor": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80",
  "Gelenek": "https://images.unsplash.com/photo-1528155124528-06c125d81e89?w=1200&q=80",
  "Anadolu kültürü": "https://images.unsplash.com/photo-1570939274717-7eda259b50ed?w=1200&q=80",
  "Kültürel miras": "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1200&q=80",
  "Halk oyunu": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80",
  "Halk oyunları": "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=1200&q=80",
  "Türk mutfağı": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
  "Dil": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80",
  "Mitoloji": "https://images.unsplash.com/photo-1525874684015-58379d421a52?w=1200&q=80",
  "El sanatları": "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?w=1200&q=80",
  "Edebiyat": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200&q=80",
  "Müzik": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=1200&q=80",
  "Mimarlık": "https://images.unsplash.com/photo-1494526585095-c41746248156?w=1200&q=80",
  "Resim": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80",
  "Sinema": "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&q=80",
  "Tiyatro": "https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80",
  "Heykel": "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=1200&q=80",
  "Fotoğrafçılık": "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80",
  "Opera": "https://images.unsplash.com/photo-1503095396549-807759245b35?w=1200&q=80",
  "Roman": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&q=80",
  "Şiir": "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=1200&q=80",
  "Çağdaş sanat": "https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=1200&q=80",
  "Tıp": "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=1200&q=80",
  "Beslenme": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
  "Bağışıklık sistemi": "https://images.unsplash.com/photo-1581093458791-9d15482442f6?w=1200&q=80",
  "Anatomi": "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=1200&q=80",
  "Halk sağlığı": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=1200&q=80",
  "Psikoloji": "https://images.unsplash.com/photo-1493836512294-502baa1986e2?w=1200&q=80",
  "Hastalık": "https://images.unsplash.com/photo-1584515933487-779824d29309?w=1200&q=80",
  "Vitamin": "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1200&q=80",
  "Spor hekimliği": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
  "Uyku": "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=1200&q=80",
  "Kalp": "https://images.unsplash.com/photo-1628348070889-cb656235b4eb?w=1200&q=80",
  "Sağlıklı yaşam": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80",
  "Sağlık": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=1200&q=80",
  "Ekonomi": "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80",
  "Enflasyon": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=80",
  "Borsa": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
  "Ticaret": "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?w=1200&q=80",
  "Girişimcilik": "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&q=80",
  "Merkez bankası": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=80",
  "Para": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1200&q=80",
  "Finans": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&q=80",
  "Vergi": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
  "İhracat": "https://images.unsplash.com/photo-1494412651409-8963ce7935a7?w=1200&q=80",
  "Muhasebe": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
  "Küreselleşme": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
  "Futbol": "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1200&q=80",
  "Olimpiyat Oyunları": "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&q=80",
  "Basketbol": "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=1200&q=80",
  "Voleybol": "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=1200&q=80",
  "Atletizm": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=1200&q=80",
  "Tenis": "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=1200&q=80",
  "Spor tarihi": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=80",
  "Spor": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=80",
  "Formula 1": "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?w=1200&q=80",
  "Yüzme": "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1200&q=80",
  "Güreş": "https://images.unsplash.com/photo-1517438322307-e67111335449?w=1200&q=80",
  "Hentbol": "https://images.unsplash.com/photo-1521412644187-c49fa049e84d?w=1200&q=80",
  "Spor kulübü": "https://images.unsplash.com/photo-1526232761682-d26e03ac148e?w=1200&q=80",
};

type WikiTopicSummary = {
  thumbnail?: { source?: string } | null;
  originalimage?: { source?: string } | null;
};

function wikiTopicImage(summary: WikiTopicSummary | null | undefined): string {
  return summary?.thumbnail?.source || summary?.originalimage?.source || "";
}

function topicFallbackImage(topic: string, categoryFallback?: string): string {
  return TOPIC_IMAGE_FALLBACKS[topic] || categoryFallback || "";
}

function topicFallbackImages(topics: string[], categoryFallback?: string): Record<string, string> {
  return Object.fromEntries(
    topics.map((topic) => [topic, topicFallbackImage(topic, categoryFallback)]),
  );
}

function useWikiTopicImages(topics: string[], categoryFallback?: string): Record<string, string> {
  const [wikiImages, setWikiImages] = useState<Record<string, string>>({});
  const topicsKey = topics.join("\u0001");
  const uniqueTopics = Array.from(new Set(topics.map((topic) => topic.trim()).filter(Boolean)));
  const fallbackMap = topicFallbackImages(uniqueTopics, categoryFallback);

  useEffect(() => {
    let cancelled = false;
    if (uniqueTopics.length === 0) {
      setWikiImages({});
      return;
    }

    setWikiImages({});

    fetch(apiUrl("/api/wiki/summaries?lang=tr"), {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ titles: uniqueTopics }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { data?: Record<string, WikiTopicSummary | null> } | null) => {
        if (cancelled || !payload?.data) return;
        const resolved = uniqueTopics.reduce<Record<string, string>>((acc, topic) => {
            const img = wikiTopicImage(payload.data?.[topic]);
            if (img) acc[topic] = img;
            return acc;
          }, {});
        setWikiImages(resolved);
      })
      .catch(() => {
        if (!cancelled) setWikiImages({});
      });

    return () => {
      cancelled = true;
    };
  }, [topicsKey, categoryFallback]);

  return { ...fallbackMap, ...wikiImages };
}

function articleHref(base: string, title: string) {
  return `${base}/${wikiTitleToUrlSlug(title)}`;
}

function topicHref(base: string, topic: KnowledgeTopic) {
  return articleHref(base, knowledgeTopicWikiTitle(topic));
}

export default function AnsiklopediKategori() {
  const params = useParams<{ categorySlug?: string }>();
  const [, navigate] = useLocation();
  const ansiklopediBase = useAnsiklopediBasePath();
  const hmEmbedded = useHmPublicLinkContextOptional() != null;
  const category = findKnowledgeCategory(params.categorySlug);
  const secondaryTopics = category ? CATEGORY_MORE_TOPICS[category.slug] ?? [] : [];
  const allTopics = category ? [...category.examples, ...secondaryTopics] : [];
  const heroTopics = allTopics.slice(0, 3);
  const spotlightTopic = heroTopics[0];
  const heroStats = category
    ? [
        { value: String(allTopics.length), label: "Seçili başlık" },
        { value: category.examples[0] ? knowledgeTopicLabel(category.examples[0]) : category.title, label: "Öne çıkan rota" },
        { value: "Wiki", label: "Canlı madde akışı" },
      ]
    : [];
  const topicImageTitles = allTopics.map(knowledgeTopicWikiTitle);
  const topicImages = useWikiTopicImages(topicImageTitles, category?.image);

  useEffect(() => {
    if (!category) return;
    applySocialShareMeta({
      title: `${category.title} - Bilgi Ağacı`,
      descriptionPrimary: category.desc,
      canonicalPath: knowledgeCategoryHref(ansiklopediBase, category),
      imageUrl: category.image,
    });
    applyCollectionPageStructuredData({
      name: `${category.title} - Bilgi Ağacı`,
      description: category.desc,
      canonicalPath: knowledgeCategoryHref(ansiklopediBase, category),
      items: category.examples.map((topic) => ({
        name: knowledgeTopicLabel(topic),
        path: topicHref(ansiklopediBase, topic),
        description: `${category.title} kategorisinde ${knowledgeTopicLabel(topic)} maddesi`,
      })),
    });
    return () => resetSeoToSiteDefaults();
  }, [category, ansiklopediBase]);

  if (!category) {
    return (
      <BilgiAgaciShell>
        <main className="bilgi-category-empty">
          <div className="bilgi-agaci-panel">
            <p className="text-sm font-black uppercase tracking-widest text-emerald-700">Kategori bulunamadı</p>
            <h1>Bu Bilgi Ağacı kategorisi yayında değil.</h1>
            <Link href={ansiklopediBase} className="bilgi-category-primary-link">
              Kategorilere dön
            </Link>
          </div>
        </main>
      </BilgiAgaciShell>
    );
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const q = String(data.get("q") ?? "").trim();
    if (!q) return;
    navigate(articleHref(ansiklopediBase, q));
  }

  return (
    <BilgiAgaciShell>
      <main className={`bilgi-category-page${hmEmbedded ? " bilgi-category-page--hm" : ""}`}>
        {!hmEmbedded ? (
          <>
            <section className="bilgi-category-hero" style={{ ["--ba-category-gradient" as string]: category.gradient }}>
              <div className="bilgi-category-hero__media">
                <img src={category.image} alt="" loading="eager" />
              </div>
              <div className="bilgi-category-hero__content">
                <div className="bilgi-category-hero__layout">
                  <div className="bilgi-category-hero__copy">
                    <Link href={ansiklopediBase} className="bilgi-category-hero__back">
                      Bilgi Ağacı
                    </Link>
                    <span className="bilgi-category-hero__script">Özenle hazırlanmış keşif</span>
                    <h1>{category.title}</h1>
                    <p>{category.desc} Büyük görseller, hızlı başlık geçişleri ve canlı Wiki maddeleriyle kategori vitrinini keşfedin.</p>
                    <form onSubmit={handleSearchSubmit} className="bilgi-category-search">
                      <Search className="h-5 w-5" aria-hidden />
                      <input name="q" placeholder={`${category.title} içinde madde ara`} />
                      <button type="submit">Ara</button>
                    </form>
                    <div className="bilgi-category-hero__stats" aria-label={`${category.title} kategori özeti`}>
                      {heroStats.map((stat) => (
                        <span key={stat.label}>
                          <strong>{stat.value}</strong>
                          {stat.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <aside className="bilgi-category-hero__spotlight" aria-label="Öne çıkan başlıklar">
                    <div className="bilgi-category-hero__spotlight-image">
                      <img src={(spotlightTopic ? topicImages[knowledgeTopicWikiTitle(spotlightTopic)] : "") || category.image} alt="" loading="eager" />
                    </div>
                    <div className="bilgi-category-hero__spotlight-body">
                      <span>{category.icon} Editör seçkisi</span>
                      <h2>{spotlightTopic ? knowledgeTopicLabel(spotlightTopic) : category.title}</h2>
                      <div>
                        {heroTopics.map((topic) => (
                          <Link key={knowledgeTopicWikiTitle(topic)} href={topicHref(ansiklopediBase, topic)}>
                            {knowledgeTopicLabel(topic)}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </aside>
                </div>
              </div>
            </section>

            <section className="bilgi-category-tabs" aria-label="Bilgi Ağacı kategorileri">
              {KNOWLEDGE_CATEGORIES.map((item) => (
                <Link
                  key={item.slug}
                  href={knowledgeCategoryHref(ansiklopediBase, item)}
                  className={item.slug === category.slug ? "active" : ""}
                >
                  <span>{item.icon}</span>
                  {item.title}
                </Link>
              ))}
            </section>
          </>
        ) : null}

        <section className="bilgi-category-section">
          <div className="bilgi-category-showcase">
            <article className="bilgi-category-showcase__lead">
              <span>{category.icon} Premium vitrin</span>
              <h2>{category.title} için derin keşif alanı</h2>
              <p>
                Bu kategori, hızlı madde geçişleriyle görsel rehber hissini birleştirir. Öne çıkan konular büyük kartlarda,
                destekleyici başlıklar ise kompakt ama güçlü bir grid içinde sunulur.
              </p>
            </article>
            {heroTopics.map((topic, index) => (
              <Link key={knowledgeTopicWikiTitle(topic)} href={topicHref(ansiklopediBase, topic)} className="bilgi-category-showcase__tile">
                <img src={topicImages[knowledgeTopicWikiTitle(topic)] || category.image} alt="" loading="eager" />
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{knowledgeTopicLabel(topic)}</strong>
              </Link>
            ))}
          </div>

          <div className="bilgi-agaci-section-head bilgi-category-section-head">
            <p className="eyebrow">Kategori vitrini</p>
            <h2>{category.title} başlıkları</h2>
            <p>Her kart doğrudan ilgili Bilgi Ağacı maddesine gider.</p>
          </div>
          <div className="bilgi-category-topic-grid">
            {allTopics.map((topic, index) => (
              <Link
                key={knowledgeTopicWikiTitle(topic)}
                href={topicHref(ansiklopediBase, topic)}
                className={`bilgi-category-topic-card${index === 0 ? " bilgi-category-topic-card--featured" : ""}`}
              >
                <div className="bilgi-category-topic-card__image">
                  <img
                    src={topicImages[knowledgeTopicWikiTitle(topic)] || category.image}
                    alt={`${knowledgeTopicLabel(topic)} görseli`}
                    loading={index < 3 ? "eager" : "lazy"}
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <div className="bilgi-category-topic-card__body">
                  <p>{category.icon} {category.title}</p>
                  <h3>{knowledgeTopicLabel(topic)}</h3>
                  <span>
                    Makaleyi aç <ChevronRight className="h-4 w-4" aria-hidden />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </BilgiAgaciShell>
  );
}
