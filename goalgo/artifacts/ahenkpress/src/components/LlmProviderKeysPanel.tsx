import { useEffect, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiFetch, apiUrl, ensureAdminPanelBootstrap } from "@/lib/apiBase";
import { hmEditorJson } from "@/lib/hmEditorApi";

type ProviderId = "evren" | "nvidia" | "gemini" | "openai";

type ProviderRow = {
  provider: ProviderId;
  label: string;
  description: string;
  enabled: boolean;
  model: string;
  priority: number;
  hasKey: boolean;
  keyMasked: string;
  usageCount: number;
  apiKeyDraft: string;
};

type LoadPayload = {
  providers: Omit<ProviderRow, "apiKeyDraft">[];
  statusText?: string;
};

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? (JSON.parse(text) as T & { error?: string }) : ({} as T & { error?: string });
  if (!res.ok) throw new Error(data.error || text || `HTTP ${res.status}`);
  return data;
}

export function LlmProviderKeysPanel({ mode }: { mode: "global" | "editor" }) {
  const { toast } = useToast();
  const [rows, setRows] = useState<ProviderRow[]>([]);
  const [statusText, setStatusText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<ProviderId | null>(null);

  const listPath = mode === "editor" ? "/api/hm/editor/llm-keys" : "/api/hm/llm-keys";
  const testPath = mode === "editor" ? "/api/hm/editor/llm-keys/test" : "/api/hm/llm-keys/test";

  function applyPayload(data: LoadPayload) {
    setRows(
      (data.providers ?? [])
        .slice()
        .sort((a, b) => a.priority - b.priority)
        .map((p) => ({ ...p, apiKeyDraft: "" })),
    );
    setStatusText(data.statusText ?? "");
  }

  async function load() {
    setLoading(true);
    try {
      if (mode === "editor") {
        applyPayload(await hmEditorJson<LoadPayload>(listPath));
      } else {
        await ensureAdminPanelBootstrap();
        applyPayload(await readJson<LoadPayload>(await apiFetch(apiUrl(listPath), { cache: "no-store" })));
      }
    } catch (err) {
      toast({
        title: "Anahtarlar yüklenemedi",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // ilk açılış
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  function patch(provider: ProviderId, next: Partial<ProviderRow>) {
    setRows((prev) => prev.map((row) => (row.provider === provider ? { ...row, ...next } : row)));
  }

  function move(index: number, dir: -1 | 1) {
    setRows((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = prev.slice();
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy.map((row, i) => ({ ...row, priority: (i + 1) * 10 }));
    });
  }

  async function save() {
    setSaving(true);
    try {
      const body = {
        providers: rows.map((row) => ({
          provider: row.provider,
          enabled: row.enabled,
          model: row.model,
          priority: row.priority,
          ...(row.apiKeyDraft.trim() ? { apiKey: row.apiKeyDraft.trim() } : {}),
        })),
      };
      const data =
        mode === "editor"
          ? await hmEditorJson<LoadPayload>(listPath, { method: "PUT", body: JSON.stringify(body) })
          : await readJson<LoadPayload>(
              await apiFetch(apiUrl(listPath), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }),
            );
      applyPayload(data);
      toast({ title: "Kaydedildi" });
    } catch (err) {
      toast({
        title: "Kaydedilemedi",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function clearKey(provider: ProviderId) {
    setSaving(true);
    try {
      const body = { providers: [{ provider, clearKey: true }] };
      const data =
        mode === "editor"
          ? await hmEditorJson<LoadPayload>(listPath, { method: "PUT", body: JSON.stringify(body) })
          : await readJson<LoadPayload>(
              await apiFetch(apiUrl(listPath), {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }),
            );
      applyPayload(data);
      toast({ title: "Anahtar silindi" });
    } catch (err) {
      toast({
        title: "Silinemedi",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function test(row: ProviderRow) {
    setTesting(row.provider);
    try {
      const body = {
        provider: row.provider,
        model: row.model,
        ...(row.apiKeyDraft.trim() ? { apiKey: row.apiKeyDraft.trim() } : {}),
      };
      const data =
        mode === "editor"
          ? await hmEditorJson<{ ok?: boolean; message?: string; error?: string }>(testPath, {
              method: "POST",
              body: JSON.stringify(body),
            })
          : await readJson<{ ok?: boolean; message?: string; error?: string }>(
              await apiFetch(apiUrl(testPath), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
              }),
            );
      toast({ title: data.message || "Bağlantı başarılı" });
    } catch (err) {
      toast({
        title: "Bağlantı başarısız",
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Yapay zekâ ayarları yükleniyor
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mode === "editor" && statusText ? (
        <p
          className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
            statusText.startsWith("Kendi")
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-sky-200 bg-sky-50 text-sky-950"
          }`}
        >
          {statusText}
        </p>
      ) : null}
      <p className="text-sm text-slate-600">
        {mode === "editor"
          ? "Anahtarlar yalnızca bu haber sitesine aittir. Kendi anahtarınız yoksa veya bağlantı başarısız olursa Haber Merkezi anahtarı kullanılır. Merkez anahtarları burada gösterilmez."
          : "Bu anahtarlar Haber Merkezi varsayılanıdır. Bir haber sitesi kendi anahtarını girerse önce o kullanılır; olmazsa veya çağrı düşerse buradaki anahtar, o da yoksa sunucu ortam değişkeni devreye girer."}
      </p>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.provider} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <h4 className="font-semibold text-slate-900">{row.label}</h4>
                <span className="text-xs text-slate-500">Sıra {index + 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{row.enabled ? "Açık" : "Kapalı"}</span>
                <Switch checked={row.enabled} onCheckedChange={(v) => patch(row.provider, { enabled: v })} />
              </div>
            </div>
            <p className="mt-1 text-xs text-slate-500">{row.description}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div>
                <Label>API anahtarı</Label>
                <Input
                  type="password"
                  className="mt-1 font-mono text-sm"
                  autoComplete="off"
                  value={row.apiKeyDraft}
                  placeholder={row.hasKey ? `${row.keyMasked} (değiştirmek için yeni anahtar)` : "Anahtar yapıştırın"}
                  onChange={(e) => patch(row.provider, { apiKeyDraft: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-500">
                  {row.hasKey ? `Kayıtlı: ${row.keyMasked}` : "Kayıtlı anahtar yok"}
                  {" · "}
                  Kullanım: {row.usageCount}
                </p>
              </div>
              <div>
                <Label>Model</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  value={row.model}
                  onChange={(e) => patch(row.provider, { model: e.target.value })}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => move(index, -1)} disabled={index === 0}>
                Yukarı
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => move(index, 1)}
                disabled={index === rows.length - 1}
              >
                Aşağı
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={testing === row.provider} onClick={() => void test(row)}>
                {testing === row.provider ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Bağlantıyı test et
              </Button>
              {row.hasKey ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => void clearKey(row.provider)}>
                  Anahtarı sil
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <Button type="button" onClick={() => void save()} disabled={saving || rows.length === 0}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Anahtarları kaydet
      </Button>
    </div>
  );
}
