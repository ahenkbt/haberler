import { useCallback, useEffect, useRef, useState } from "react";
import { apiUrl } from "@/lib/apiBase";
import { formatPublicLocationLabel, readPublicLocation } from "@/lib/publicLocation";

export type ChatLink = { label: string; href: string };

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  links?: ChatLink[];
};

type HistoryTurn = { role: "user" | "assistant"; text: string };

type LocationContextPayload = {
  city?: string;
  district?: string;
  label?: string;
};

const GREETING_RE = /^(merhaba|selam|slm|günaydın|iyi günler|iyi akşamlar|hey|hello|hi)\b/i;
const OFF_TOPIC_RE =
  /\b(hava durumu|siyaset|futbol|bitcoin|borsa|ilaç|doktor|ödev|python|matematik|kimdir|tarif|flört|tavsiye)\b/i;

function isGreeting(text: string): boolean {
  return GREETING_RE.test(text.trim());
}

function isLikelyOffTopic(text: string): boolean {
  const q = text.trim().toLowerCase();
  if (!q || isGreeting(q)) return false;
  if (/yekpare|sipariş|market|yemek|turizm|harita|haber|ansiklopedi|mağaza|destek|gözleme|ankara|istanbul/.test(q))
    return false;
  return OFF_TOPIC_RE.test(q) || (q.length >= 30 && /(nedir|nasıl|kim|açıkla|yaz)/.test(q));
}

function readLocationPayload(): LocationContextPayload | undefined {
  const loc = readPublicLocation();
  if (!loc) return undefined;
  return {
    city: loc.city || undefined,
    district: loc.district || undefined,
    label: formatPublicLocationLabel(loc),
  };
}

function normalizeTr(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c");
}

function localIntentFallback(
  message: string,
  pagePath: string,
  location?: LocationContextPayload,
): { reply: string; links: ChatLink[] } | null {
  const q = normalizeTr(message);
  const cityFromMsg = /\bankara\b/.test(q)
    ? "Ankara"
    : /\bistanbul\b/.test(q)
      ? "İstanbul"
      : /\bizmir\b/.test(q)
        ? "İzmir"
        : location?.city || null;

  if (/gozleme|gozlemeci/.test(q)) {
    const city = cityFromMsg;
    return {
      reply: city
        ? `${city}'da gözleme arayabilirsiniz. Tam eşleşme olmasa bile yakındaki pide ve restoran alternatiflerine de bakabilirsiniz — hangi ilçede arıyorsunuz?`
        : "Gözleme araması yapabilirim. Hangi şehir veya ilçedesiniz? Header'dan konum seçerseniz size göre de filtreleyebilirim.",
      links: city
        ? [
            { label: `${city}'da gözleme`, href: `/kesfet?q=${encodeURIComponent("gözleme")}&city=${encodeURIComponent(city)}` },
            { label: "Yemek siparişi", href: `/yemek?sehir=${encodeURIComponent(city)}` },
            { label: "Pide restoranları", href: `/kesfet?q=pide&city=${encodeURIComponent(city)}` },
          ]
        : [
            { label: "Gözleme ara", href: `/kesfet?q=${encodeURIComponent("gözleme")}` },
            { label: "Yemek", href: "/yemek" },
          ],
    };
  }

  if (/siparis takip|siparisim nerede|takip kodu/.test(q)) {
    return {
      reply: "Sipariş numaranız veya takip kodunuz varsa Sipariş takip sayfasından sorgulayabilirsiniz.",
      links: [
        { label: "Sipariş takip", href: "/siparis-takip" },
        { label: "Siparişlerim", href: "/siparislerim" },
      ],
    };
  }

  if (/uyelik|kayit|giris yap|uye ol/.test(q)) {
    return {
      reply: "Müşteri siparişleri için ayrı şifre gerekmez; geçmiş siparişler telefonla görüntülenir. İşletme hesabı için başvuru ve giriş sayfalarına yönlendirebilirim.",
      links: [
        { label: "Siparişlerim", href: "/siparislerim" },
        { label: "İşletme girişi", href: "/isletme-giris" },
        { label: "İşletme başvuru", href: "/isletme-basvuru" },
      ],
    };
  }

  if (/satici|isletme basvuru|isletme kayit/.test(q)) {
    return {
      reply: "Restoran/market veya e-ticaret satıcısı olarak katılabilirsiniz. Hangi model size uygun?",
      links: [
        { label: "İşletme başvuru", href: "/isletme-basvuru" },
        { label: "Mağaza satıcı ol", href: "/magaza/satici-ol" },
      ],
    };
  }

  if (cityFromMsg && /var\s*mi|var\s*mı|restoran|isletme/.test(q)) {
    return {
      reply: `${cityFromMsg} için Keşfet ve Yemek bölümlerinde işletmelere bakabilirsiniz. Ne tür bir yer arıyorsunuz?`,
      links: [
        { label: `${cityFromMsg} Keşfet`, href: `/kesfet?city=${encodeURIComponent(cityFromMsg)}` },
        { label: "Yemek", href: `/yemek?sehir=${encodeURIComponent(cityFromMsg)}` },
      ],
    };
  }

  const pathHint = pagePath && pagePath !== "/" ? ` Şu an ${pagePath} sayfasındasınız.` : "";
  if (pathHint && location?.label) {
    return {
      reply: `Konumunuza göre (${location.label}) yardımcı olabilirim.${pathHint} Ne aradığınızı biraz daha açar mısınız?`,
      links: [
        { label: "Keşfet", href: location.city ? `/kesfet?city=${encodeURIComponent(location.city)}` : "/kesfet" },
        { label: "Yemek", href: location.city ? `/yemek?sehir=${encodeURIComponent(location.city)}` : "/yemek" },
      ],
    };
  }

  return null;
}

function localFallback(
  message: string,
  pagePath: string,
  location?: LocationContextPayload,
): { reply: string; links: ChatLink[] } {
  if (isGreeting(message)) {
    const locNote = location?.label ? ` Konumunuz: ${location.label}.` : "";
    return {
      reply: `Merhaba! Ben Yekpare AI.${locNote} yekpare.net üzerinde yemek, alışveriş, seyahat, sipariş takibi ve işletme başvurusu konularında yardımcı olabilirim. Size nasıl yardımcı olayım?`,
      links: [],
    };
  }
  if (isLikelyOffTopic(message)) {
    return {
      reply:
        "Bu konuda yardımcı olamam; yalnızca yekpare.net hizmetleriyle ilgileniyorum. Sipariş, alışveriş, seyahat veya destek konularında yardımcı olabilirim.",
      links: [
        { label: "Yemek", href: "/yemek" },
        { label: "Sipariş takip", href: "/siparis-takip" },
        { label: "Destek", href: "/destek" },
      ],
    };
  }

  const intent = localIntentFallback(message, pagePath, location);
  if (intent) return intent;

  const q = message.toLowerCase();
  const chips = [
    { label: "Yemek", query: "Yemek siparişi nasıl verilir?", href: "/yemek" },
    { label: "Alışveriş", query: "Alışveriş ve mağaza nerede?", href: "/magaza" },
    { label: "Seyahat", query: "Seyahat ve tur rezervasyonu", href: "/turizm" },
    { label: "Haritalar", query: "Haritalar nerede?", href: "/haritalar" },
    { label: "Sipariş takip", query: "Siparişimi nasıl takip ederim?", href: "/siparis-takip" },
    { label: "Bilgi Ağacı", query: "Bilgi ağacı nedir?", href: "/bilgiagaci" },
  ].filter(
    (c) => q.includes(c.label.toLowerCase()) || q.includes(c.query.toLowerCase().slice(0, 12)),
  );
  if (chips.length > 0) {
    const first = chips[0];
    return {
      reply: `${first.label} bölümü için ${first.href} sayfasına bakabilirsiniz.`,
      links: chips.slice(0, 3).map((c) => ({ label: c.label, href: c.href })),
    };
  }

  const pathHint = pagePath && pagePath !== "/" ? ` Şu an ${pagePath} sayfasındasınız.` : "";
  const locHint = location?.label ? ` Kayıtlı konum: ${location.label}.` : "";
  return {
    reply: `Şu an sunucuya ulaşamıyorum.${locHint}${pathHint} Sorunuzu tekrar deneyebilir veya aşağıdaki kısayollardan birini seçebilirsiniz.`,
    links: [
      { label: "Yemek", href: location?.city ? `/yemek?sehir=${encodeURIComponent(location.city)}` : "/yemek" },
      { label: "Keşfet", href: location?.city ? `/kesfet?city=${encodeURIComponent(location.city)}` : "/kesfet" },
      { label: "Destek", href: "/destek" },
    ],
  };
}

function sanitizeLinks(raw: unknown): ChatLink[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatLink[] = [];
  for (const item of raw.slice(0, 4)) {
    if (!item || typeof item !== "object") continue;
    const label = String((item as ChatLink).label ?? "").trim();
    const href = String((item as ChatLink).href ?? "").trim();
    if (!label || !href.startsWith("/") || href.includes("://")) continue;
    if (out.some((l) => l.href === href)) continue;
    out.push({ label, href });
  }
  return out.slice(0, 3);
}

async function postYekpareAiChat(
  message: string,
  pagePath: string,
  history: HistoryTurn[],
  locationContext?: LocationContextPayload,
): Promise<{ reply: string; links: ChatLink[] }> {
  const res = await fetch(apiUrl("/api/yekpare-ai/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ message, pagePath, history, locationContext }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    reply?: string;
    links?: ChatLink[];
    error?: string;
  };
  const reply = String(data.reply ?? "").trim();
  if (reply) {
    return { reply, links: sanitizeLinks(data.links) };
  }
  throw new Error(data.error || `HTTP ${res.status}`);
}

function buildWelcomeMessage(): ChatMessage {
  const loc = readPublicLocation();
  const locNote = loc ? ` Konumunuza göre de yardımcı olabilirim (${formatPublicLocationLabel(loc)}).` : "";
  return {
    id: "welcome",
    role: "assistant",
    text: `Merhaba! Ben Yekpare AI.${locNote} yekpare.net üzerinde arama, yemek, alışveriş, seyahat, sipariş takibi ve işletme başvurusu konularında size yardımcı olabilirim.`,
  };
}

export function useYekpareAiSession(pathNoQuery: string) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedLocationLabel, setSavedLocationLabel] = useState<string | null>(() => {
    const loc = readPublicLocation();
    return loc ? formatPublicLocationLabel(loc) : null;
  });
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildWelcomeMessage()]);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onLocUpdate = () => {
      const loc = readPublicLocation();
      setSavedLocationLabel(loc ? formatPublicLocationLabel(loc) : null);
    };
    window.addEventListener("yekpare:public-location-updated", onLocUpdate);
    return () => window.removeEventListener("yekpare:public-location-updated", onLocUpdate);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      const history: HistoryTurn[] = messages
        .filter((m) => m.id !== "welcome")
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.text }));

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        text: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);

      const locationContext = readLocationPayload();

      try {
        const out = await postYekpareAiChat(trimmed, pathNoQuery, history, locationContext);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: out.reply,
            links: out.links.length > 0 ? out.links : undefined,
          },
        ]);
      } catch {
        const fb = localFallback(trimmed, pathNoQuery, locationContext);
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "assistant",
            text: fb.reply,
            links: fb.links.length > 0 ? fb.links : undefined,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, pathNoQuery],
  );

  return {
    input,
    setInput,
    loading,
    savedLocationLabel,
    messages,
    listRef,
    inputRef,
    sendMessage,
  };
}
