import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EditorHmHtmlField } from "@/components/EditorHmHtmlField";
import { useHmEditor } from "@/contexts/HmEditorContext";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/apiBase";
import { HM_SITE_PUBLIC_PREFIX } from "@/lib/hmSitePublicPath";
import { readHmJwt } from "@/lib/hmSession";
import type { HmYsKunye, NewsSiteLayoutPrefs } from "@/lib/newsSiteLayout";
import {
  YS_KUNYE_FIELDS,
  buildYsAboutPagePatch,
  buildYsCorporatePageHtmlPatch,
  buildYsKunyePagePatch,
  readYsKunye,
} from "@/lib/yenisafakEditorLayout";

type ContactDraft = { phone: string; email: string; address: string };

function readContact(raw: unknown): ContactDraft {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return {
    phone: typeof source.phone === "string" ? source.phone : "",
    email: typeof source.email === "string" ? source.email : "",
    address: typeof source.address === "string" ? source.address : "",
  };
}

export function EditorYenisafakSayfalar() {
  const { site, newsLayoutPrefs, saveNewsSiteLayout } = useHmEditor();
  const { toast } = useToast();
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [aboutHtml, setAboutHtml] = useState(newsLayoutPrefs.hmFooterAboutHtml ?? "");
  const [kunye, setKunye] = useState<HmYsKunye>(() => readYsKunye(newsLayoutPrefs));
  const [kunyeHtml, setKunyeHtml] = useState(newsLayoutPrefs.hmCorporatePageHtml?.kunye ?? "");
  const [contactHtml, setContactHtml] = useState(newsLayoutPrefs.hmCorporatePageHtml?.iletisim ?? "");
  const [contact, setContact] = useState<ContactDraft>({ phone: "", email: "", address: "" });

  const hmBase = site?.slug ? `/${HM_SITE_PUBLIC_PREFIX}/${encodeURIComponent(site.slug)}` : "";
  const pageHref = (path: string) => (hmBase ? `${hmBase}${path}` : path);

  useEffect(() => {
    setAboutHtml(newsLayoutPrefs.hmFooterAboutHtml ?? "");
    setKunye(readYsKunye(newsLayoutPrefs));
    setKunyeHtml(newsLayoutPrefs.hmCorporatePageHtml?.kunye ?? "");
    setContactHtml(newsLayoutPrefs.hmCorporatePageHtml?.iletisim ?? "");
  }, [
    newsLayoutPrefs.hmFooterAboutHtml,
    newsLayoutPrefs.hmYsKunye,
    newsLayoutPrefs.hmCorporatePageHtml,
  ]);

  useEffect(() => {
    const token = readHmJwt();
    if (!token || !site?.id) return;
    let cancelled = false;
    void fetch(apiUrl("/api/hm/editor/me"), {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: { site?: { contactJson?: unknown } } | null) => {
        if (cancelled || !payload?.site) return;
        const raw = payload.site.contactJson;
        try {
          const parsed = typeof raw === "string" && raw.trim() ? JSON.parse(raw) : raw;
          setContact(readContact(parsed));
        } catch {
          setContact(readContact(null));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [site?.id]);

  const saveLayout = async (key: string, patch: Partial<NewsSiteLayoutPrefs>, allowClearCorporatePageHtml = false) => {
    setSavingKey(key);
    const result = await saveNewsSiteLayout(newsLayoutPrefs, {
      layoutPatch: patch,
      allowClearCorporatePageHtml,
    });
    setSavingKey(null);
    if (!result.ok) {
      toast({ title: "Kaydedilemedi", description: result.error.slice(0, 200), variant: "destructive" });
      return;
    }
    toast({ title: "Kaydedildi" });
  };

  const saveContact = async () => {
    const token = readHmJwt();
    if (!token) {
      toast({ title: "Oturum yok", variant: "destructive" });
      return;
    }
    setSavingKey("iletisim-contact");
    try {
      const res = await fetch(apiUrl("/api/hm/editor/site-contact"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(contact),
      });
      const text = await res.text();
      if (!res.ok) {
        let message = text.slice(0, 200);
        try {
          message = String((JSON.parse(text) as { error?: string }).error ?? message);
        } catch {
          /* keep text */
        }
        toast({ title: "İletişim kaydedilemedi", description: message, variant: "destructive" });
        return;
      }
      toast({ title: "İletişim kaydedildi" });
    } catch (error) {
      toast({
        title: "İletişim kaydedilemedi",
        description: error instanceof Error ? error.message : "Ağ hatası",
        variant: "destructive",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const previewSite = site ? { id: site.id, slug: site.slug, domain: site.domain ?? null } : undefined;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        Yenişafak sitesinde yayındaki sayfalar. Hakkımızda, künye ve iletişim buradan düzenlenir. Telif şablonu bu
        listenin yerine geçmez.
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900">Hakkımızda</h2>
          <p className="mt-1 text-xs text-slate-500">
            Adres: <code>{pageHref("/hakkimizda")}</code>. Boş bırakılırsa sitede site açıklaması görünür.
          </p>
        </div>
        <EditorHmHtmlField
          idPrefix="ys-page-hakkimizda"
          label="Sayfa içeriği"
          value={aboutHtml}
          onChange={setAboutHtml}
          disabled={savingKey != null}
          minHeightClass="min-h-[180px]"
          previewSite={previewSite}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-slate-900 text-white"
            disabled={savingKey != null}
            onClick={() => void saveLayout("hakkimizda", buildYsAboutPagePatch(aboutHtml))}
          >
            {savingKey === "hakkimizda" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Hakkımızda kaydet
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900">Künye</h2>
          <p className="mt-1 text-xs text-slate-500">
            Adres: <code>{pageHref("/kunye")}</code>. Dolu alanlar sitedeki künyenin yerine geçer. Hepsi boşsa tema
            kendi metnini, o da yoksa alttaki HTML’i kullanır.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {YS_KUNYE_FIELDS.map((field) => (
            <div key={field.key} className={field.multiline ? "sm:col-span-2" : ""}>
              <Label className="text-xs">{field.label}</Label>
              {field.multiline ? (
                <Textarea
                  className="mt-1"
                  value={kunye[field.key] ?? ""}
                  disabled={savingKey != null}
                  onChange={(event) => setKunye((prev) => ({ ...prev, [field.key]: event.target.value }))}
                />
              ) : (
                <Input
                  className="mt-1"
                  value={kunye[field.key] ?? ""}
                  disabled={savingKey != null}
                  onChange={(event) => setKunye((prev) => ({ ...prev, [field.key]: event.target.value }))}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            className="bg-slate-900 text-white"
            disabled={savingKey != null}
            onClick={() => void saveLayout("kunye", buildYsKunyePagePatch(kunye))}
          >
            {savingKey === "kunye" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Künye kaydet
          </Button>
        </div>
        <EditorHmHtmlField
          idPrefix="ys-page-kunye-html"
          label="Künye HTML (yapısal künye boşken)"
          value={kunyeHtml}
          onChange={setKunyeHtml}
          disabled={savingKey != null}
          minHeightClass="min-h-[140px]"
          previewSite={previewSite}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={savingKey != null}
            onClick={() => {
              const patch = buildYsCorporatePageHtmlPatch(newsLayoutPrefs.hmCorporatePageHtml, "kunye", kunyeHtml);
              void saveLayout("kunye-html", patch, patch.hmCorporatePageHtml == null);
            }}
          >
            {savingKey === "kunye-html" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Künye HTML kaydet
          </Button>
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-sm font-black text-slate-900">İletişim</h2>
          <p className="mt-1 text-xs text-slate-500">
            Adres: <code>{pageHref("/iletisim")}</code>. HTML doluysa o basılır. Boşsa telefon, e-posta ve adres
            listelenir.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Telefon</Label>
            <Input
              className="mt-1"
              value={contact.phone}
              disabled={savingKey != null}
              onChange={(event) => setContact((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">E-posta</Label>
            <Input
              className="mt-1"
              value={contact.email}
              disabled={savingKey != null}
              onChange={(event) => setContact((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Adres</Label>
            <Textarea
              className="mt-1"
              value={contact.address}
              disabled={savingKey != null}
              onChange={(event) => setContact((prev) => ({ ...prev, address: event.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="button" size="sm" className="bg-slate-900 text-white" disabled={savingKey != null} onClick={() => void saveContact()}>
            {savingKey === "iletisim-contact" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            İletişim bilgilerini kaydet
          </Button>
        </div>
        <EditorHmHtmlField
          idPrefix="ys-page-iletisim-html"
          label="İletişim HTML (doluysa listedeki bilgilerin yerine geçer)"
          value={contactHtml}
          onChange={setContactHtml}
          disabled={savingKey != null}
          minHeightClass="min-h-[140px]"
          previewSite={previewSite}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={savingKey != null}
            onClick={() => {
              const patch = buildYsCorporatePageHtmlPatch(newsLayoutPrefs.hmCorporatePageHtml, "iletisim", contactHtml);
              void saveLayout("iletisim-html", patch, patch.hmCorporatePageHtml == null);
            }}
          >
            {savingKey === "iletisim-html" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            İletişim HTML kaydet
          </Button>
        </div>
      </section>
    </div>
  );
}
