import { useCallback, useEffect, useState } from "react";
import { YekpareAiCallLayout } from "./YekpareAiCallLayout";
import { callCenterProxy, proxyErrorMessage } from "@/lib/callCenterProxy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Mail, MessageCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";

type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  isActive?: boolean;
};

type Conversation = {
  id: string;
  contactName?: string;
  contactPhone?: string;
  lastMessagePreview?: string;
  unreadCount?: number;
  status?: string;
};

export default function YekpareAiCallMessaging() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [metaActive, setMetaActive] = useState<boolean | null>(null);
  const [whatswayActive, setWhatswayActive] = useState<boolean | null>(null);
  const [templateForm, setTemplateForm] = useState({ name: "", subject: "", htmlBody: "" });
  const [testEmailById, setTestEmailById] = useState<Record<string, string>>({});
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tplRes, convRes, metaRes, whatRes] = await Promise.all([
        callCenterProxy<{ success?: boolean; data?: EmailTemplate[] }>("messaging/email-templates"),
        callCenterProxy<{ conversations?: Conversation[] }>("messaging/conversations?limit=30"),
        callCenterProxy<{ settings?: { isActive?: boolean } }>("messaging/meta-whatsapp/settings"),
        callCenterProxy<{ settings?: { isActive?: boolean } }>("messaging/whatsway/settings"),
      ]);

      if (tplRes.ok) {
        const d = (tplRes.data as { data?: EmailTemplate[] }).data;
        setTemplates(Array.isArray(d) ? d : []);
      }
      if (convRes.ok) {
        const c = convRes.data as { conversations?: Conversation[] };
        setConversations(c.conversations ?? []);
      }
      if (!tplRes.ok && !convRes.ok) setError(proxyErrorMessage(tplRes.data));

      if (metaRes.ok) setMetaActive(Boolean((metaRes.data as { settings?: { isActive?: boolean } }).settings?.isActive));
      if (whatRes.ok) setWhatswayActive(Boolean((whatRes.data as { settings?: { isActive?: boolean } }).settings?.isActive));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTemplate() {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.htmlBody.trim()) {
      setError("Şablon adı, konu ve HTML gövde zorunlu.");
      return;
    }
    setActionBusy("create-template");
    setError(null);
    setOkMessage(null);
    try {
      const res = await callCenterProxy("messaging/email-templates", {
        method: "POST",
        body: JSON.stringify({
          name: templateForm.name.trim(),
          subject: templateForm.subject.trim(),
          htmlBody: templateForm.htmlBody,
          variables: [],
        }),
      });
      if (!res.ok) throw new Error(proxyErrorMessage(res.data, "Şablon oluşturulamadı"));
      setTemplateForm({ name: "", subject: "", htmlBody: "" });
      setOkMessage("E-posta şablonu oluşturuldu.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Şablon oluşturulamadı");
    } finally {
      setActionBusy(null);
    }
  }

  async function sendTemplateTest(templateId: string) {
    const recipientEmail = (testEmailById[templateId] ?? "").trim();
    if (!recipientEmail) {
      setError("Test e-postası için alıcı adresi girin.");
      return;
    }
    setActionBusy(`test-${templateId}`);
    setError(null);
    setOkMessage(null);
    try {
      const res = await callCenterProxy(`messaging/email-templates/${encodeURIComponent(templateId)}/test`, {
        method: "POST",
        body: JSON.stringify({ recipientEmail, variables: {} }),
      });
      if (!res.ok) throw new Error(proxyErrorMessage(res.data, "Test e-postası gönderilemedi"));
      setOkMessage("Test e-postası gönderildi.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Test e-postası gönderilemedi");
    } finally {
      setActionBusy(null);
    }
  }

  return (
    <YekpareAiCallLayout title="Mesajlaşma">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600 max-w-2xl">
          Arama sonrası e-posta ve WhatsApp mesajları. Meta veya WhatsWay bağlantısı Yekpare AI Call sunucusunda
          yapılandırılır; buradan şablon ve konuşmaları yönetirsiniz.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className="w-4 h-4 mr-1" />
          Yenile
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {okMessage ? (
        <Alert className="mt-4 border-emerald-200 bg-emerald-50 text-emerald-900">
          <AlertDescription>{okMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant={metaActive ? "default" : "secondary"}>Meta WhatsApp: {metaActive ? "aktif" : "kapalı"}</Badge>
        <Badge variant={whatswayActive ? "default" : "secondary"}>WhatsWay: {whatswayActive ? "aktif" : "kapalı"}</Badge>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <Tabs defaultValue="email" className="mt-4">
          <TabsList>
            <TabsTrigger value="email" className="gap-1">
              <Mail className="w-4 h-4" />
              E-posta şablonları
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1">
              <MessageCircle className="w-4 h-4" />
              WhatsApp gelen kutusu
            </TabsTrigger>
          </TabsList>
          <TabsContent value="email" className="mt-4">
            <div className="mb-4 rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-900">Yeni e-posta şablonu</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label>Ad</Label>
                  <Input
                    value={templateForm.name}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Randevu onayı"
                  />
                </div>
                <div>
                  <Label>Konu</Label>
                  <Input
                    value={templateForm.subject}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, subject: e.target.value }))}
                    placeholder="Randevunuz onaylandı"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>HTML gövde</Label>
                  <Textarea
                    value={templateForm.htmlBody}
                    onChange={(e) => setTemplateForm((p) => ({ ...p, htmlBody: e.target.value }))}
                    rows={5}
                    placeholder="<p>Merhaba {{name}}, ...</p>"
                  />
                </div>
              </div>
              <Button className="mt-3" type="button" onClick={() => void createTemplate()} disabled={actionBusy === "create-template"}>
                {actionBusy === "create-template" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Şablon oluştur
              </Button>
            </div>
            <div className="rounded-xl border bg-white divide-y">
              {templates.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">Şablon bulunamadı.</p>
              ) : (
                templates.map((t) => (
                  <div key={t.id} className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.subject}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {t.isActive === false ? <Badge variant="secondary">pasif</Badge> : null}
                      <Input
                        className="h-9 w-56"
                        type="email"
                        placeholder="test@ornek.com"
                        value={testEmailById[t.id] ?? ""}
                        onChange={(e) => setTestEmailById((p) => ({ ...p, [t.id]: e.target.value }))}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void sendTemplateTest(t.id)}
                        disabled={actionBusy === `test-${t.id}`}
                      >
                        {actionBusy === `test-${t.id}` ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                        Test gönder
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          <TabsContent value="whatsapp" className="mt-4">
            <div className="rounded-xl border bg-white divide-y max-h-[480px] overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="p-6 text-sm text-gray-500 text-center">Açık konuşma yok.</p>
              ) : (
                conversations.map((c) => (
                  <div key={c.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between">
                      <p className="font-medium">{c.contactName ?? c.contactPhone ?? "İsimsiz"}</p>
                      {(c.unreadCount ?? 0) > 0 ? (
                        <Badge className="bg-[#e61e25]">{c.unreadCount}</Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{c.lastMessagePreview}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </YekpareAiCallLayout>
  );
}
