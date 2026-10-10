import { useState } from "react";
import { Link } from "wouter";
import { MessageCircle } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiBase";
import { useToast } from "@/hooks/use-toast";

type PlanAction = {
  action: string;
  label: string;
  state: "ready" | "soon";
  summary: string;
  site?: { domain?: string } | null;
  sites?: Array<{ domain: string; effect: string }>;
  target?: { title?: string; refId?: number } | null;
  blockedReason?: string | null;
  coercedFrom?: string | null;
  preview?: Record<string, unknown>;
};

type Plan = {
  planId?: number | null;
  note?: string;
  via?: string;
  provider?: string | null;
  model?: string | null;
  confirmAllowed?: boolean;
  actions?: PlanAction[];
  warning?: string | null;
  talk?: boolean;
};

type Turn = { role: "user" | "assistant"; content: string };

const EXAMPLES = [
  "123 numaralı haberi vatanhaber.com sitesinden gizle",
  "55 numaralı haberi yesilvatan.gen.tr sitesine de ekle",
  "123 numaralı haberin başlığını şöyle değiştir: Yeni başlık",
  "vatanhaber.com künye metnini güncelle: İmtiyaz sahibi satırı",
];

const PROVIDER: Record<string, string> = {
  evren: "Evren",
  evren2: "Evren yedek",
  nvidia: "NVIDIA",
  gemini: "Gemini",
  openai: "OpenAI",
};

export default function HaberEditoruSohbet() {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState<"plan" | "apply" | null>(null);
  const [undoId, setUndoId] = useState("");

  async function send() {
    const message = text.trim();
    if (message.length < 2 || busy) return;
    setBusy("plan");
    setPlan(null);
    const history = turns.slice(-6);
    setTurns((cur) => [...cur, { role: "user", content: message }]);
    setText("");
    try {
      const res = await apiFetch("/api/hm/admin/ai-editor-chat/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history }),
      });
      const data = (await res.json().catch(() => ({}))) as Plan & { error?: string };
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPlan(data);
      const who = data.provider ? PROVIDER[data.provider] || data.provider : data.via === "heuristic" ? "yerel yorum" : "asistan";
      setTurns((cur) => [...cur, { role: "assistant", content: `${data.note || "Plan hazır."}${data.talk ? "" : ` (${who})`}` }]);
    } catch (err) {
      toast({ title: "Plan alınamadı", description: String(err).slice(0, 180), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (!plan?.planId || !plan.confirmAllowed || busy) return;
    setBusy("apply");
    try {
      const res = await apiFetch("/api/hm/admin/ai-editor-chat/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: plan.planId, confirm: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      const lines = Array.isArray(data.results) ? data.results.map((r: { summary?: string }) => r.summary).filter(Boolean) : [];
      setTurns((cur) => [...cur, { role: "assistant", content: lines.join("\n") || "Uygulandı." }]);
      setPlan(null);
      toast({ title: "Plan uygulandı" });
    } catch (err) {
      toast({ title: "Uygulanamadı", description: String(err).slice(0, 180), variant: "destructive" });
    } finally {
      setBusy(null);
    }
  }

  async function undo() {
    const id = Number(undoId);
    if (!Number.isInteger(id) || id <= 0) return;
    try {
      const res = await apiFetch("/api/hm/admin/ai-editor-chat/undo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `HTTP ${res.status}`);
      toast({ title: "Geri alındı", description: `#${id}` });
      setUndoId("");
    } catch (err) {
      toast({ title: "Geri alınamadı", description: String(err).slice(0, 180), variant: "destructive" });
    }
  }

  return (
    <AdminLayout title="Haber Editörü Sohbet">
      <div className="space-y-4 max-w-3xl">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-[#0B2A5B]" />
            Haber Editörü Sohbet
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Komut önce bir eylem planına çevrilir. Hiçbir değişiklik, siz onaylamadan uygulanmaz. Haber silinmez;
            siteden gizlenir.
          </p>
          <p className="mt-2 text-sm">
            <Link href="/admin/ai-editor-durum" className="text-[#e61e25] underline font-semibold">Durum raporu</Link>
            {" · "}
            <Link href="/admin/ai-icerik-robotu" className="text-[#e61e25] underline font-semibold">AI Haber Editörü</Link>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 space-y-3 min-h-[180px]">
          {turns.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Örnek komutlar (kutuya yazar, kendiniz gönderirsiniz):</p>
              <div className="flex flex-col gap-2">
                {EXAMPLES.map((example) => (
                  <button key={example} type="button" className="text-left text-sm rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50" onClick={() => setText(example)}>
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : turns.map((turn, i) => (
            <div key={`${turn.role}-${i}`} className={`max-w-[95%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap ${turn.role === "user" ? "ml-auto bg-[#0B2A5B] text-white" : "bg-slate-100 text-gray-900"}`}>
              {turn.content}
            </div>
          ))}
        </div>

        {plan && !plan.talk && (
          <div className="rounded-2xl border-2 border-[#0B2A5B] bg-white p-4 space-y-3">
            <h2 className="font-black text-gray-900">Onay bekleyen plan</h2>
            <p className="text-sm text-gray-600">{plan.note}{plan.provider ? ` · ${PROVIDER[plan.provider] || plan.provider}` : ""}{plan.via === "heuristic" ? " · model yanıtı yok, komut yerelde yorumlandı" : ""}</p>
            {(plan.actions || []).map((action, i) => (
              <article key={`${action.action}-${i}`} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="font-semibold">{action.label} <span className={`ml-2 text-xs ${action.state === "soon" ? "text-amber-700" : "text-emerald-700"}`}>{action.state === "soon" ? "yakında" : "hazır"}</span></p>
                <p className="text-gray-700 mt-1">{action.summary}</p>
                {action.blockedReason ? <p className="text-red-700 mt-1">{action.blockedReason}</p> : null}
                {action.coercedFrom ? <p className="text-amber-800 mt-1">Silme istendi; plan gizleme olarak yazıldı.</p> : null}
                {action.sites?.length ? <p className="text-xs text-gray-500 mt-1">{action.sites.map((s) => `${s.domain} (${s.effect})`).join(", ")}</p> : null}
                {action.preview && Object.keys(action.preview).length > 0 ? (
                  <pre className="mt-2 text-xs bg-slate-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">{Object.entries(action.preview).map(([k, v]) => `${k}: ${String(v)}`).join("\n")}</pre>
                ) : null}
              </article>
            ))}
            {plan.warning ? <p className="text-sm text-amber-800">{plan.warning}</p> : null}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" className="w-full sm:w-auto" disabled={!plan.confirmAllowed || busy !== null} onClick={() => void apply()}>
                {busy === "apply" ? "Uygulanıyor…" : "Onayla ve uygula"}
              </Button>
              <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setPlan(null)}>Vazgeç</Button>
            </div>
            {!plan.confirmAllowed ? <p className="text-xs text-gray-500">Eksik veya yakında olan bir plan uygulanmaz.</p> : null}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Doğal dille yazın. Örn: 123 numaralı haberi yesilvatan.gen.tr sitesinden gizle"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button type="button" className="w-full sm:w-auto sm:self-end" disabled={busy !== null || text.trim().length < 2} onClick={() => void send()}>
            {busy === "plan" ? "Planlanıyor…" : "Planı göster"}
          </Button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <h2 className="font-black text-gray-900 text-base">Geri al</h2>
          <p className="text-sm text-gray-600">Durum raporundaki geri alınabilir kayıt numarasını yazın. Haber satırı silinmez.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input value={undoId} onChange={(e) => setUndoId(e.target.value.replace(/\D/g, "").slice(0, 12))} inputMode="numeric" placeholder="Kayıt no" className="w-full sm:w-40 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => void undo()}>Geri al</Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
