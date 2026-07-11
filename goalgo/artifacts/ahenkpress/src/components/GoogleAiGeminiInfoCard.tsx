import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Lang = "tr" | "en" | "de";

type CopyBlock = {
  title: string;
  blurb: string;
  whatTheyDo: string;
  bullets: string[];
  apis: { name: string; desc: string }[];
  features: { title: string; text: string }[];
  start: { step: string; detail: string }[];
  footerNote: string;
  links: { label: string; href: string }[];
};

const COPY: Record<Lang, CopyBlock> = {
  tr: {
    title: "Google AI & Gemini API — ne işe yarar?",
    blurb:
      "Google AI API’leri; özellikle Gemini API ve üretken yapay zeka modelleri sayesinde uygulamanıza metin, görüntü, video ve kod işleme yetenekleri eklemenizi sağlar. Google AI Studio üzerinden sınırlı ücretsiz katmanda API anahtarı alınabilir; Python, JavaScript/TypeScript, Go gibi diller için resmi SDK’lar vardır.",
    whatTheyDo: "Bu API’ler tipik olarak şunlar için kullanılır:",
    bullets: [
      "Ürün açıklaması, blog, e-posta ve vitrin metinlerini üretmek veya düzenlemek",
      "Sohbet (chat) ve çok adımlı diyaloglar; müşteri destek önerileri, özetleme, sınıflandırma",
      "Kod önerisi, açıklama, hata ayıklama ve küçük refaktörler",
      "Görsel / PDF gibi girdileri anlama (model ve politika kapsamına bağlı)",
    ],
    apis: [
      {
        name: "Gemini API (GenAI SDK’lar)",
        desc: "Gemini 1.5 Pro, Flash vb. modellerle metin üretimi, kodlama yardımı, görsel anlama ve sohbet tabanlı uygulamalar.",
      },
      {
        name: "Google AI Studio",
        desc: "Modelleri denemek, istem (prompt) geliştirmek ve API anahtarlarını yönetmek için tarayıcıdaki temel araç (aistudio.google.com).",
      },
      {
        name: "Google Cloud AI (kurumsal)",
        desc: "Vertex AI (ML ve özel modeller), Vision API (görüntü etiketleme vb.), Natural Language API (yapılandırılmamış metinden anlam çıkarma) gibi bulut hizmetleri.",
      },
    ],
    features: [
      {
        title: "Çok modluluk",
        text: "Metin ve kodun yanı sıra görüntü ve PDF gibi girdiler; modele ve kota politikasına göre çok sayfalı belgeler.",
      },
      {
        title: "Geniş bağlam",
        text: "Büyük bağlam pencereleri ile uzun dokümanlar ve uzun sohbetler üzerinde çalışma (model sürümüne göre değişir).",
      },
      {
        title: "Entegrasyon",
        text: "Firebase, Flutter ve mobil/web istemcileriyle birlikte kullanım senaryoları; üretimde güvenlik ve kota yönetimi önemlidir.",
      },
      {
        title: "Ücretsiz katman",
        text: "AI Studio üzerinden sınırlı ücretsiz kullanım; üretim yükü için fiyatlandırma ve kotaları Google dokümantasyonundan takip edin.",
      },
    ],
    start: [
      { step: "1. Google AI Studio", detail: "aistudio.google.com — Google hesabıyla giriş." },
      { step: "2. API anahtarı", detail: '"Get API key" ile anahtar oluşturun; anahtarı güvenli saklayın, istemciye gömmeeyin.' },
      { step: "3. SDK / REST", detail: "google-generativeai (Python) veya @google/generative-ai (JS/TS) ile hızlı prototip." },
      {
        step: "4. Referans",
        detail: "Güncel endpoint, model adları ve güvenlik için resmi Google AI for Developers dokümantasyonunu kullanın.",
      },
    ],
    footerNote:
      "Yekpare / Goalgo arayüzünde girdiğiniz anahtarlar yalnızca sunucu veya yapılandırdığınız güvenli ortamda kullanılmalıdır; tarayıcı konsolunda veya halka açık repolarda paylaşmayın.",
    links: [
      { label: "Google AI Studio", href: "https://aistudio.google.com/" },
      { label: "Google AI for Developers", href: "https://ai.google.dev/" },
    ],
  },
  en: {
    title: "Google AI & Gemini API — what do they do?",
    blurb:
      "Google AI APIs—especially the Gemini API—let you add multimodal generative capabilities to your app: text, images, video, and code workflows. You can obtain a limited free-tier API key via Google AI Studio; official SDKs exist for Python, JavaScript/TypeScript, Go, and more.",
    whatTheyDo: "Typical use cases include:",
    bullets: [
      "Drafting or polishing product copy, listings, emails, and marketing text",
      "Chat assistants, summarisation, classification, and multi-step dialogues",
      "Code suggestions, explanations, debugging hints, and small refactors",
      "Understanding images or documents where the model and policy allow it",
    ],
    apis: [
      {
        name: "Gemini API (GenAI SDKs)",
        desc: "Models such as Gemini 1.5 Pro / Flash for text generation, coding help, vision understanding, and chat-style apps.",
      },
      {
        name: "Google AI Studio",
        desc: "Browser workspace to try models, iterate on prompts, and manage API keys (aistudio.google.com).",
      },
      {
        name: "Google Cloud AI (enterprise)",
        desc: "Vertex AI, Vision API, Natural Language API, and other cloud-scale ML services beyond the consumer AI Studio flow.",
      },
    ],
    features: [
      {
        title: "Multimodality",
        text: "Combine text and code with images or PDFs—subject to model capabilities and usage policies.",
      },
      {
        title: "Large context",
        text: "Work with long documents or threads using large context windows (varies by model generation).",
      },
      {
        title: "Integration",
        text: "Common stacks include Firebase, Flutter, and web/mobile clients—always secure keys server-side for production.",
      },
      {
        title: "Free tier",
        text: "Limited free usage in AI Studio; check current pricing and quotas for production workloads.",
      },
    ],
    start: [
      { step: "1. Open Google AI Studio", detail: "Sign in at aistudio.google.com." },
      { step: "2. Create an API key", detail: 'Use "Get API key"; never expose production keys in client bundles or public repos.' },
      { step: "3. Use an SDK or REST", detail: "e.g. google-generativeai (Python) or @google/generative-ai (JS/TS) for quick prototypes." },
      { step: "4. Read the docs", detail: "Follow Google AI for Developers for endpoints, model IDs, and safety settings." },
    ],
    footerNote:
      "Keys you enter in Yekpare / Goalgo should only be used from your secured backend or configured environment—do not share them in the browser console or public channels.",
    links: [
      { label: "Google AI Studio", href: "https://aistudio.google.com/" },
      { label: "Google AI for Developers", href: "https://ai.google.dev/" },
    ],
  },
  de: {
    title: "Google AI & Gemini API — wofür sind sie da?",
    blurb:
      "Google-APIs—insbesondere Gemini—ermöglichen multimodale generative Funktionen: Text, Bilder, Video und Code. Über Google AI Studio erhalten Sie einen API-Schlüssel (oft mit kostenlosem Kontingent); offizielle SDKs gibt es u. a. für Python, JavaScript/TypeScript und Go.",
    whatTheyDo: "Typische Einsatzgebiete:",
    bullets: [
      "Produkttexte, Newsletter, SEO-Texte und Shop-Beschreibungen erstellen oder verbessern",
      "Chatbots, Zusammenfassungen, Klassifikation und mehrstufige Dialoge",
      "Code-Vorschläge, Erklärungen, Debugging-Hinweise und kleine Refactorings",
      "Verständnis von Bildern oder Dokumenten, sofern Modell und Richtlinien es erlauben",
    ],
    apis: [
      {
        name: "Gemini API (GenAI SDKs)",
        desc: "Modelle wie Gemini 1.5 Pro / Flash für Text, Coding-Hilfe, Bildverständnis und Chat-Anwendungen.",
      },
      {
        name: "Google AI Studio",
        desc: "Webbasiertes Tool zum Testen von Modellen, Prompt-Design und Schlüsselverwaltung (aistudio.google.com).",
      },
      {
        name: "Google Cloud AI (Enterprise)",
        desc: "Vertex AI, Vision API, Natural Language API u. a. für skalierbare ML- und NLP-Szenarien in der Cloud.",
      },
    ],
    features: [
      {
        title: "Multimodalität",
        text: "Kombination aus Text, Code und Medien wie Bildern oder PDFs—abhängig von Modellfähigkeiten und Richtlinien.",
      },
      {
        title: "Großes Kontextfenster",
        text: "Längere Dokumente und Konversationen verarbeiten (je nach Modellgeneration).",
      },
      {
        title: "Integration",
        text: "Häufig mit Firebase, Flutter oder Web/Mobile; Produktionsschlüssel immer serverseitig schützen.",
      },
      {
        title: "Kostenloses Kontingent",
        text: "Begrenzte Nutzung über AI Studio; für Produktion aktuelle Preise und Kontingente bei Google prüfen.",
      },
    ],
    start: [
      { step: "1. Google AI Studio", detail: "Anmeldung unter aistudio.google.com." },
      { step: "2. API-Schlüssel", detail: '"Get API key" — Schlüssel sicher speichern, nicht in Client-Bundles einbetten.' },
      { step: "3. SDK / REST", detail: "z. B. google-generativeai (Python) oder @google/generative-ai (JS/TS)." },
      { step: "4. Dokumentation", detail: "Aktuelle Endpunkte und Sicherheitshinweise unter Google AI for Developers." },
    ],
    footerNote:
      "Schlüssel in Yekpare / Goalgo nur in gesicherten Serverumgebungen verwenden—nicht in öffentlichen Repos oder der Browser-Konsole teilen.",
    links: [
      { label: "Google AI Studio", href: "https://aistudio.google.com/" },
      { label: "Google AI for Developers", href: "https://ai.google.dev/" },
    ],
  },
};

const LANG_OPTIONS: { value: Lang; label: string }[] = [
  { value: "tr", label: "Türkçe" },
  { value: "en", label: "English" },
  { value: "de", label: "Deutsch" },
];

type Variant = "admin" | "provider";

const shellClass: Record<Variant, string> = {
  admin: "rounded-lg border border-violet-200 bg-gradient-to-br from-violet-50/90 to-white p-4 md:p-5 shadow-sm",
  provider:
    "rounded-xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/50 to-white p-4 shadow-sm",
};

export function GoogleAiGeminiInfoCard({ variant = "admin", className = "" }: { variant?: Variant; className?: string }) {
  const [lang, setLang] = useState<Lang>("tr");
  const [infoOpen, setInfoOpen] = useState(false);
  const c = useMemo(() => COPY[lang], [lang]);
  const labelLang = lang === "tr" ? "Bilgi dili" : lang === "de" ? "Sprache" : "Language";
  const toggleLabel =
    lang === "tr" ? "Google AI bilgilendirmesini göster / gizle" : lang === "de" ? "Info ein-/ausblenden" : "Show / hide Google AI info";

  return (
    <div className={`${shellClass[variant]} ${className}`}>
      <button
        type="button"
        onClick={() => setInfoOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 text-left rounded-lg border border-violet-200/80 bg-white/70 px-3 py-2.5 hover:bg-white transition"
        aria-expanded={infoOpen}
      >
        <span className={`font-bold text-gray-900 flex items-center gap-2 ${variant === "provider" ? "text-xs" : "text-sm"}`}>
          {infoOpen ? <ChevronDown className="w-4 h-4 shrink-0 text-violet-700" /> : <ChevronRight className="w-4 h-4 shrink-0 text-violet-700" />}
          {toggleLabel}
        </span>
      </button>

      {!infoOpen ? null : (
        <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 mt-4">
        <h4 className={`font-bold text-gray-900 ${variant === "provider" ? "text-sm" : "text-base"}`}>{c.title}</h4>
        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor={`gemini-info-lang-${variant}`} className="text-xs font-semibold text-gray-600 whitespace-nowrap">
            {labelLang}
          </label>
          <select
            id={`gemini-info-lang-${variant}`}
            value={lang}
            onChange={(e) => setLang(e.target.value as Lang)}
            className={`rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-400/50 ${
              variant === "provider" ? "min-w-[9.5rem]" : "min-w-[10rem]"
            }`}
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className={`text-gray-700 leading-relaxed ${variant === "provider" ? "text-xs" : "text-sm"}`}>{c.blurb}</p>

      <p className={`mt-4 font-semibold text-gray-900 ${variant === "provider" ? "text-xs" : "text-sm"}`}>{c.whatTheyDo}</p>
      <ul className={`mt-2 list-disc pl-5 space-y-1 text-gray-700 ${variant === "provider" ? "text-xs" : "text-sm"}`}>
        {c.bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>

      <div className="mt-4 grid gap-3 sm:grid-cols-1 md:grid-cols-3">
        {c.apis.map((a) => (
          <div key={a.name} className="rounded-lg border border-gray-200/80 bg-white/80 p-3">
            <p className={`font-bold text-gray-900 ${variant === "provider" ? "text-[11px]" : "text-xs"}`}>{a.name}</p>
            <p className={`mt-1 text-gray-600 ${variant === "provider" ? "text-[11px] leading-snug" : "text-xs leading-relaxed"}`}>{a.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {c.features.map((f) => (
          <div key={f.title} className="rounded-lg bg-white/60 border border-gray-100 px-3 py-2">
            <p className={`font-bold text-gray-800 ${variant === "provider" ? "text-[11px]" : "text-xs"}`}>{f.title}</p>
            <p className={`mt-0.5 text-gray-600 ${variant === "provider" ? "text-[11px]" : "text-xs"}`}>{f.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-3">
        <p className={`font-bold text-amber-950 ${variant === "provider" ? "text-[11px]" : "text-xs"}`}>
          {lang === "tr" ? "Nasıl başlanır?" : lang === "de" ? "Erste Schritte" : "Getting started"}
        </p>
        <ol className={`mt-2 space-y-1.5 list-decimal pl-4 text-gray-800 ${variant === "provider" ? "text-[11px]" : "text-xs"}`}>
          {c.start.map((s) => (
            <li key={s.step}>
              <span className="font-semibold">{s.step}</span> — {s.detail}
            </li>
          ))}
        </ol>
      </div>

      <div className={`mt-3 flex flex-wrap gap-2 ${variant === "provider" ? "text-[11px]" : "text-xs"}`}>
        {c.links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg bg-violet-700 px-3 py-1.5 font-semibold text-white hover:bg-violet-800 transition"
          >
            {l.label} ↗
          </a>
        ))}
      </div>

      <p className={`mt-3 text-gray-600 border-t border-gray-200/80 pt-3 ${variant === "provider" ? "text-[10px] leading-snug" : "text-xs leading-relaxed"}`}>
        {c.footerNote}
      </p>
        </>
      )}
    </div>
  );
}
