import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { YektubeSource } from "@workspace/yektube-core";
import { fetchSources } from "@/lib/api";
import { adminDeleteSource, adminSyncSource, adminToggleSource } from "@/lib/adminApi";
import { AdminAddSourceModal } from "./AdminAddSourceModal";
import { AdminAlert, AdminBtn, AdminCard } from "./ui/adminUi";
import { Loader2, Plus, Radio, RefreshCw, Trash2 } from "lucide-react";

export function AdminSectionSourcesTab({
  title,
  filter,
  defaultCategorySlug,
  lockCategory = true,
}: {
  title: string;
  filter: (s: YektubeSource) => boolean;
  defaultCategorySlug: string;
  lockCategory?: boolean;
}) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["admin-sources"],
    queryFn: fetchSources,
  });

  const filtered = useMemo(() => sources.filter(filter), [sources, filter]);

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true);
    setMsg("");
    try {
      await fn();
      setMsg(`${label} tamam`);
      void qc.invalidateQueries({ queryKey: ["admin-sources"] });
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {msg ? <AdminAlert tone={msg.includes("Hata") ? "warn" : "success"}>{msg}</AdminAlert> : null}
      <div className="flex justify-end">
        <AdminBtn variant="primary" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4" />
          Kaynak ekle
        </AdminBtn>
      </div>
      {showAdd ? (
        <AdminAddSourceModal
          defaultCategorySlug={defaultCategorySlug}
          lockCategory={lockCategory}
          onClose={() => setShowAdd(false)}
          onSaved={() => {
            setShowAdd(false);
            void qc.invalidateQueries({ queryKey: ["admin-sources"] });
            setMsg("Kaynak eklendi");
          }}
        />
      ) : null}
      <AdminCard title={`${title} (${filtered.length})`} description="Kaynak listesi, senkron ve durum yönetimi.">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-zinc-500">Henüz kaynak yok. Yukarıdan ekleyin veya içe aktarın.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {filtered.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <Radio className="h-4 w-4 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{s.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {s.channelId} · {s.videoCount ?? 0} video
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  <AdminBtn
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void run(`${s.name} senkron`, () => adminSyncSource(s.id))}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Senkron
                  </AdminBtn>
                  <AdminBtn variant="secondary" disabled={busy} onClick={() => void adminToggleSource(s.id)}>
                    {s.active ? "Pasif" : "Aktif"}
                  </AdminBtn>
                  <AdminBtn
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      if (!confirm(`${s.name} silinsin mi?`)) return;
                      void run("Silme", () => adminDeleteSource(s.id));
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </AdminBtn>
                </div>
              </li>
            ))}
          </ul>
        )}
      </AdminCard>
    </div>
  );
}
