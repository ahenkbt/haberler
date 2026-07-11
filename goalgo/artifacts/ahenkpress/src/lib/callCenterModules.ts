/** Yekpare AI Call uygulama modülleri — tanıtım ve gelecek faz yerel paneller. */
export type CallCenterModuleGroup = "genel" | "olustur" | "telefon" | "izleme" | "otomasyon" | "hesap";

export type CallCenterModule = {
  id: string;
  labelTr: string;
  descriptionTr: string;
  path: string;
  group: CallCenterModuleGroup;
};

export const CALL_CENTER_MODULE_GROUPS: Record<CallCenterModuleGroup, string> = {
  genel: "Genel",
  olustur: "Oluştur",
  telefon: "Telefon",
  izleme: "İzleme",
  otomasyon: "Otomasyon",
  hesap: "Hesap",
};

export const CALL_CENTER_MODULES: CallCenterModule[] = [
  {
    id: "dashboard",
    labelTr: "Gösterge paneli",
    descriptionTr: "Özet metrikler ve hızlı işlemler",
    path: "/app",
    group: "genel",
  },
  {
    id: "campaigns",
    labelTr: "Kampanyalar",
    descriptionTr: "Toplu arama kampanyaları",
    path: "/app/campaigns",
    group: "olustur",
  },
  {
    id: "agents",
    labelTr: "AI asistanlar",
    descriptionTr: "Sesli yapay zekâ ajanları",
    path: "/app/agents",
    group: "olustur",
  },
  {
    id: "knowledge-base",
    labelTr: "Bilgi tabanı",
    descriptionTr: "RAG ve dokümanlar",
    path: "/app/knowledge-base",
    group: "olustur",
  },
  {
    id: "flows",
    labelTr: "Akış oluşturucu",
    descriptionTr: "Görsel otomasyon akışları",
    path: "/app/flows",
    group: "otomasyon",
  },
  {
    id: "appointments",
    labelTr: "Randevular",
    descriptionTr: "Takvim ve randevu yönetimi",
    path: "/app/flows/appointments",
    group: "otomasyon",
  },
  {
    id: "forms",
    labelTr: "Formlar",
    descriptionTr: "Arama sonrası veri toplama",
    path: "/app/flows/forms",
    group: "otomasyon",
  },
  {
    id: "webhooks",
    labelTr: "Web kancaları",
    descriptionTr: "Harici sistem entegrasyonu",
    path: "/app/flows/webhooks",
    group: "otomasyon",
  },
  {
    id: "tools",
    labelTr: "Araçlar",
    descriptionTr: "Widget ve yardımcılar",
    path: "/app/tools",
    group: "otomasyon",
  },
  {
    id: "contacts",
    labelTr: "Kişiler",
    descriptionTr: "Tüm kişi listesi",
    path: "/app/contacts",
    group: "telefon",
  },
  {
    id: "phone-numbers",
    labelTr: "Telefon numaraları",
    descriptionTr: "Twilio / Plivo numaraları",
    path: "/app/phone-numbers",
    group: "telefon",
  },
  {
    id: "incoming",
    labelTr: "Gelen bağlantılar",
    descriptionTr: "Gelen arama yönlendirme",
    path: "/app/incoming-connections",
    group: "telefon",
  },
  {
    id: "voices",
    labelTr: "Sesler",
    descriptionTr: "ElevenLabs / OpenAI sesleri",
    path: "/app/voices",
    group: "telefon",
  },
  {
    id: "conversations",
    labelTr: "Konuşmalar",
    descriptionTr: "Mesajlaşma eklentisi (varsa)",
    path: "/app/conversations",
    group: "izleme",
  },
  {
    id: "calls",
    labelTr: "Aramalar",
    descriptionTr: "Çağrı geçmişi ve kayıtlar",
    path: "/app/calls",
    group: "izleme",
  },
  {
    id: "analytics",
    labelTr: "Analitik",
    descriptionTr: "Performans raporları",
    path: "/app/analytics",
    group: "izleme",
  },
  {
    id: "crm",
    labelTr: "Hızlı CRM",
    descriptionTr: "Potansiyel müşteri takibi",
    path: "/app/crm",
    group: "izleme",
  },
  {
    id: "prompt-templates",
    labelTr: "İstem şablonları",
    descriptionTr: "Hazır AI komutları",
    path: "/app/prompt-templates",
    group: "olustur",
  },
  {
    id: "billing",
    labelTr: "Faturalama",
    descriptionTr: "Kredi ve ödeme",
    path: "/app/billing",
    group: "hesap",
  },
  {
    id: "settings",
    labelTr: "Ayarlar",
    descriptionTr: "Hesap ve entegrasyonlar",
    path: "/app/settings",
    group: "hesap",
  },
];

export function callCenterModulesByGroup(): { group: CallCenterModuleGroup; label: string; modules: CallCenterModule[] }[] {
  const order: CallCenterModuleGroup[] = ["genel", "olustur", "telefon", "izleme", "otomasyon", "hesap"];
  return order.map((group) => ({
    group,
    label: CALL_CENTER_MODULE_GROUPS[group],
    modules: CALL_CENTER_MODULES.filter((m) => m.group === group),
  }));
}
