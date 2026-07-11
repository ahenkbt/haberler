import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import {
  adminBulkPresets,
  adminCreateSource,
  adminImportTopChannels,
  fetchVideoPresets,
  type VideoPreset,
} from "@/lib/adminApi";
import { categoryLabel, CATEGORY_LABELS } from "@/lib/constants";
import {
  AdminAlert,
  AdminBtn,
  AdminCard,
  AdminInput,
  AdminPageHeader,
  AdminSelect,
} from "./ui/adminUi";

export function AdminPresetsPage() {
  const qc = useQueryClient();
  const [category, setCategory] = useState("all");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: presets = [], isLoading } = useQuery({
    queryKey: ["admin-presets"],
    queryFn: fetchVideoPresets,
  });

  const filtered = useMemo(() => {
    let rows = presets;
    if (category !== "all") {
      rows = rows.filter((p) => p.category === category);
    }
    const qq = q.trim().toLowerCase();
    if (qq) {
      rows = rows.filter(
        (p) => p.name.toLowerCase().includes(qq) || p.channelId.toLowerCase().includes(qq),
      );
    }
    return rows;
  }, [presets, category, q]);

  const run = async (key: string, label: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setMsg("");
    try {
      const res = await fn();
      const extra =
        res && typeof res === "object" && "added" in res
          ? ` — ${(res as { added?: number }).added ?? 0} eklendi, ${(res as { skipped?: number }).skipped ?? 0} atlandı`
          : "";
      setMsg(`${label} tamam${extra}`);
      await qc.invalidateQueries({ queryKey: ["admin-sources"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  };

  const addOne = async (preset: VideoPreset) => {
    setBusy(preset.channelId);
    setMsg("");
    try {
      await adminCreateSource({
        name: preset.name,
        platform: "youtube",
        sourceType: "channel",
        channelId: preset.channelId,
        categorySlug: preset.category,
        active: true,
      });
      setMsg(`«${preset.name}» kaynak olarak eklendi.`);
      await qc.invalidateQueries({ queryKey: ["admin-sources"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Eklenemedi");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        title="Hazır kanallar"
        description={`${presets.length} önceden tanımlı YouTube kanalı — kategoriye göre toplu veya tek tek ekleyin.`}
        actions={
          <>
            <AdminBtn
              variant="secondary"
              disabled={!!busy}
              onClick={() =>
                void run("bulk", "Toplu preset", () =>
                  adminBulkPresets(category === "all" ? undefined : category),
                )
              }
            >
              {busy === "bulk" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Seçili kategoriyi ekle
            </AdminBtn>
            <AdminBtn
              variant="primary"
              disabled={!!busy}
              onClick={() => void run("top", "Top kanallar", adminImportTopChannels)}
            >
              Top kanalları içe aktar
            </AdminBtn>
          </>
        }
      />

      {msg ? <AdminAlert tone={msg.includes("tamam") || msg.includes("eklendi") ? "success" : "warn"}>{msg}</AdminAlert> : null}

      <div className="flex flex-wrap gap-3">
        <AdminSelect
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="max-w-[200px]"
        >
          <option value="all">Tüm kategoriler</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </AdminSelect>
        <AdminInput
          placeholder="Kanal ara…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
        </div>
      ) : (
        <AdminCard>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <div
                key={`${p.channelId}-${p.name}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{p.name}</p>
                  <p className="truncate text-[11px] text-zinc-500">
                    {categoryLabel(p.category)} · {p.channelId}
                  </p>
                </div>
                <AdminBtn
                  variant="ghost"
                  className="shrink-0 px-2"
                  disabled={busy === p.channelId}
                  onClick={() => void addOne(p)}
                  title="Kaynak olarak ekle"
                >
                  {busy === p.channelId ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </AdminBtn>
              </div>
            ))}
          </div>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">Eşleşen preset bulunamadı.</p>
          ) : null}
        </AdminCard>
      )}
    </div>
  );
}
