import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  adminFetchSectionConfig,
  adminSaveSectionConfig,
  type SectionCategoryDef,
  type SectionConfigStore,
} from "@/lib/adminApi";
import { AdminAlert, AdminBtn, AdminCard, AdminInput } from "./ui/adminUi";

type SectionKind = "yektube" | "muzik" | "cocuk";

function slugifyLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AdminSectionCategoriesTab({ section }: { section: SectionKind }) {
  const qc = useQueryClient();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const { data: config, isLoading, isError, error } = useQuery({
    queryKey: ["admin-section-config"],
    queryFn: adminFetchSectionConfig,
    retry: 1,
  });

  const save = async (next: SectionConfigStore) => {
    setBusy(true);
    setMsg("");
    try {
      await adminSaveSectionConfig(next);
      await qc.invalidateQueries({ queryKey: ["admin-section-config"] });
      await qc.invalidateQueries({ queryKey: ["admin-section-stats"] });
      setMsg("Kategoriler kaydedildi");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Kategoriler yükleniyor…</p>;
  }

  if (isError || !config) {
    const detail = error instanceof Error ? error.message : "Yapılandırma alınamadı";
    return (
      <AdminAlert tone="warn">
        Kategori yapılandırması yüklenemedi ({detail}). API sunucusunun güncellenmesi gerekebilir; geçici olarak
        varsayılan kategori listesi kullanılamaz.
      </AdminAlert>
    );
  }

  if (section === "yektube") {
    const categories = config.yektubeCategories.filter((c) => !c.hidden);
    return (
      <div className="space-y-4">
        {msg ? <AdminAlert tone={msg.includes("Kaydedilemedi") ? "warn" : "success"}>{msg}</AdminAlert> : null}
        <AdminCard title="Kategori ekle" description="Yeni Yektube video/kaynak kategorisi oluşturun.">
          <div className="flex flex-wrap gap-2">
            <AdminInput
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Örn. Belgesel Plus"
              className="min-w-[200px] flex-1"
            />
            <AdminBtn
              variant="primary"
              disabled={busy || !newLabel.trim()}
              onClick={() => {
                const slug = slugifyLabel(newLabel);
                if (!slug) return;
                if (config.yektubeCategories.some((c) => c.slug === slug && !c.hidden)) {
                  setMsg("Bu slug zaten var");
                  return;
                }
                const next: SectionConfigStore = {
                  ...config,
                  yektubeCategories: [...config.yektubeCategories, { slug, label: newLabel.trim() }],
                };
                setNewLabel("");
                void save(next);
              }}
            >
              <Plus className="h-4 w-4" />
              Ekle
            </AdminBtn>
          </div>
        </AdminCard>
        <AdminCard title={`Kategoriler (${categories.length})`}>
          <ul className="divide-y divide-zinc-800">
            {categories.map((c) => (
              <li key={c.slug} className="flex flex-wrap items-center gap-3 py-3">
                {editId === c.slug ? (
                  <>
                    <AdminInput value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1" />
                    <AdminBtn
                      variant="primary"
                      disabled={busy}
                      onClick={() => {
                        const next: SectionConfigStore = {
                          ...config,
                          yektubeCategories: config.yektubeCategories.map((x) =>
                            x.slug === c.slug ? { ...x, label: editLabel.trim() || x.label } : x,
                          ),
                        };
                        setEditId(null);
                        void save(next);
                      }}
                    >
                      Kaydet
                    </AdminBtn>
                    <AdminBtn variant="ghost" onClick={() => setEditId(null)}>
                      İptal
                    </AdminBtn>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{c.label}</p>
                      <p className="text-xs text-zinc-500">{c.slug}</p>
                    </div>
                    <AdminBtn
                      variant="secondary"
                      onClick={() => {
                        setEditId(c.slug);
                        setEditLabel(c.label);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Düzenle
                    </AdminBtn>
                    <AdminBtn
                      variant="danger"
                      disabled={busy}
                      onClick={() => {
                        if (!confirm(`"${c.label}" kategorisi gizlensin mi?`)) return;
                        const next: SectionConfigStore = {
                          ...config,
                          yektubeCategories: config.yektubeCategories.map((x) =>
                            x.slug === c.slug ? { ...x, hidden: true } : x,
                          ),
                        };
                        void save(next);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Sil
                    </AdminBtn>
                  </>
                )}
              </li>
            ))}
          </ul>
        </AdminCard>
      </div>
    );
  }

  const key = section === "muzik" ? "muzikCategories" : "cocukCategories";
  const categories = config[key].filter((c) => !c.hidden && c.id !== "all" && c.id !== "onerilen");

  return (
    <div className="space-y-4">
      {msg ? <AdminAlert tone={msg.includes("Kaydedilemedi") ? "warn" : "success"}>{msg}</AdminAlert> : null}
      <AdminCard
        title="Alt kategori ekle"
        description={section === "muzik" ? "Müzik raf/tür filtreleri." : "YouTube Kids tarzı çocuk kategorileri."}
      >
        <div className="flex flex-wrap gap-2">
          <AdminInput
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Kategori adı"
            className="min-w-[200px] flex-1"
          />
          <AdminBtn
            variant="primary"
            disabled={busy || !newLabel.trim()}
            onClick={() => {
              const id = slugifyLabel(newLabel);
              if (!id) return;
              if (config[key].some((c) => c.id === id && !c.hidden)) {
                setMsg("Bu kategori zaten var");
                return;
              }
              const item: SectionCategoryDef = { id, label: newLabel.trim(), keywords: [newLabel.trim().toLowerCase()] };
              const next: SectionConfigStore = { ...config, [key]: [...config[key], item] };
              setNewLabel("");
              void save(next);
            }}
          >
            <Plus className="h-4 w-4" />
            Ekle
          </AdminBtn>
        </div>
      </AdminCard>
      <AdminCard title={`Kategoriler (${categories.length + 1})`}>
        <ul className="divide-y divide-zinc-800">
          <li className="py-2 text-sm text-zinc-400">
            {section === "muzik" ? "Tümü (varsayılan)" : "Önerilen (varsayılan)"}
          </li>
          {categories.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
              {editId === c.id ? (
                <>
                  <AdminInput value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className="flex-1" />
                  <AdminBtn
                    variant="primary"
                    disabled={busy}
                    onClick={() => {
                      const next: SectionConfigStore = {
                        ...config,
                        [key]: config[key].map((x) =>
                          x.id === c.id ? { ...x, label: editLabel.trim() || x.label } : x,
                        ),
                      };
                      setEditId(null);
                      void save(next);
                    }}
                  >
                    Kaydet
                  </AdminBtn>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{c.label}</p>
                    <p className="text-xs text-zinc-500">{c.id}</p>
                  </div>
                  <AdminBtn
                    variant="secondary"
                    onClick={() => {
                      setEditId(c.id);
                      setEditLabel(c.label);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Düzenle
                  </AdminBtn>
                  <AdminBtn
                    variant="danger"
                    disabled={busy}
                    onClick={() => {
                      if (!confirm(`"${c.label}" silinsin mi?`)) return;
                      const next: SectionConfigStore = {
                        ...config,
                        [key]: config[key].map((x) => (x.id === c.id ? { ...x, hidden: true } : x)),
                      };
                      void save(next);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Sil
                  </AdminBtn>
                </>
              )}
            </li>
          ))}
        </ul>
      </AdminCard>
    </div>
  );
}
